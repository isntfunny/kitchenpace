// Filter part of the recipe search (KUC-126): the visible filters plus a hidden base
// filter (`context`) that pills and the sidebar never show. Pure, no client.
import { mealKindQuery, type MealKind } from '@shared/meal-planning/meal-kind';
import { buildRecipeTextQuery } from '@shared/opensearch/client';

import type { RecipeFilterSearchParams } from './recipeFilters';

/** Hidden base filter and ranking input of the week selection dialog. */
export type RecipeSearchContext = {
    /** Only recipes allowed for this meal kind */
    kind?: MealKind;
    /** Never in the result (the picks, which the dialog shows itself) */
    excludeIds?: string[];
    /** Chosen dishes: blended into the search vector of the `week` sort */
    pickIds?: string[];
    /** First day of the planned week (season, pantry) */
    week?: string;
};

const MEAL_KINDS: readonly MealKind[] = ['main', 'breakfast', 'snack'];
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EXCLUDE = 200;
const MAX_PICKS = 30;

const ids = (value: string | null, max: number) =>
    [
        ...new Set(
            (value ?? '')
                .split(',')
                .map((id) => id.trim())
                .filter((id) => ID_PATTERN.test(id)),
        ),
    ].slice(0, max);

/** Reads the context params (`kind`, `exclude`, `picks`, `week`); undefined when none is set. */
export function parseRecipeSearchContext(params: URLSearchParams): RecipeSearchContext | undefined {
    const context: RecipeSearchContext = {};
    const kind = params.get('kind');
    if (kind && (MEAL_KINDS as readonly string[]).includes(kind)) context.kind = kind as MealKind;
    const excludeIds = ids(params.get('exclude'), MAX_EXCLUDE);
    if (excludeIds.length) context.excludeIds = excludeIds;
    const pickIds = ids(params.get('picks'), MAX_PICKS);
    if (pickIds.length) context.pickIds = pickIds;
    const week = params.get('week');
    if (week && DATE_PATTERN.test(week)) context.week = week;
    return Object.keys(context).length ? context : undefined;
}

export function appendRecipeSearchContext(params: URLSearchParams, context?: RecipeSearchContext) {
    if (!context) return;
    if (context.kind) params.set('kind', context.kind);
    if (context.excludeIds?.length) params.set('exclude', context.excludeIds.join(','));
    if (context.pickIds?.length) params.set('picks', context.pickIds.join(','));
    if (context.week) params.set('week', context.week);
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
