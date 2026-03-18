import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLocalStorage } from '@app/hooks/useLocalStorage';
import { buildRecipeFilterQuery, MULTI_VALUE_KEYS, NUMBER_KEYS } from '@app/lib/recipeFilters';
import type { RecipeFilterSearchParams, RecipeSortOption } from '@app/lib/recipeFilters';
import { STORAGE_KEYS } from '@app/lib/storageKeys';

type FiltersWithSort = RecipeFilterSearchParams & { sort: RecipeSortOption };

export function useSearchFilters(initialFilters: RecipeFilterSearchParams) {
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
        setFilters((prev) => ({ ...prev, ...next, page: 1 }));
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
            page: 1,
        }));
    }, []);

    const handleSortChange = useCallback(
        (sort: RecipeSortOption) => {
            setSavedSort(sort);
            updateFilters({ sort });
        },
        [setSavedSort, updateFilters],
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
        activeFilterCount,
    };
}
