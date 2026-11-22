import { useEffect, useRef } from 'react';

import { buildRecipeFilterQuery, parseRecipeFilterParams } from '@shared/recipe-filters';
import type { RecipeFilterSearchParams } from '@shared/recipe-filters';

import { historyModeFor } from './filter-state';
import type { RecipeFilterState } from './useRecipeFilterState';

/**
 * Mirrors the filter state of the recipe page into the URL (KUC-126): discrete changes push
 * a history entry, typing and restores replace it. Back/forward and new SSR filters
 * (navigation to /recipes?…) restore the state. Only `/recipes` uses this.
 */
export function useFilterUrlSync(
    state: RecipeFilterState,
    { pathname, initialFilters }: { pathname: string; initialFilters: RecipeFilterSearchParams },
) {
    const { filters, lastOrigin, replaceFilters } = state;

    const isFirstRef = useRef(true);
    useEffect(() => {
        const params = buildRecipeFilterQuery(filters).toString();
        const next = params ? `${pathname}?${params}` : pathname;
        const mode = historyModeFor(lastOrigin, isFirstRef.current);
        isFirstRef.current = false;
        if (mode === 'replace') window.history.replaceState(null, '', next);
        else window.history.pushState(null, '', next);
        // lastOrigin belongs to the same render as filters; only a filter change writes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, pathname]);

    // Browser back/forward: the URL is already right, restore the state from it
    const replaceRef = useRef(replaceFilters);
    replaceRef.current = replaceFilters;
    useEffect(() => {
        const onPopState = () =>
            replaceRef.current(
                parseRecipeFilterParams(new URLSearchParams(window.location.search)),
                'restore',
            );
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    // New SSR filters (client navigation to /recipes?…)
    const prevInitialRef = useRef(initialFilters);
    useEffect(() => {
        if (prevInitialRef.current === initialFilters) return;
        prevInitialRef.current = initialFilters;
        replaceRef.current(initialFilters, 'restore');
    }, [initialFilters]);
}
