import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLocalStorage } from '@app/hooks/useLocalStorage';
import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';
import { buildRecipeFilterQuery, MULTI_VALUE_KEYS, NUMBER_KEYS } from '@app/lib/recipeFilters';
import type { RecipeFilterSearchParams, RecipeSortOption } from '@app/lib/recipeFilters';
import { STORAGE_KEYS } from '@app/lib/storageKeys';

type FiltersWithSort = RecipeFilterSearchParams & { sort: RecipeSortOption };

/** Extract filter criteria from a FilterSet (client-safe, no server imports). */
function extractFilterSetCriteria(fs: FilterSetWithRelations) {
    return {
        tagKeywords: fs.tags.map((t) => t.tag.name),
        categorySlugs: fs.categories.map((c) => c.category.slug),
        ingredientKeywords: fs.ingredients.map((i) => i.ingredient.name),
    };
}

export function useSearchFilters(
    initialFilters: RecipeFilterSearchParams,
    filterSets?: FilterSetWithRelations[],
) {
    const pathname = usePathname();
    const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>(
        STORAGE_KEYS.searchViewMode,
        'grid',
    );
    const [savedSort, setSavedSort] = useLocalStorage<RecipeSortOption>(
        STORAGE_KEYS.searchSort,
        'rating',
    );

    const resolveSort = (f: RecipeFilterSearchParams): RecipeSortOption => f.sort ?? savedSort;

    const [filters, setFilters] = useState<FiltersWithSort>({
        ...initialFilters,
        sort: resolveSort(initialFilters),
    });
    const [queryInput, setQueryInput] = useState(initialFilters.query ?? '');

    // Sync when SSR-provided initialFilters change (e.g. URL navigation)
    const prevInitialRef = useRef(initialFilters);
    useEffect(() => {
        if (prevInitialRef.current === initialFilters) return;
        prevInitialRef.current = initialFilters;
        setFilters({ ...initialFilters, sort: resolveSort(initialFilters) });
        setQueryInput(initialFilters.query ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- savedSort intentionally excluded
    }, [initialFilters]);

    // Sync query input when filters.query changes programmatically
    const prevFilterQuery = useRef(filters.query);
    useEffect(() => {
        if (prevFilterQuery.current === filters.query) return;
        prevFilterQuery.current = filters.query;
        setQueryInput(filters.query ?? '');
    }, [filters.query]);

    // Debounced query → filters sync
    useEffect(() => {
        const timer = setTimeout(() => {
            const sanitized = queryInput.trim();
            const nextQuery = sanitized.length > 0 ? queryInput : undefined;
            if (nextQuery === filters.query) return;
            updateFilters({ query: nextQuery });
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-debounce when user types, not when filters/updateFilters change
    }, [queryInput]);

    // URL sync
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = buildRecipeFilterQuery(filters).toString();
        const next = params ? `${pathname}?${params}` : pathname;
        window.history.replaceState(null, '', next);
    }, [filters, pathname]);

    const updateFilters = useCallback((next: Partial<RecipeFilterSearchParams>) => {
        setFilters((prev) => ({ ...prev, ...next }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters((prev) => ({
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
            filterSetId: undefined,
        }));
    }, []);

    const handleSortChange = useCallback(
        (sort: RecipeSortOption) => {
            setSavedSort(sort);
            updateFilters({ sort });
        },
        [setSavedSort, updateFilters],
    );

    const handleFilterSetToggle = useCallback(
        (filterSet: FilterSetWithRelations) => {
            setFilters((prev) => {
                const isActive = prev.filterSetId === filterSet.id;

                if (isActive) {
                    // Deactivate: remove this FilterSet's items from filters
                    const criteria = extractFilterSetCriteria(filterSet);
                    const tagSet = new Set(criteria.tagKeywords);
                    const catSet = new Set(criteria.categorySlugs);
                    const ingSet = new Set(criteria.ingredientKeywords);

                    return {
                        ...prev,
                        filterSetId: undefined,
                        tags: (prev.tags ?? []).filter((t) => !tagSet.has(t)),
                        categories: (prev.categories ?? []).filter((c) => !catSet.has(c)),
                        ingredients: (prev.ingredients ?? []).filter((i) => !ingSet.has(i)),
                    };
                }

                // Switching: remove previous FilterSet's items first, then add new ones
                let baseTags = prev.tags ?? [];
                let baseCategories = prev.categories ?? [];
                let baseIngredients = prev.ingredients ?? [];

                if (prev.filterSetId && filterSets) {
                    const prevSet = filterSets.find((fs) => fs.id === prev.filterSetId);
                    if (prevSet) {
                        const prevCriteria = extractFilterSetCriteria(prevSet);
                        const prevTags = new Set(prevCriteria.tagKeywords);
                        const prevCats = new Set(prevCriteria.categorySlugs);
                        const prevIngs = new Set(prevCriteria.ingredientKeywords);
                        baseTags = baseTags.filter((t) => !prevTags.has(t));
                        baseCategories = baseCategories.filter((c) => !prevCats.has(c));
                        baseIngredients = baseIngredients.filter((i) => !prevIngs.has(i));
                    }
                }

                // Activate: merge new FilterSet's items
                const criteria = extractFilterSetCriteria(filterSet);
                return {
                    ...prev,
                    filterSetId: filterSet.id,
                    tags: [...new Set([...baseTags, ...criteria.tagKeywords])],
                    categories: [...new Set([...baseCategories, ...criteria.categorySlugs])],
                    ingredients: [...new Set([...baseIngredients, ...criteria.ingredientKeywords])],
                };
            });
        },
        [filterSets],
    );

    const activeFilterCount = useMemo(() => {
        const arrayCount = MULTI_VALUE_KEYS.reduce((sum, key) => {
            const value = filters[key];
            return Array.isArray(value) ? sum + value.length : sum;
        }, 0);
        const numericCount = NUMBER_KEYS.reduce((sum, key) => {
            return typeof filters[key] === 'number' ? sum + 1 : sum;
        }, 0);
        const hasQuery = Boolean(filters.query?.trim());
        return arrayCount + numericCount + (hasQuery ? 1 : 0);
    }, [filters]);

    return {
        filters,
        setFilters,
        queryInput,
        setQueryInput,
        viewMode,
        setViewMode,
        updateFilters,
        resetFilters,
        handleSortChange,
        handleFilterSetToggle,
        activeFilterCount,
    };
}
