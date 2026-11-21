// Loads the recipes the planning logic works with (KUC-113, KUC-108): published recipes
// with tags, categories, ingredient amounts in base units and the taste similarity.
// Flat queries only; pure mapping lives in `mappers.ts`. Pass `prisma` as `db`.
import type { Db } from '@app/lib/meal-plan/db';
import { loadFacts } from '@app/lib/pantry/book';
import { rankRecipeIdsByTaste } from '@app/lib/recipes/taste-ranking.server';
import { toBaseQuantity } from '@app/lib/shopping/quantity';
import type { Candidate } from '@shared/meal-planning/types';

import { toCandidate, type CandidateRow, type TimeSeasonSet } from './mappers';

/** Pool size: the best rated recipes; planned recipes are always added on top. */
export const CANDIDATE_POOL = 250;

export interface RecipeCard {
    id: string;
    slug: string;
    title: string;
    imageKey: string | null;
    totalTime: number;
}

/** Taste ranking of recipe ids (cosine per id); `null` = no taste profile. Injectable for tests. */
export type RankByTaste = (
    userId: string,
    ids: readonly string[],
) => Promise<{ id: string; score: number }[] | null>;

export interface LoadedRecipes {
    rows: CandidateRow[];
    cards: Map<string, RecipeCard>;
}

const BASE_LABEL = { G: 'g', ML: 'ml', PIECE: 'Stk' } as const;

/**
 * Best rated published recipes plus `includeIds` (e.g. what is already planned).
 * Taste similarity comes from existing embeddings only (no OpenAI); users without a taste
 * profile get no score, which the logic treats as neutral.
 */
export async function loadRecipeRows(
    db: Db,
    userId: string,
    options: { includeIds?: readonly string[]; limit?: number; rank?: RankByTaste } = {},
): Promise<LoadedRecipes> {
    const visible = {
        status: 'PUBLISHED' as const,
        moderationStatus: { not: 'REJECTED' as const },
    };
    const select = {
        id: true,
        slug: true,
        title: true,
        imageKey: true,
        totalTime: true,
        servings: true,
    } as const;
    const [top, extra] = await Promise.all([
        db.recipe.findMany({
            where: { ...visible, totalTime: { gt: 0 } },
            select,
            orderBy: [{ rating: 'desc' }, { ratingCount: 'desc' }],
            take: options.limit ?? CANDIDATE_POOL,
        }),
        options.includeIds?.length
            ? db.recipe.findMany({ where: { id: { in: [...options.includeIds] } }, select })
            : Promise.resolve([]),
    ]);
    const recipes = [...new Map([...top, ...extra].map((r) => [r.id, r])).values()];
    const ids = recipes.map((r) => r.id);
    if (ids.length === 0) return { rows: [], cards: new Map() };

    const [tags, categories, lines, ranked] = await Promise.all([
        db.recipeTag.findMany({
            where: { recipeId: { in: ids } },
            select: { recipeId: true, tagId: true },
        }),
        db.recipeCategory.findMany({
            where: { recipeId: { in: ids } },
            select: { recipeId: true, categoryId: true, position: true },
        }),
        db.recipeIngredient.findMany({
            where: { recipeId: { in: ids }, isOptional: false },
            select: { recipeId: true, ingredientId: true, amount: true, unitId: true },
        }),
        (options.rank ?? rankRecipeIdsByTaste)(userId, ids),
    ]);
    const ingredientIds = [...new Set(lines.map((l) => l.ingredientId))];
    const [facts, ingredients, categoryNames] = await Promise.all([
        loadFacts(db, ingredientIds),
        ingredientIds.length
            ? db.ingredient.findMany({
                  where: { id: { in: ingredientIds } },
                  select: { id: true, name: true, normalizedName: true },
              })
            : Promise.resolve([]),
        categories.length
            ? db.category.findMany({
                  where: { id: { in: [...new Set(categories.map((c) => c.categoryId))] } },
                  select: { id: true, name: true },
              })
            : Promise.resolve([]),
    ]);
    const unitShort = new Map(
        (await db.unit.findMany({ select: { id: true, shortName: true } })).map((u) => [
            u.id,
            u.shortName,
        ]),
    );
    const nameOf = new Map(ingredients.map((i) => [i.id, i.normalizedName?.trim() || i.name]));
    const categoryName = new Map(categoryNames.map((c) => [c.id, c.name]));
    const cosine = ranked ? new Map(ranked.map((r) => [r.id, r.score])) : null;

    const group = <T extends { recipeId: string }>(rows: T[]) => {
        const map = new Map<string, T[]>();
        for (const row of rows) map.set(row.recipeId, [...(map.get(row.recipeId) ?? []), row]);
        return map;
    };
    const tagsBy = group(tags);
    const categoriesBy = group(categories);
    const linesBy = group(lines);

    const rows: CandidateRow[] = recipes.map((recipe) => {
        const own = (categoriesBy.get(recipe.id) ?? []).sort((a, b) => a.position - b.position);
        const score = cosine?.get(recipe.id);
        return {
            id: recipe.id,
            title: recipe.title,
            totalTime: recipe.totalTime,
            servings: recipe.servings,
            categoryId: own[0]?.categoryId ?? null,
            categoryName: own[0] ? categoryName.get(own[0].categoryId) : null,
            tagIds: (tagsBy.get(recipe.id) ?? []).map((t) => t.tagId),
            categoryIds: own.map((c) => c.categoryId),
            // -2 = no embedding for this recipe
            cosine: score === undefined || score <= -2 ? null : score,
            ingredients: (linesBy.get(recipe.id) ?? []).map((line) => {
                const base = toBaseQuantity(
                    line.amount,
                    unitShort.get(line.unitId) ?? null,
                    facts.contextFor(line.ingredientId),
                );
                return {
                    ingredientId: line.ingredientId,
                    name: nameOf.get(line.ingredientId),
                    ...(base && { amount: base.quantity, unit: BASE_LABEL[base.baseUnit] }),
                };
            }),
        };
    });
    return {
        rows,
        cards: new Map(
            recipes.map((r) => [
                r.id,
                {
                    id: r.id,
                    slug: r.slug,
                    title: r.title,
                    imageKey: r.imageKey,
                    totalTime: r.totalTime,
                },
            ]),
        ),
    };
}

export function toCandidates(
    rows: readonly CandidateRow[],
    sets: readonly TimeSeasonSet[],
    servings: number,
): Candidate[] {
    return rows.map((row) => toCandidate(row, sets, servings));
}
