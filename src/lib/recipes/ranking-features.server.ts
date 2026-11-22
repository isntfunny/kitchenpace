// DB and OpenSearch side of the shared ranking (KUC-126): recipe features, global rating
// mean, soon-expiring pantry items and kNN on the stored embeddings. Never calls OpenAI.
import 'server-only';

import { addDays } from '@shared/dates';
import { opensearchClient, OPENSEARCH_EMBEDDINGS_INDEX } from '@shared/opensearch/client';
import { prisma } from '@shared/prisma';
import { RANKING_CONFIG } from '@shared/recipe-ranking/config';
import type { RankingRecipe } from '@shared/recipe-ranking/features';
import { globalMeanRating, normalize } from '@shared/recipe-ranking/vector';

type Db = typeof prisma;

const DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD']);

/** Features of the given recipes for scoring; unknown or unpublished ids are missing. */
export async function loadRankingRecipes(
    ids: string[],
    db: Db = prisma,
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
                difficulty: true,
                flowNodes: true,
                categories: { select: { category: { select: { slug: true } } } },
                tags: { select: { tag: { select: { name: true } } } },
                recipeIngredients: {
                    select: {
                        isOptional: true,
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
                    return {
                        id: line.ingredient.id,
                        name: (
                            line.ingredient.normalizedName ?? line.ingredient.name
                        ).toLowerCase(),
                        root: category ? (category.parent?.slug ?? category.slug) : null,
                        optional: line.isOptional,
                    };
                }),
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
