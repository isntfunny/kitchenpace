import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLocalStorage } from '@app/hooks/useLocalStorage';
import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';
import { resolveEffectiveSort } from '@app/lib/recipes/taste-ranking';
import type { RecipeFilterSearchParams, RecipeSortOption } from '@shared/recipe-filters';
import type { ThemeChip } from '@shared/theme-clusters/release';

import {
    clearedFilters,
    countActiveFilters,
    toggleFilterSet,
    toggleTheme,
    type FilterChangeOrigin,
    type FiltersWithSort,
} from './filter-state';

export type FilterStateOptions = {
    initialFilters: RecipeFilterSearchParams;
    filterSets?: FilterSetWithRelations[];
    isLoggedIn: boolean;
    /** Sort when neither initialFilters nor the remembered sort set one */
    defaultSort?: RecipeSortOption;
    /** localStorage key of the remembered sort; undefined = not remembered */
    sortStorageKey?: string;
    /** true when the URL sets ?sort=: the remembered sort must not override it */
    sortLocked?: boolean;
};

const UNUSED_SORT_KEY = 'kitchenpace-unused-sort';

/**
 * Filter state of a recipe search without any URL handling (KUC-126). The recipe page
 * adds `useFilterUrlSync`; the week selection dialog persists the filters itself.
 */
export function useRecipeFilterState({
    initialFilters,
    filterSets,
    isLoggedIn,
    defaultSort = 'rating',
    sortStorageKey,
    sortLocked = false,
}: FilterStateOptions) {
    // Hooks must not be conditional: without a key, a dummy entry is read and never written
    const [savedSort, setSavedSort] = useLocalStorage<RecipeSortOption>(
        sortStorageKey ?? UNUSED_SORT_KEY,
        defaultSort,
    );

    // "Passt zu dir" is for logged-in users only: guests fall back to popular (no error)
    const resolveSort = useCallback(
        (sort: RecipeSortOption | undefined) =>
            resolveEffectiveSort(sort ?? defaultSort, { isLoggedIn }),
        [defaultSort, isLoggedIn],
    );

    const [filters, setFilters] = useState<FiltersWithSort>(() => ({
        ...initialFilters,
        sort: resolveSort(initialFilters.sort),
    }));
    const [queryInput, setQueryInput] = useState(initialFilters.query ?? '');
    const [lastOrigin, setLastOrigin] = useState<FilterChangeOrigin>('restore');

    const change = useCallback(
        (origin: FilterChangeOrigin, update: (prev: FiltersWithSort) => FiltersWithSort) => {
            setLastOrigin(origin);
            setFilters(update);
        },
        [],
    );

    // Keep the input in sync when the query changes programmatically (reset, restore)
    const prevFilterQuery = useRef(filters.query);
    useEffect(() => {
        if (prevFilterQuery.current === filters.query) return;
        prevFilterQuery.current = filters.query;
        setQueryInput(filters.query ?? '');
    }, [filters.query]);

    // Debounced typing → filters
    useEffect(() => {
        const timer = setTimeout(() => {
            const nextQuery = queryInput.trim().length > 0 ? queryInput : undefined;
            if (nextQuery === filters.query) return;
            change('typing', (prev) => ({ ...prev, query: nextQuery }));
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-debounce when the user types
    }, [queryInput]);

    // Restore the remembered sort once localStorage is read, unless the URL set one or
    // the user already picked one
    const sortChosenRef = useRef(false);
    useEffect(() => {
        if (!sortStorageKey || sortLocked || sortChosenRef.current) return;
        const restored = resolveSort(savedSort);
        // Restoring is no history step; the origin only matters when the filters change
        setLastOrigin('restore');
        setFilters((prev) => (prev.sort === restored ? prev : { ...prev, sort: restored }));
    }, [savedSort, sortStorageKey, sortLocked, resolveSort]);

    const updateFilters = useCallback(
        (next: Partial<RecipeFilterSearchParams>) =>
            change('user', (prev) => ({ ...prev, ...next })),
        [change],
    );

    /** Replaces the whole state, e.g. from the URL (back/forward) or stored filters. */
    const replaceFilters = useCallback(
        (next: RecipeFilterSearchParams, origin: FilterChangeOrigin) => {
            change(origin, () => ({ ...next, sort: resolveSort(next.sort ?? savedSort) }));
            setQueryInput(next.query ?? '');
        },
        [change, resolveSort, savedSort],
    );

    const resetFilters = useCallback(() => change('user', clearedFilters), [change]);

    const handleSortChange = useCallback(
        (sort: RecipeSortOption) => {
            sortChosenRef.current = true;
            if (sortStorageKey) setSavedSort(sort);
            change('user', (prev) => ({ ...prev, sort }));
        },
        [change, setSavedSort, sortStorageKey],
    );

    const handleFilterSetToggle = useCallback(
        (filterSet: FilterSetWithRelations) =>
            change('user', (prev) => toggleFilterSet(prev, filterSet, filterSets)),
        [change, filterSets],
    );

    const handleThemeToggle = useCallback(
        (theme: ThemeChip) => change('user', (prev) => toggleTheme(prev, theme)),
        [change],
    );

    const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

    return {
        filters,
        queryInput,
        setQueryInput,
        lastOrigin,
        updateFilters,
        replaceFilters,
        resetFilters,
        handleSortChange,
        handleFilterSetToggle,
        handleThemeToggle,
        activeFilterCount,
    };
}

export type RecipeFilterState = ReturnType<typeof useRecipeFilterState>;
