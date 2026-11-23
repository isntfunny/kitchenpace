// Pure filter-state helpers shared by the recipe search page and the week selection
// dialog (KUC-126). No React, no URL, no storage: the hooks wrap these.
import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';
import { MULTI_VALUE_KEYS, NUMBER_KEYS } from '@shared/recipe-filters';
import type { RecipeFilterSearchParams, RecipeSortOption } from '@shared/recipe-filters';
import { toggleThemeFilters, type ThemeChip } from '@shared/theme-clusters/release';

export type FiltersWithSort = RecipeFilterSearchParams & { sort: RecipeSortOption };

/** Where a filter change came from; decides push vs replace in the URL sync. */
export type FilterChangeOrigin = 'user' | 'typing' | 'restore';

/** Filter criteria of a FilterSet (client-safe, no server imports). */
function filterSetCriteria(fs: FilterSetWithRelations) {
    return {
        tags: fs.tags.map((t) => t.tag.name),
        categories: fs.categories.map((c) => c.category.slug),
        ingredients: fs.ingredients.map((i) => i.ingredient.name),
    };
}

/** "Zurücksetzen": every filter empty, the sort stays. */
export function clearedFilters(prev: FiltersWithSort): FiltersWithSort {
    return {
        ...prev,
        query: undefined,
        tags: [],
        categories: [],
        ingredients: [],
        excludeIngredients: [],
        difficulty: [],
        minTotalTime: undefined,
        maxTotalTime: undefined,
        minPrepTime: undefined,
        maxPrepTime: undefined,
        minCookTime: undefined,
        maxCookTime: undefined,
        minRating: undefined,
        minCookCount: undefined,
        minStepCount: undefined,
        maxStepCount: undefined,
        minCalories: undefined,
        maxCalories: undefined,
        weekPlan: undefined,
        filterSetId: undefined,
    };
}

/**
 * Turns a FilterSet on, off, or switches to it: the previous set's items are removed
 * before the new set's items are merged; the user's own filters stay.
 */
export function toggleFilterSet(
    prev: FiltersWithSort,
    filterSet: FilterSetWithRelations,
    all: FilterSetWithRelations[] | undefined,
): FiltersWithSort {
    const without = (values: string[] | undefined, remove: string[]) => {
        const drop = new Set(remove);
        return (values ?? []).filter((value) => !drop.has(value));
    };

    if (prev.filterSetId === filterSet.id) {
        const criteria = filterSetCriteria(filterSet);
        return {
            ...prev,
            filterSetId: undefined,
            tags: without(prev.tags, criteria.tags),
            categories: without(prev.categories, criteria.categories),
            ingredients: without(prev.ingredients, criteria.ingredients),
        };
    }

    let tags = prev.tags ?? [];
    let categories = prev.categories ?? [];
    let ingredients = prev.ingredients ?? [];
    const previous = prev.filterSetId ? all?.find((fs) => fs.id === prev.filterSetId) : undefined;
    if (previous) {
        const criteria = filterSetCriteria(previous);
        tags = without(tags, criteria.tags);
        categories = without(categories, criteria.categories);
        ingredients = without(ingredients, criteria.ingredients);
    }

    const criteria = filterSetCriteria(filterSet);
    return {
        ...prev,
        filterSetId: filterSet.id,
        tags: [...new Set([...tags, ...criteria.tags])],
        categories: [...new Set([...categories, ...criteria.categories])],
        ingredients: [...new Set([...ingredients, ...criteria.ingredients])],
    };
}

/** Theme clusters act like FilterSets, but only add/remove their tags and categories. */
export function toggleTheme(prev: FiltersWithSort, theme: ThemeChip): FiltersWithSort {
    return { ...prev, ...toggleThemeFilters(prev, theme) };
}

/** Number of active filters for the badge; a blank query does not count. */
export function countActiveFilters(filters: RecipeFilterSearchParams): number {
    const arrays = MULTI_VALUE_KEYS.reduce((sum, key) => {
        const value = filters[key];
        return Array.isArray(value) ? sum + value.length : sum;
    }, 0);
    const numbers = NUMBER_KEYS.reduce(
        (sum, key) => (typeof filters[key] === 'number' ? sum + 1 : sum),
        0,
    );
    return arrays + numbers + (filters.query?.trim() ? 1 : 0) + (filters.weekPlan ? 1 : 0);
}

/** Typing and restoring (back/forward, SSR navigation, first render) replace the entry. */
export function historyModeFor(origin: FilterChangeOrigin, isFirst: boolean): 'push' | 'replace' {
    return isFirst || origin !== 'user' ? 'replace' : 'push';
}
