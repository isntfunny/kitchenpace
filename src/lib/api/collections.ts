import { randomUUID } from 'node:crypto';

import type { Prisma, PrismaClient } from '@prisma/client';

import { extractTextFromBlocks } from '../collections/extract-recipe-ids';
import type { TiptapJSON } from '../collections/types';
import type { ModerationResult } from '../moderation/types';
import { slugify } from '../slug';

import type { ApiPrincipal } from './auth';
import type { CollectionCreateInput, CollectionUpdateInput } from './collection-schemas';
import { ApiError } from './errors';
import { accessibleRecipeWhere, lockUser } from './services';

export interface CollectionDependencies {
    moderate(text: string): Promise<ModerationResult>;
    invalidate(slug: string): Promise<void>;
}
const defaults: CollectionDependencies = {
    moderate: async (text) =>
        (await import('../moderation/moderationService')).moderateContent({ text }),
    invalidate: async (slug) => {
        const { revalidatePath } = await import('next/cache');
        for (const path of [`/collection/${slug}`, '/collections', '/profile/collections'])
            revalidatePath(path);
    },
};
const select = { id: true, title: true, slug: true, description: true, published: true } as const;
const blocksFor = (ids: string[]): Prisma.InputJsonValue => ({
    type: 'doc',
    content: ids.map((recipeId) => ({ type: 'recipeCard', attrs: { recipeId } })),
});
export function createCollectionApiServices(db: PrismaClient, deps = defaults) {
    async function detail(p: ApiPrincipal, id: string) {
        const collection = await db.collection.findFirst({
            where: { id, authorId: p.userId },
            select: {
                ...select,
                recipes: {
                    where: { recipe: accessibleRecipeWhere(p.userId) },
                    orderBy: { position: 'asc' },
                    select: { recipeId: true },
                },
            },
        });
        if (!collection) throw new ApiError(404, 'NOT_FOUND');
        const { recipes, ...data } = collection;
        return { ...data, recipeIds: recipes.map((r) => r.recipeId) };
    }
    async function save(
        p: ApiPrincipal,
        input: CollectionCreateInput | CollectionUpdateInput,
        id?: string,
    ) {
        const existing = id
            ? await db.collection.findFirst({ where: { id, authorId: p.userId } })
            : null;
        if (id && !existing) throw new ApiError(404, 'NOT_FOUND');
        const title = input.title ?? existing!.title;
        const description =
            input.description !== undefined ? input.description : (existing?.description ?? null);
        const blocks =
            input.recipeIds !== undefined
                ? blocksFor(input.recipeIds)
                : (existing?.blocks ?? blocksFor([]));
        const text = [title, description, extractTextFromBlocks(blocks as TiptapJSON)]
            .filter(Boolean)
            .join('\n');
        const moderation = await deps.moderate(text);
        if (moderation.decision === 'REJECTED') throw new ApiError(400, 'CONTENT_REJECTED');
        const saved = await db.$transaction(async (tx) => {
            await lockUser(tx, p.userId);
            if (input.recipeIds?.length) {
                const count = await tx.recipe.count({
                    where: { id: { in: input.recipeIds }, ...accessibleRecipeWhere(p.userId) },
                });
                if (count !== input.recipeIds.length)
                    throw new ApiError(400, 'INVALID_RECIPE_SELECTION');
            }
            const data = {
                title,
                description,
                published: false,
                moderationStatus: moderation.decision,
                aiModerationScore: moderation.score,
                ...(input.recipeIds !== undefined || !existing ? { blocks } : {}),
            };
            let collection;
            if (existing) {
                const changed = await tx.collection.updateMany({
                    where: { id: existing.id, authorId: p.userId, updatedAt: existing.updatedAt },
                    data,
                });
                if (!changed.count) throw new ApiError(409, 'COLLECTION_CHANGED');
                collection = await tx.collection.findUniqueOrThrow({
                    where: { id: existing.id },
                    select,
                });
            } else {
                collection = await tx.collection.create({
                    data: {
                        ...data,
                        authorId: p.userId,
                        slug: `${slugify(title) || 'sammlung'}-${randomUUID()}`,
                    },
                    select,
                });
            }
            if (input.recipeIds !== undefined) {
                await tx.collectionRecipe.deleteMany({ where: { collectionId: collection.id } });
                if (input.recipeIds.length)
                    await tx.collectionRecipe.createMany({
                        data: input.recipeIds.map((recipeId, position) => ({
                            collectionId: collection.id,
                            recipeId,
                            position,
                            role: 'INLINE',
                        })),
                    });
            }
            // Keep the current snapshot in the existing moderator queue, in the same transaction.
            const queueData = {
                aiScore: moderation.score,
                aiFlags: moderation.flags,
                aiRawResponse: (moderation.raw ?? {}) as Prisma.InputJsonValue,
                status: moderation.decision,
                contentSnapshot: { title, description, text, intendedPublished: false },
                reviewedBy: null,
                reviewedAt: null,
                reviewNote: null,
            };
            const queued = await tx.moderationQueue.findFirst({
                where: { contentType: 'collection', contentId: collection.id },
                select: { id: true },
            });
            if (queued) {
                await tx.moderationQueue.update({ where: { id: queued.id }, data: queueData });
            } else {
                await tx.moderationQueue.create({
                    data: {
                        ...queueData,
                        contentType: 'collection',
                        contentId: collection.id,
                        authorId: p.userId,
                    },
                });
            }
            return collection;
        });
        await deps.invalidate(saved.slug);
        return detail(p, saved.id);
    }
    return {
        collection: detail,
        createCollection: (p: ApiPrincipal, input: CollectionCreateInput) => save(p, input),
        updateCollection: (p: ApiPrincipal, id: string, input: CollectionUpdateInput) =>
            save(p, input, id),
        async deleteCollection(p: ApiPrincipal, id: string) {
            const existing = await db.collection.findFirst({
                where: { id, authorId: p.userId },
                select: { slug: true },
            });
            if (!existing) throw new ApiError(404, 'NOT_FOUND');
            await db.$transaction(async (tx) => {
                await lockUser(tx, p.userId);
                const result = await tx.collection.deleteMany({
                    where: { id, authorId: p.userId },
                });
                if (!result.count) throw new ApiError(404, 'NOT_FOUND');
                await tx.moderationQueue.deleteMany({
                    where: { contentType: 'collection', contentId: id },
                });
            });
            await deps.invalidate(existing.slug);
        },
    };
}
