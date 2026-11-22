// Filter part of the recipe search (KUC-126): the visible filters plus a hidden base
// filter (`context`) that pills and the sidebar never show. Server side only: it imports the
// OpenSearch module; the browser uses `recipeSearchContext.ts`.
import { mealKindQuery } from '@shared/meal-planning/meal-kind';
import { buildRecipeTextQuery } from '@shared/opensearch/client';

import type { RecipeFilterSearchParams } from './recipeFilters';
import type { RecipeSearchContext } from './recipeSearchContext';

export {
    appendRecipeSearchContext,
    parseRecipeSearchContext,
    type RecipeSearchContext,
} from './recipeSearchContext';

/** Words from which a query also gets embedding-based hits on the first page */
const SEMANTIC_MIN_WORD_COUNT = 4;

/**
 * Semantic hits are prepended outside the bool query, so they would skip the base filter:
 * under a context (week selection) they would bring sauces or the picks back. Only plain
 * searches of logged-in users with 4+ words on page 1 get them.
 */
export function semanticPrependAllowed(input: {
    query?: string;
    userId?: string;
    page: number;
    context?: RecipeSearchContext;
}): boolean {
    const words = input.query?.trim() ? input.query.trim().split(/\s+/).length : 0;
    return !input.context && !!input.userId && input.page === 1 && words >= SEMANTIC_MIN_WORD_COUNT;
}

type Clause = Record<string, unknown>;

/**
 * OpenSearch bool query of the visible filters plus the base filter. The base filter always
 * sits in `filter` / `must_not`, also in OR mode, so hits and facets both respect it.
 */
export function buildRecipeBoolQuery(
    filters: RecipeFilterSearchParams,
    context?: RecipeSearchContext,
): Clause {
    const {
        query,
        tags = [],
        categories = [],
        ingredients = [],
        excludeIngredients = [],
        difficulty = [],
        filterMode = 'and',
    } = filters;

    const bool: {
        must: Clause[];
        filter: Clause[];
        should: Clause[];
        must_not: Clause[];
        minimum_should_match?: number;
    } = { must: [], filter: [], should: [], must_not: [] };

    // status:PUBLISHED must ALWAYS be in filter (never in should/or-mode)
    bool.filter.push({ term: { status: 'PUBLISHED' } });
    if (context?.kind) bool.filter.push(mealKindQuery(context.kind));

    if (query) {
        bool.must.push({ bool: { should: buildRecipeTextQuery(query), minimum_should_match: 1 } });
    }

    const clauses: Clause[] = [];
    if (categories.length > 0) clauses.push({ terms: { categorySlug: categories } });
    if (tags.length > 0)
        clauses.push({ bool: { must: tags.map((tag) => ({ term: { tags: tag } })) } });
    if (ingredients.length > 0) {
        clauses.push({
            bool: {
                must: ingredients.map((ingredient) => ({ term: { ingredients: ingredient } })),
            },
        });
    }
    if (difficulty.length > 0) {
        clauses.push({ terms: { difficulty: difficulty.map((d) => d.toUpperCase()) } });
    }

    const addRange = (field: string, gte?: number, lte?: number) => {
        const range: Record<string, number> = {};
        if (typeof gte === 'number') range.gte = gte;
        if (typeof lte === 'number') range.lte = lte;
        if (Object.keys(range).length > 0) clauses.push({ range: { [field]: range } });
    };
    addRange('totalTime', filters.minTotalTime, filters.maxTotalTime);
    addRange('prepTime', filters.minPrepTime, filters.maxPrepTime);
    addRange('cookTime', filters.minCookTime, filters.maxCookTime);
    addRange('stepCount', filters.minStepCount, filters.maxStepCount);
    addRange('calories', filters.minCalories, filters.maxCalories);
    addRange('rating', filters.minRating, undefined);
    addRange('cookCount', filters.minCookCount, undefined);

    if (excludeIngredients.length > 0) {
        bool.must_not.push({ terms: { ingredients: excludeIngredients } });
    }
    if (context?.excludeIds?.length) bool.must_not.push({ terms: { id: context.excludeIds } });

    if (clauses.length > 0) {
        if (filterMode === 'or') {
            bool.should = clauses;
            bool.minimum_should_match = 1;
        } else {
            bool.filter.push(...clauses);
        }
    }

    return { bool };
}
