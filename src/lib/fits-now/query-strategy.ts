import { toRecipeCardData, type RecipeCardData } from '@app/lib/recipe-card';
import { opensearchClient, OPENSEARCH_INDEX } from '@shared/opensearch/client';
import { prisma } from '@shared/prisma';

import { type FitsNowContext, type ResolvedPeriod } from './context';
import { getTimeSeasonCriteria, type FilterCriteria } from './mappings';

// ── Build Merged Criteria ────────────────────────────────────────────────────

async function buildCriteria(
    context: FitsNowContext,
    activePeriods: ResolvedPeriod[],
): Promise<FilterCriteria> {
    const base = await getTimeSeasonCriteria(context.timeSlot, context.season);

    const periodTags = activePeriods.flatMap((p) => p.criteria.tagKeywords);
    const periodCategories = activePeriods.flatMap((p) => p.criteria.categorySlugs);
    const periodIngredients = activePeriods.flatMap((p) => p.criteria.ingredientKeywords);

    if (context.isHolidayOverride) {
        // Period tags are primary, time-of-day is soft boost
        return {
            categorySlugs: [...new Set([...periodCategories, ...base.categorySlugs])],
            tagKeywords: [...new Set([...periodTags, ...base.tagKeywords])],
            ingredientKeywords: [...new Set([...periodIngredients, ...base.ingredientKeywords])],
            maxTotalTime: undefined, // No time limit during holiday periods
        };
    }

    // Time+season is primary, period tags are soft boost
    return {
        categorySlugs: [...new Set([...base.categorySlugs, ...periodCategories])],
        tagKeywords: [...new Set([...base.tagKeywords, ...periodTags])],
        ingredientKeywords: [...new Set([...base.ingredientKeywords, ...periodIngredients])],
        maxTotalTime: base.maxTotalTime,
    };
}

// ── OpenSearch Query ─────────────────────────────────────────────────────────

interface OsRecipeHit {
    _id: string;
    _score: number;
    _source?: { id?: string };
}

async function searchOpenSearch(criteria: FilterCriteria, take: number): Promise<string[] | null> {
    try {
        const should: Record<string, unknown>[] = [];

        if (criteria.categorySlugs.length > 0) {
            should.push({ terms: { categorySlug: criteria.categorySlugs, boost: 3 } });
        }
        if (criteria.tagKeywords.length > 0) {
            should.push({ terms: { tags: criteria.tagKeywords, boost: 2 } });
        }
        if (criteria.ingredientKeywords.length > 0) {
            should.push({
                terms: { ingredients: criteria.ingredientKeywords, boost: 1 },
            });
        }

        if (should.length === 0) return null;

        const filter: Record<string, unknown>[] = [{ term: { status: 'PUBLISHED' } }];

        if (criteria.maxTotalTime) {
            filter.push({ range: { totalTime: { lte: criteria.maxTotalTime } } });
        }

        const { body } = await opensearchClient.search({
            index: OPENSEARCH_INDEX,
            body: {
                size: take * 3, // Over-request for diversity
                query: {
                    bool: {
                        filter,
                        should,
                        minimum_should_match: 1,
                    },
                },
                sort: [{ _score: 'desc' }, { rating: 'desc' }],
            },
        });

        const hits = (body.hits?.hits ?? []) as OsRecipeHit[];
        return hits.map((h) => h._id);
    } catch (err) {
        console.warn('[FitsNow] OpenSearch query failed, using Prisma fallback', {
            error: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}

// ── Prisma Fallback ──────────────────────────────────────────────────────────

async function searchPrisma(criteria: FilterCriteria, take: number): Promise<RecipeCardData[]> {
    const orConditions = [];

    if (criteria.categorySlugs.length > 0) {
        orConditions.push({
            categories: { some: { category: { slug: { in: criteria.categorySlugs } } } },
        });
    }
    if (criteria.tagKeywords.length > 0) {
        orConditions.push({
            tags: {
                some: { tag: { name: { in: criteria.tagKeywords, mode: 'insensitive' as const } } },
            },
        });
    }

    const recipes = await prisma.recipe.findMany({
        where: {
            publishedAt: { not: null },
            totalTime: criteria.maxTotalTime ? { lte: criteria.maxTotalTime } : undefined,
            ...(orConditions.length > 0 ? { OR: orConditions } : {}),
        },
        include: { categories: { include: { category: true } } },
        orderBy: [{ rating: 'desc' }, { viewCount: 'desc' }],
        take,
    });

    return recipes.map(toRecipeCardData);
}

// ── Fetch Recipe Details by IDs ──────────────────────────────────────────────

async function fetchByIds(ids: string[], take: number): Promise<RecipeCardData[]> {
    if (ids.length === 0) return [];

    const recipes = await prisma.recipe.findMany({
        where: { id: { in: ids }, publishedAt: { not: null } },
        include: { categories: { include: { category: true } } },
    });

    // Preserve OpenSearch ranking order
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));
    const ordered = ids.map((id) => recipeMap.get(id)).filter(Boolean);

    return ordered.slice(0, take).map((r) => toRecipeCardData(r!));
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function queryFitsNowRecipes(
    context: FitsNowContext,
    activePeriods: ResolvedPeriod[],
    take: number,
): Promise<RecipeCardData[]> {
    const criteria = await buildCriteria(context, activePeriods);

    // Try OpenSearch first
    const osIds = await searchOpenSearch(criteria, take);
    if (osIds && osIds.length > 0) {
        return fetchByIds(osIds, take);
    }

    // Prisma fallback
    return searchPrisma(criteria, take);
}
