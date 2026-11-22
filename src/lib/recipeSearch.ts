import type { RecipeCardData } from '@app/app/actions/recipes';
import { RECIPE_FILTER_DEFAULT_LIMIT } from '@app/lib/recipeFilters';
import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';
import { rankedSearch } from '@app/lib/recipes/ranked-search';
import {
    knnRecipeIds,
    loadExpiringStock,
    loadGlobalMeanRating,
    loadRankingRecipes,
} from '@app/lib/recipes/ranking-features.server';
import { resolveEffectiveSort } from '@app/lib/recipes/taste-ranking';
import { loadTasteEmbedding, rankRecipeIdsByTaste } from '@app/lib/recipes/taste-ranking.server';
import {
    buildRecipeBoolQuery,
    semanticPrependAllowed,
    type RecipeSearchContext,
} from '@app/lib/recipeSearchQuery';
import type { RecipeSearchFacets, RecipeSearchMeta, TermFacet } from '@app/lib/recipeSearchTypes';
import { semanticRecipeSearch } from '@app/lib/search/semanticSearch';
import { createLogger } from '@shared/logger';
import { seasonOf, toBerlinDate } from '@shared/meal-planning/dates';
import { opensearchClient, OPENSEARCH_INDEX } from '@shared/opensearch/client';

const log = createLogger('recipeSearch');

export type RecipeSearchResult = {
    data: RecipeCardData[];
    meta: RecipeSearchMeta;
};

const mapDocumentToRecipeCard = (document: Record<string, unknown>): RecipeCardData => {
    const totalTime = Number(document.totalTime ?? 0);
    const rating = Number(document.rating ?? 0);

    return {
        id: document.id as string,
        slug: document.slug as string,
        title: (document.title as string) || 'Unbekanntes Rezept',
        category: (document.category as string) || 'Hauptgericht',
        rating,
        time: totalTime > 0 ? `${totalTime} Min.` : '—',
        image: (document.imageKey as string) ?? null,
        imageKey: (document.imageKey as string) ?? null,
        description: (document.description as string) || '',
        stepCount: Number(document.stepCount ?? 0) || undefined,
        difficulty:
            document.difficulty === 'EASY'
                ? 'Einfach'
                : document.difficulty === 'HARD'
                  ? 'Schwer'
                  : document.difficulty === 'MEDIUM'
                    ? 'Mittel'
                    : undefined,
    };
};

const buildTermsAggregation = (buckets?: Array<{ key: string; doc_count: number }>) =>
    buckets?.map((bucket) => ({ key: bucket.key, count: bucket.doc_count })) ?? [];

type HistogramAggregation = { buckets?: Array<{ key: number | string; doc_count: number }> };
type TermsAggregation = { buckets?: Array<{ key: string; doc_count: number }> };

const getTermsBuckets = (
    agg: TermsAggregation | undefined,
): Array<{ key: string; doc_count: number }> | undefined => agg?.buckets;

const buildHistogramFacet = (agg: HistogramAggregation | undefined, interval: number) => {
    const buckets = (agg?.buckets ?? [])
        .map((bucket) => ({ key: Number(bucket.key), count: bucket.doc_count }))
        .filter((bucket) => !Number.isNaN(bucket.key));

    if (buckets.length === 0) return undefined;

    const sorted = buckets.sort((a, b) => a.key - b.key);
    const min = sorted[0].key;
    const max = sorted[sorted.length - 1].key;
    return { buckets: sorted, min, max, interval };
};

/** Ids of published recipes matching `query`, best rated first (week selection helpers). */
export async function searchRecipeIds(
    query: Record<string, unknown>,
    size: number,
): Promise<string[]> {
    const response = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: { query, size, _source: ['id'], sort: [{ rating: 'desc' }, { publishedAt: 'desc' }] },
    });
    return ((response.body.hits?.hits ?? []) as Array<{ _source?: { id?: unknown } }>).flatMap(
        (hit) => (typeof hit._source?.id === 'string' ? [hit._source.id] : []),
    );
}

/** Ids fetched for the ranked sorts (taste, week): kNN and scoring pick from these. */
const RANKED_POOL_SIZE = 1000;

/** Ranked order for "Passt zu dir" / "Passt zu deiner Woche" (KUC-126). */
async function rankIds(
    idsByRating: string[],
    options: {
        userId: string;
        profile: number[] | null;
        context?: RecipeSearchContext;
        withReasons: boolean;
    },
): Promise<{ id: string; reason?: string }[]> {
    const { userId, profile, context, withReasons } = options;
    const week = context?.week ?? toBerlinDate(new Date());
    try {
        const [picksById, globalMean, expiring] = await Promise.all([
            loadRankingRecipes(context?.pickIds ?? []),
            loadGlobalMeanRating(),
            context ? loadExpiringStock(userId, toBerlinDate(new Date())) : Promise.resolve([]),
        ]);
        return await rankedSearch(
            {
                idsByRating,
                profile,
                picks: (context?.pickIds ?? []).flatMap((id) => picksById.get(id) ?? []),
                excludeIds: context?.excludeIds ?? [],
                expiring,
                season: seasonOf(week),
                withReasons,
                globalMean,
            },
            {
                knn: knnRecipeIds,
                load: (ids) => loadRankingRecipes(ids),
                tasteFallback: (ids) =>
                    rankRecipeIdsByTaste(userId, ids, { taste: profile ?? undefined }),
            },
        );
    } catch (err) {
        log.warn('Ranking failed, keeping rating order', {
            error: err instanceof Error ? err.message : String(err),
        });
        return idsByRating.map((id) => ({ id }));
    }
}

/** Recipe cards for the given ranked ids, in that order, with the ranking reason. */
export async function loadCards(
    order: { id: string; reason?: string }[],
): Promise<RecipeCardData[]> {
    if (order.length === 0) return [];
    const response = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: { query: { ids: { values: order.map((o) => o.id) } }, size: order.length },
    });
    const byId = new Map(
        ((response.body.hits?.hits ?? []) as Array<{ _source?: Record<string, unknown> }>)
            .filter((hit) => hit._source)
            .map((hit) => [hit._source!.id as string, mapDocumentToRecipeCard(hit._source!)]),
    );
    return order.flatMap(({ id, reason }) => {
        const card = byId.get(id);
        return card ? [reason ? { ...card, reason } : card] : [];
    });
}

export async function queryRecipes(
    filters: RecipeFilterSearchParams,
    userId?: string | null,
    context?: RecipeSearchContext,
): Promise<RecipeSearchResult> {
    const { query, page = 1, limit = RECIPE_FILTER_DEFAULT_LIMIT, sort = 'rating' } = filters;

    // "Passt zu dir" needs a logged-in user with a taste profile; otherwise fall back to popular.
    // "Passt zu deiner Woche" also works without a profile (neutral taste).
    let tasteEmbedding: number[] | null = null;
    if ((sort === 'taste' || sort === 'week') && userId) {
        try {
            tasteEmbedding = await loadTasteEmbedding(userId);
        } catch (err) {
            log.warn('Loading taste profile failed', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    const effectiveSort = resolveEffectiveSort(sort, {
        isLoggedIn: !!userId,
        hasTasteProfile: sort === 'taste' ? !!tasteEmbedding : undefined,
    });
    const isRanked = effectiveSort === 'taste' || effectiveSort === 'week';

    const sortMap: Record<string, Record<string, unknown>[]> = {
        rating: [{ rating: 'desc' }, { publishedAt: 'desc' }],
        newest: [{ publishedAt: 'desc' }],
        fastest: [{ totalTime: 'asc' }, { rating: 'desc' }],
        popular: [{ cookCount: 'desc' }, { rating: 'desc' }],
    };
    // Ranked sorts work on all matching ids by rating (after all filters)
    const osSort = sortMap[isRanked ? 'rating' : effectiveSort] ?? sortMap.rating;
    const from = Math.max(0, page - 1) * limit;

    const response = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: {
            query: buildRecipeBoolQuery(filters, context),
            sort: osSort,
            from: isRanked ? 0 : from,
            size: isRanked ? RANKED_POOL_SIZE : limit,
            ...(isRanked ? { _source: ['id'] } : {}),
            track_total_hits: true,
            aggs: {
                tags: { terms: { field: 'tags', size: 60 } },
                ingredients: { terms: { field: 'ingredients', size: 60 } },
                difficulties: { terms: { field: 'difficulty', size: 5 } },
                categories: { terms: { field: 'category', size: 8 } },
                totalTime: { histogram: { field: 'totalTime', interval: 5, min_doc_count: 0 } },
                prepTime: { histogram: { field: 'prepTime', interval: 5, min_doc_count: 0 } },
                cookTime: { histogram: { field: 'cookTime', interval: 5, min_doc_count: 0 } },
                stepCount: { histogram: { field: 'stepCount', interval: 2, min_doc_count: 0 } },
                calories: { histogram: { field: 'calories', interval: 100, min_doc_count: 0 } },
                rating: { histogram: { field: 'rating', interval: 1, min_doc_count: 0 } },
                cookCount: { histogram: { field: 'cookCount', interval: 10, min_doc_count: 0 } },
            },
        },
    });

    const hits = (response.body.hits?.hits ?? []) as Array<{ _source?: Record<string, unknown> }>;
    const total =
        typeof response.body.hits?.total === 'number'
            ? response.body.hits.total
            : (response.body.hits?.total?.value ?? 0);

    const facets: RecipeSearchFacets = {
        tags: buildTermsAggregation(
            getTermsBuckets(response.body.aggregations?.tags as TermsAggregation | undefined),
        ),
        ingredients: buildTermsAggregation(
            getTermsBuckets(
                response.body.aggregations?.ingredients as TermsAggregation | undefined,
            ),
        ),
        difficulties: buildTermsAggregation(
            getTermsBuckets(
                response.body.aggregations?.difficulties as TermsAggregation | undefined,
            ),
        ),
        categories: buildTermsAggregation(
            getTermsBuckets(response.body.aggregations?.categories as TermsAggregation | undefined),
        ),
        totalTime: buildHistogramFacet(
            response.body.aggregations?.totalTime as HistogramAggregation | undefined,
            5,
        ),
        prepTime: buildHistogramFacet(
            response.body.aggregations?.prepTime as HistogramAggregation | undefined,
            5,
        ),
        cookTime: buildHistogramFacet(
            response.body.aggregations?.cookTime as HistogramAggregation | undefined,
            5,
        ),
        stepCount: buildHistogramFacet(
            response.body.aggregations?.stepCount as HistogramAggregation | undefined,
            2,
        ),
        calories: buildHistogramFacet(
            response.body.aggregations?.calories as HistogramAggregation | undefined,
            100,
        ),
        rating: buildHistogramFacet(
            response.body.aggregations?.rating as HistogramAggregation | undefined,
            1,
        ),
        cookCount: buildHistogramFacet(
            response.body.aggregations?.cookCount as HistogramAggregation | undefined,
            10,
        ),
    };

    let data = hits
        .map((hit) => hit._source)
        .filter(Boolean)
        .map((source) => mapDocumentToRecipeCard(source ?? {}));

    let rankedTotal = total;
    if (isRanked) {
        const idsByRating = hits.flatMap((hit) =>
            typeof hit._source?.id === 'string' ? [hit._source.id as string] : [],
        );
        const order = await rankIds(idsByRating, {
            userId: userId!,
            profile: tasteEmbedding,
            context: effectiveSort === 'week' ? context : undefined,
            withReasons: effectiveSort === 'week',
        });
        rankedTotal = order.length;
        data = await loadCards(order.slice(from, from + limit));
    }

    // Semantic search: prepend embedding-based hits on first page for 4+ word queries
    if (query && userId && semanticPrependAllowed({ query, userId, page, context })) {
        try {
            const existingIds = new Set(data.map((r) => r.id));
            const { recipes: semanticHits } = await semanticRecipeSearch(
                query,
                existingIds,
                userId,
            );

            if (semanticHits.length > 0) {
                const semanticCards = semanticHits.map((hit) => ({
                    id: hit.id,
                    slug: hit.slug,
                    title: hit.title,
                    category: hit.category,
                    rating: hit.rating,
                    time: hit.totalTime > 0 ? `${hit.totalTime} Min.` : '—',
                    image: hit.imageKey,
                    imageKey: hit.imageKey,
                    description: hit.description,
                    stepCount: undefined,
                    difficulty: undefined,
                }));

                data = [...semanticCards, ...data];
            }
        } catch {
            // Semantic search is best-effort
        }
    }

    return {
        data,
        meta: { total: isRanked ? rankedTotal : total, page, limit, facets },
    };
}

export async function fetchCategoryFacets(
    categorySlug: string,
    tagLimit = 10,
    ingredientLimit = 10,
): Promise<{ tags: TermFacet; ingredients: TermFacet; difficulties: TermFacet }> {
    const { body } = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: {
            size: 0,
            query: {
                bool: {
                    filter: [{ term: { status: 'PUBLISHED' } }, { term: { categorySlug } }],
                },
            },
            aggs: {
                tags: { terms: { field: 'tags', size: tagLimit } },
                ingredients: { terms: { field: 'ingredients', size: ingredientLimit } },
                difficulties: { terms: { field: 'difficulty', size: 5 } },
            },
        },
    });

    const aggs = body.aggregations as
        | Record<string, { buckets?: Array<{ key: string; doc_count: number }> }>
        | undefined;
    return {
        tags: buildTermsAggregation(aggs?.tags?.buckets),
        ingredients: buildTermsAggregation(aggs?.ingredients?.buckets),
        difficulties: buildTermsAggregation(aggs?.difficulties?.buckets),
    };
}
