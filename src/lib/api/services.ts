import { createHash } from 'node:crypto';

import type { Prisma, PrismaClient } from '@prisma/client';

import type { ApiPrincipal } from './auth';
import { createBringApiServices, type BringGateway } from './bring';
import { ApiError } from './errors';
import { createImportServices } from './imports';
import type { PageQuery } from './schemas';

export const publicRecipeWhere = {
    status: 'PUBLISHED',
    moderationStatus: { in: ['APPROVED', 'AUTO_APPROVED'] },
} satisfies Prisma.RecipeWhereInput;
export const accessibleRecipeWhere = (userId: string): Prisma.RecipeWhereInput => ({
    OR: [{ authorId: userId }, publicRecipeWhere],
});
export const summarySelect = {
    id: true,
    title: true,
    slug: true,
    description: true,
    servings: true,
    prepTime: true,
    cookTime: true,
    totalTime: true,
    difficulty: true,
    status: true,
    updatedAt: true,
} satisfies Prisma.RecipeSelect;
export function pageArgs(query: PageQuery) {
    return {
        take: query.limit + 1,
        orderBy: { id: 'asc' as const },
        ...(query.cursor ? { where: { id: { gt: query.cursor } } } : {}),
    };
}
export function paginated<T extends { id: string }>(rows: T[], limit: number) {
    const more = rows.length > limit;
    const items = rows.slice(0, limit);
    return { items, nextCursor: more ? items.at(-1)!.id : null };
}
export const hashRequest = (input: unknown) =>
    createHash('sha256').update(JSON.stringify(input)).digest('hex');
export async function lockUser(tx: Prisma.TransactionClient, userId: string) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}
export async function requireAccessibleRecipe(
    db: Prisma.TransactionClient,
    userId: string,
    id: string,
) {
    const recipe = await db.recipe.findFirst({
        where: { id, ...accessibleRecipeWhere(userId) },
        select: { id: true, status: true, authorId: true },
    });
    if (!recipe) throw new ApiError(404, 'NOT_FOUND');
    return recipe;
}
const summaryDto = <T extends { updatedAt: Date }>(r: T) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString(),
});
function flowSteps(value: Prisma.JsonValue) {
    if (!Array.isArray(value)) return [];
    return value.flatMap((node) => {
        if (!node || typeof node !== 'object' || Array.isArray(node) || typeof node.id !== 'string')
            return [];
        const data =
            node.data && typeof node.data === 'object' && !Array.isArray(node.data)
                ? node.data
                : node;
        return [
            {
                id: node.id,
                type: typeof data.type === 'string' ? data.type : undefined,
                label: typeof data.label === 'string' ? data.label : undefined,
                description: typeof data.description === 'string' ? data.description : undefined,
                duration: typeof data.duration === 'number' ? data.duration : undefined,
                ingredientIds: Array.isArray(data.ingredientIds)
                    ? data.ingredientIds.filter((x): x is string => typeof x === 'string')
                    : undefined,
            },
        ];
    });
}

export function createApiServices(db: PrismaClient, bringGateway?: BringGateway) {
    return {
        async recipes(p: ApiPrincipal, query: PageQuery) {
            const args = pageArgs(query);
            const rows = await db.recipe.findMany({
                ...args,
                where: { ...args.where, authorId: p.userId },
                select: summarySelect,
            });
            return paginated(rows.map(summaryDto), query.limit);
        },
        async recipe(p: ApiPrincipal, id: string) {
            const r = await db.recipe.findFirst({
                where: { id, ...accessibleRecipeWhere(p.userId) },
                select: {
                    ...summarySelect,
                    sourceUrl: true,
                    caloriesPerServing: true,
                    proteinPerServing: true,
                    fatPerServing: true,
                    carbsPerServing: true,
                    fiberPerServing: true,
                    nutritionCompleteness: true,
                    flowNodes: true,
                    flowEdges: true,
                    recipeIngredients: {
                        orderBy: { position: 'asc' },
                        select: {
                            ingredientId: true,
                            ingredient: { select: { name: true } },
                            amount: true,
                            unit: { select: { shortName: true } },
                            notes: true,
                            isOptional: true,
                        },
                    },
                    tags: { select: { tag: { select: { name: true } } } },
                    categories: { select: { category: { select: { name: true } } } },
                },
            });
            if (!r) throw new ApiError(404, 'NOT_FOUND');
            const { flowNodes, flowEdges, recipeIngredients, tags, categories, ...rest } = r;
            return {
                ...summaryDto(rest),
                steps: flowSteps(flowNodes),
                dependencies: Array.isArray(flowEdges)
                    ? flowEdges.flatMap((e) =>
                          e &&
                          typeof e === 'object' &&
                          !Array.isArray(e) &&
                          typeof e.source === 'string' &&
                          typeof e.target === 'string'
                              ? [{ source: e.source, target: e.target }]
                              : [],
                      )
                    : [],
                ingredients: recipeIngredients.map((i) => ({
                    id: i.ingredientId,
                    name: i.ingredient.name,
                    amount: i.amount,
                    unit: i.unit.shortName,
                    notes: i.notes,
                    isOptional: i.isOptional,
                })),
                tags: tags.map((t) => t.tag.name),
                categories: categories.map((c) => c.category.name),
            };
        },
        async favorites(p: ApiPrincipal, query: PageQuery) {
            const args = pageArgs(query);
            const rows = await db.recipe.findMany({
                ...args,
                where: {
                    ...args.where,
                    ...accessibleRecipeWhere(p.userId),
                    favorites: { some: { userId: p.userId } },
                },
                select: summarySelect,
            });
            return paginated(rows.map(summaryDto), query.limit);
        },
        async favorite(p: ApiPrincipal, id: string, enabled: boolean) {
            await db.$transaction(async (tx) => {
                await lockUser(tx, p.userId);
                if (enabled) {
                    await requireAccessibleRecipe(tx, p.userId, id);
                    await tx.favorite.upsert({
                        where: { recipeId_userId: { recipeId: id, userId: p.userId } },
                        create: { recipeId: id, userId: p.userId },
                        update: {},
                    });
                } else await tx.favorite.deleteMany({ where: { userId: p.userId, recipeId: id } });
            });
            return { favorite: enabled };
        },
        async collections(p: ApiPrincipal, query: PageQuery) {
            const args = pageArgs(query);
            return paginated(
                await db.collection.findMany({
                    ...args,
                    where: { ...args.where, authorId: p.userId },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        description: true,
                        published: true,
                    },
                }),
                query.limit,
            );
        },
        async collectionRecipes(p: ApiPrincipal, id: string, query: PageQuery) {
            if (
                !(await db.collection.findFirst({
                    where: { id, authorId: p.userId },
                    select: { id: true },
                }))
            )
                throw new ApiError(404, 'NOT_FOUND');
            const args = pageArgs(query);
            return paginated(
                (
                    await db.recipe.findMany({
                        ...args,
                        where: {
                            ...args.where,
                            ...accessibleRecipeWhere(p.userId),
                            collectionRecipes: { some: { collectionId: id } },
                        },
                        select: summarySelect,
                    })
                ).map(summaryDto),
                query.limit,
            );
        },
        async cooks(p: ApiPrincipal, query: PageQuery) {
            const args = pageArgs(query);
            const rows = await db.userCookHistory.findMany({
                ...args,
                where: { ...args.where, userId: p.userId, recipe: accessibleRecipeWhere(p.userId) },
                select: { id: true, recipeId: true, servings: true, cookedAt: true },
            });
            return paginated(
                rows.map((r) => ({ ...r, cookedAt: r.cookedAt.toISOString() })),
                query.limit,
            );
        },
        async cook(p: ApiPrincipal, token: string, input: { recipeId: string; servings?: number }) {
            return db.$transaction(async (tx) => {
                await lockUser(tx, p.userId);
                const requestHash = hashRequest(input);
                const previous = await tx.apiMutation.findUnique({
                    where: {
                        userId_operation_token: { userId: p.userId, operation: 'cook', token },
                    },
                });
                if (previous) {
                    if (previous.requestHash !== requestHash)
                        throw new ApiError(409, 'IDEMPOTENCY_CONFLICT');
                    await requireAccessibleRecipe(tx, p.userId, input.recipeId);
                    return previous.response;
                }
                await requireAccessibleRecipe(tx, p.userId, input.recipeId);
                const row = await tx.userCookHistory.create({
                    data: { userId: p.userId, recipeId: input.recipeId, servings: input.servings },
                    select: { id: true, recipeId: true, servings: true, cookedAt: true },
                });
                await tx.recipe.update({
                    where: { id: input.recipeId },
                    data: { cookCount: { increment: 1 } },
                });
                const response = { ...row, cookedAt: row.cookedAt.toISOString() };
                await tx.apiMutation.create({
                    data: { userId: p.userId, operation: 'cook', token, requestHash, response },
                });
                // API cook events are deliberately quiet: they never expose private draft activity.
                return response;
            });
        },
        ...createImportServices(db),
        ...createBringApiServices(db, bringGateway),
    };
}
export type ApiServices = ReturnType<typeof createApiServices>;
