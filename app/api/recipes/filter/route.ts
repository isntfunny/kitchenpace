import { NextRequest, NextResponse } from 'next/server';

import type { RecipeCardData } from '@/app/actions/recipes';
import { createLogger } from '@/lib/logger';
import { opensearchClient, OPENSEARCH_INDEX } from '@/lib/opensearch/client';
import { parseRecipeFilterParams, RECIPE_FILTER_DEFAULT_LIMIT } from '@/lib/recipeFilters';

const log = createLogger('filter');

const TOTAL_TIME_MAX = 180;

const TIME_OF_DAY_RANGES: Record<string, { min?: number; max?: number }> = {
    morgen: { min: 0, max: 25 },
    mittag: { min: 20, max: 45 },
    nachmittag: { min: 25, max: 60 },
    abend: { min: 30, max: 90 },
    snack: { min: 0, max: 20 },
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
        time: `${totalTime} Min.`,
        image:
            (document.imageUrl as string) ??
            'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80',
        description: (document.description as string) || '',
    };
};

const buildTermsAggregation = (buckets?: Array<{ key: string; doc_count: number }>) =>
    buckets?.map((bucket) => ({ key: bucket.key, count: bucket.doc_count })) ?? [];

type HistogramAggregation = { buckets?: Array<{ key: number | string; doc_count: number }> };

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

export async function GET(request: NextRequest) {
    log.debug('Filter request received', { url: request.url });

    try {
        const filters = parseRecipeFilterParams(new URL(request.url).searchParams);
        const {
            query,
            tags = [],
            mealTypes = [],
            ingredients = [],
            excludeIngredients = [],
            difficulty = [],
            timeOfDay = [],
            minTotalTime,
            maxTotalTime,
            minPrepTime,
            maxPrepTime,
            minCookTime,
            maxCookTime,
            minRating,
            minCookCount,
            page = 1,
            limit = RECIPE_FILTER_DEFAULT_LIMIT,
            filterMode = 'and',
        } = filters;

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
            bool: {
                must: [],
                filter: [],
                should: [],
                must_not: [],
            },
        };

        const clauses: Record<string, unknown>[] = [];

        const pushClause = (clause: Record<string, unknown>) => clauses.push(clause);

        if (query) {
            boolQuery.bool.must.push({
                multi_match: {
                    query,
                    fields: ['title^3', 'description', 'keywords', 'ingredients^2'],
                    fuzziness: 'AUTO',
                    prefix_length: 1,
                },
            });
        }

        pushClause({ term: { status: 'PUBLISHED' } });

        if (mealTypes.length > 0) {
            pushClause({ terms: { category: mealTypes } });
        }

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
            pushClause({ terms: { difficulty: difficulty.map((value) => value.toUpperCase()) } });
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
        if (typeof minRating === 'number') addRange('rating', minRating, undefined);
        if (typeof minCookCount === 'number') addRange('cookCount', minCookCount, undefined);

        const timeRanges = timeOfDay
            .map((slot) => TIME_OF_DAY_RANGES[slot.toLowerCase()])
            .filter(Boolean)
            .map((range) => ({
                range: {
                    totalTime: {
                        gte: range.min ?? 0,
                        lte: range.max ?? TOTAL_TIME_MAX,
                    },
                },
            }));

        if (timeRanges.length > 0) {
            pushClause({ bool: { should: timeRanges, minimum_should_match: 1 } });
        }

        if (excludeIngredients.length > 0) {
            boolQuery.bool.must_not.push({ terms: { ingredients: excludeIngredients } });
        }

        if (clauses.length > 0) {
            if (filterMode === 'or') {
                boolQuery.bool.should = clauses;
                boolQuery.bool.minimum_should_match = 1;
            } else {
                boolQuery.bool.filter = clauses;
            }
        }

        const hasClauses =
            boolQuery.bool.must.length > 0 ||
            boolQuery.bool.filter.length > 0 ||
            boolQuery.bool.should.length > 0 ||
            boolQuery.bool.must_not.length > 0 ||
            typeof boolQuery.bool.minimum_should_match === 'number';

        const sanitizedQuery = hasClauses ? boolQuery : { match_all: {} };

        const openSearchPage = Math.max(0, page - 1);
        const from = openSearchPage * limit;

        const response = await opensearchClient.search({
            index: OPENSEARCH_INDEX,
            body: {
                query: sanitizedQuery,
                sort: [{ rating: 'desc' }, { publishedAt: 'desc' }],
                from,
                size: limit,
                aggs: {
                    tags: { terms: { field: 'tags', size: 60 } },
                    ingredients: { terms: { field: 'ingredients', size: 60 } },
                    difficulties: { terms: { field: 'difficulty', size: 5 } },
                    categories: { terms: { field: 'category', size: 8 } },
                    totalTime: {
                        histogram: { field: 'totalTime', interval: 10, min_doc_count: 0 },
                    },
                    prepTime: { histogram: { field: 'prepTime', interval: 5, min_doc_count: 0 } },
                    cookTime: { histogram: { field: 'cookTime', interval: 5, min_doc_count: 0 } },
                    rating: { histogram: { field: 'rating', interval: 1, min_doc_count: 0 } },
                    cookCount: {
                        histogram: { field: 'cookCount', interval: 10, min_doc_count: 0 },
                    },
                },
            },
        });

        const hits = (response.body.hits?.hits ?? []) as Array<{
            _source?: Record<string, unknown>;
        }>;
        const total =
            typeof response.body.hits?.total === 'number'
                ? response.body.hits.total
                : (response.body.hits?.total?.value ?? 0);

        const payload = {
            data: hits
                .map((hit) => hit._source)
                .filter(Boolean)
                .map((source) => mapDocumentToRecipeCard(source ?? {})),
            meta: {
                total,
                page,
                limit,
                facets: {
                    tags: buildTermsAggregation(response.body.aggregations?.tags?.buckets),
                    ingredients: buildTermsAggregation(
                        response.body.aggregations?.ingredients?.buckets,
                    ),
                    difficulties: buildTermsAggregation(
                        response.body.aggregations?.difficulties?.buckets,
                    ),
                    categories: buildTermsAggregation(
                        response.body.aggregations?.categories?.buckets,
                    ),
                    totalTime: buildHistogramFacet(response.body.aggregations?.totalTime, 10),
                    prepTime: buildHistogramFacet(response.body.aggregations?.prepTime, 5),
                    cookTime: buildHistogramFacet(response.body.aggregations?.cookTime, 5),
                    rating: buildHistogramFacet(response.body.aggregations?.rating, 1),
                    cookCount: buildHistogramFacet(response.body.aggregations?.cookCount, 10),
                },
            },
        };

        return NextResponse.json(payload);
    } catch (error) {
        log.error('Filter request failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Fehler beim Laden der Rezepte' }, { status: 500 });
    }
}
