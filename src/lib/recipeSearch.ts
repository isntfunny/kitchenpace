import type { RecipeCardData } from '@app/app/actions/recipes';
import { RECIPE_FILTER_DEFAULT_LIMIT } from '@app/lib/recipeFilters';
import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';
import type { RecipeSearchFacets, RecipeSearchMeta } from '@app/lib/recipeSearchTypes';
import {
    buildRecipeTextQuery,
    opensearchClient,
    OPENSEARCH_INDEX,
} from '@shared/opensearch/client';

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

export async function queryRecipes(filters: RecipeFilterSearchParams): Promise<RecipeSearchResult> {
    const {
        query,
        tags = [],
        categories = [],
        ingredients = [],
        excludeIngredients = [],
        difficulty = [],
        minTotalTime,
        maxTotalTime,
        minPrepTime,
        maxPrepTime,
        minCookTime,
        maxCookTime,
        minRating,
        minCookCount,
        minStepCount,
        maxStepCount,
        minCalories,
        maxCalories,
        page = 1,
        limit = RECIPE_FILTER_DEFAULT_LIMIT,
        filterMode = 'and',
        sort = 'rating',
    } = filters;

    const osSort: Record<string, unknown>[] = {
        rating: [{ rating: 'desc' }, { publishedAt: 'desc' }],
        newest: [{ publishedAt: 'desc' }],
        fastest: [{ totalTime: 'asc' }, { rating: 'desc' }],
        popular: [{ cookCount: 'desc' }, { rating: 'desc' }],
    }[sort] ?? [{ rating: 'desc' }, { publishedAt: 'desc' }];

    type BoolClause = Record<string, unknown>;
    type BoolQuery = {
        bool: {
            must: BoolClause[];
            filter: BoolClause[];
            should: BoolClause[];
            must_not: BoolClause[];
            minimum_should_match?: number;
        };
    };

    const boolQuery: BoolQuery = {
        bool: { must: [], filter: [], should: [], must_not: [] },
    };

    // status:PUBLISHED must ALWAYS be in filter (never in should/or-mode)
    boolQuery.bool.filter.push({ term: { status: 'PUBLISHED' } });

    const clauses: Record<string, unknown>[] = [];
    const pushClause = (clause: Record<string, unknown>) => clauses.push(clause);

    if (query) {
        boolQuery.bool.must.push({
            bool: {
                should: buildRecipeTextQuery(query),
                minimum_should_match: 1,
            },
        });
    }

    if (categories.length > 0) pushClause({ terms: { categorySlug: categories } });

    if (tags.length > 0) {
        pushClause({ bool: { must: tags.map((tag) => ({ term: { tags: tag } })) } });
    }

    if (ingredients.length > 0) {
        pushClause({
            bool: {
                must: ingredients.map((ingredient) => ({ term: { ingredients: ingredient } })),
            },
        });
    }

    if (difficulty.length > 0) {
        pushClause({ terms: { difficulty: difficulty.map((d) => d.toUpperCase()) } });
    }

    const addRange = (field: string, gte?: number, lte?: number) => {
        const range: Record<string, number> = {};
        if (typeof gte === 'number') range.gte = gte;
        if (typeof lte === 'number') range.lte = lte;
        if (Object.keys(range).length === 0) return;
        pushClause({ range: { [field]: range } });
    };

    addRange('totalTime', minTotalTime, maxTotalTime);
    addRange('prepTime', minPrepTime, maxPrepTime);
    addRange('cookTime', minCookTime, maxCookTime);
    addRange('stepCount', minStepCount, maxStepCount);
    addRange('calories', minCalories, maxCalories);
    if (typeof minRating === 'number') addRange('rating', minRating, undefined);
    if (typeof minCookCount === 'number') addRange('cookCount', minCookCount, undefined);

    if (excludeIngredients.length > 0) {
        boolQuery.bool.must_not.push({ terms: { ingredients: excludeIngredients } });
    }

    if (clauses.length > 0) {
        if (filterMode === 'or') {
            boolQuery.bool.should = clauses;
            boolQuery.bool.minimum_should_match = 1;
        } else {
            boolQuery.bool.filter.push(...clauses);
        }
    }

    const hasClauses =
        boolQuery.bool.must.length > 0 ||
        boolQuery.bool.filter.length > 0 ||
        boolQuery.bool.should.length > 0 ||
        boolQuery.bool.must_not.length > 0 ||
        typeof boolQuery.bool.minimum_should_match === 'number';

    const sanitizedQuery = hasClauses ? boolQuery : { match_all: {} };
    const from = Math.max(0, page - 1) * limit;

    const response = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: {
            query: sanitizedQuery,
            sort: osSort,
            from,
            size: limit,
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

    return {
        data: hits
            .map((hit) => hit._source)
            .filter(Boolean)
            .map((source) => mapDocumentToRecipeCard(source ?? {})),
        meta: { total, page, limit, facets },
    };
}
