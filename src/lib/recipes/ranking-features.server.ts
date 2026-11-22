// DB and OpenSearch side of the shared ranking (KUC-126): recipe features, global rating
// mean, soon-expiring pantry items and kNN on the stored embeddings. Never calls OpenAI.
import 'server-only';

import type { Db } from '@app/lib/meal-plan/db';
import { loadFacts } from '@app/lib/pantry/book';
import { toBaseQuantity } from '@app/lib/shopping/quantity';
import { addDays } from '@shared/dates';
import { opensearchClient, OPENSEARCH_EMBEDDINGS_INDEX } from '@shared/opensearch/client';
import { prisma } from '@shared/prisma';
import { RANKING_CONFIG } from '@shared/recipe-ranking/config';
import type { RankingBaseUnit, RankingRecipe } from '@shared/recipe-ranking/features';
import { globalMeanRating, normalize } from '@shared/recipe-ranking/vector';

const DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD']);

const BASE_LABEL: Record<'G' | 'ML' | 'PIECE', RankingBaseUnit> = {
    G: 'g',
    ML: 'ml',
    PIECE: 'Stk',
};

/** Converts recipe line amounts to base units (grams, millilitres, pieces). */
async function baseAmountConverter(db: Db, ingredientIds: string[]) {
    const [facts, units] = await Promise.all([
        loadFacts(db, ingredientIds),
        db.unit.findMany({ select: { id: true, shortName: true } }),
    ]);
    const unitShort = new Map(units.map((u) => [u.id, u.shortName]));
    return (line: { ingredientId: string; amount: string; unitId: string }) => {
        const base = toBaseQuantity(
            line.amount,
            unitShort.get(line.unitId) ?? null,
            facts.contextFor(line.ingredientId),
        );
        return base ? { amount: base.quantity, unit: BASE_LABEL[base.baseUnit] } : null;
    };
}

/**
 * Features of the given recipes for scoring; unknown ids are missing. With `amounts`, every
 * required ingredient line also carries its amount in a base unit (for `servings`).
 */
export async function loadRankingRecipes(
    ids: string[],
    db: Db = prisma,
    options: { amounts?: boolean } = {},
): Promise<Map<string, RankingRecipe>> {
    if (ids.length === 0) return new Map();
    const [rows, embeddings] = await Promise.all([
        db.recipe.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                title: true,
                rating: true,
                ratingCount: true,
                totalTime: true,
                servings: true,
                difficulty: true,
                flowNodes: true,
                categories: { select: { category: { select: { slug: true } } } },
                tags: { select: { tag: { select: { name: true } } } },
                recipeIngredients: {
                    select: {
                        isOptional: true,
                        ingredientId: true,
                        amount: true,
                        unitId: true,
                        ingredient: {
                            select: {
                                id: true,
                                name: true,
                                normalizedName: true,
                                categories: {
                                    select: { slug: true, parent: { select: { slug: true } } },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        }),
        db.recipeEmbedding.findMany({
            where: { recipeId: { in: ids } },
            select: { recipeId: true, embedding: true },
        }),
    ]);
    const embeddingOf = new Map(embeddings.map((e) => [e.recipeId, e.embedding]));
    const toBase = options.amounts
        ? await baseAmountConverter(db, [
              ...new Set(rows.flatMap((row) => row.recipeIngredients.map((l) => l.ingredientId))),
          ])
        : null;

    return new Map(
        rows.map((row) => {
            const embedding = embeddingOf.get(row.id);
            const recipe: RankingRecipe = {
                id: row.id,
                title: row.title,
                categorySlugs: row.categories.flatMap((c) => (c.category ? [c.category.slug] : [])),
                tags: row.tags.flatMap((t) => (t.tag ? [t.tag.name] : [])),
                ingredients: row.recipeIngredients.map((line) => {
                    const category = line.ingredient.categories[0];
                    const base = toBase && !line.isOptional ? toBase(line) : null;
                    return {
                        id: line.ingredient.id,
                        name: (
                            line.ingredient.normalizedName ?? line.ingredient.name
                        ).toLowerCase(),
                        root: category ? (category.parent?.slug ?? category.slug) : null,
                        optional: line.isOptional,
                        ...(base && { amount: base.amount, unit: base.unit }),
                    };
                }),
                servings: row.servings,
                rating: row.rating ?? 0,
                ratingCount: row.ratingCount ?? 0,
                totalTime: row.totalTime ?? 0,
                difficulty: (DIFFICULTIES.has(row.difficulty) ? row.difficulty : 'MEDIUM') as
                    | 'EASY'
                    | 'MEDIUM'
                    | 'HARD',
                stepCount: Array.isArray(row.flowNodes) ? row.flowNodes.length : 0,
                embedding: embedding && embedding.length > 0 ? normalize(embedding) : null,
            };
            return [row.id, recipe];
        }),
    );
}

let meanCache: { value: number; at: number } | null = null;
const MEAN_TTL_MS = 10 * 60_000;

/** Mean rating over all rated recipes (prior of the Bayes damping), cached for 10 minutes. */
export async function loadGlobalMeanRating(db: Db = prisma): Promise<number> {
    if (meanCache && Date.now() - meanCache.at < MEAN_TTL_MS) return meanCache.value;
    const rated = await db.recipe.findMany({
        where: { status: 'PUBLISHED', ratingCount: { gt: 0 } },
        select: { rating: true, ratingCount: true },
    });
    const value = globalMeanRating(
        rated.map((r) => ({ rating: r.rating ?? 0, ratingCount: r.ratingCount ?? 0 })),
        RANKING_CONFIG.minRatedForGlobalMean,
    );
    meanCache = { value, at: Date.now() };
    return value;
}

/** Days ahead a pantry item counts as "soon expiring" for the week sort */
const EXPIRING_WITHIN_DAYS = 4;

/** Pantry items that expire soon, as ingredient ids with a display name. */
export async function loadExpiringStock(
    userId: string,
    today: string,
    db: Db = prisma,
): Promise<{ id: string; name: string }[]> {
    const until = new Date(`${addDays(today, EXPIRING_WITHIN_DAYS)}T23:59:59Z`);
    const items = await db.pantryItem.findMany({
        where: {
            userId,
            status: 'AVAILABLE',
            ingredientId: { not: null },
            expiresAt: { not: null, gte: new Date(`${today}T00:00:00Z`), lte: until },
        },
        select: { ingredientId: true, name: true },
    });
    const seen = new Set<string>();
    return items.flatMap((item) =>
        item.ingredientId && !seen.has(item.ingredientId) && seen.add(item.ingredientId)
            ? [{ id: item.ingredientId, name: item.name }]
            : [],
    );
}

/** kNN on `recipe-embeddings`, pre-filtered to the allowed ids (Lucene filter on `id`). */
export async function knnRecipeIds(
    vector: number[],
    k: number,
    allowedIds: string[],
): Promise<string[]> {
    const response = await opensearchClient.search({
        index: OPENSEARCH_EMBEDDINGS_INDEX,
        body: {
            size: k,
            _source: false,
            query: { knn: { embedding: { vector, k, filter: { terms: { id: allowedIds } } } } },
        },
    });
    return ((response.body.hits?.hits ?? []) as Array<{ _id: string }>).map((hit) => hit._id);
}
