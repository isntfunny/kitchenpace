'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { RecipeCardData } from '@app/app/actions/recipes';
import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';
import { buildRecipeFilterQuery } from '@app/lib/recipeFilters';
import type { RecipeSearchMeta } from '@app/lib/recipeSearchTypes';

export type {
    HistogramBucket,
    HistogramFacet,
    TermFacet,
    RecipeSearchFacets,
    RecipeSearchMeta,
} from '@app/lib/recipeSearchTypes';

export type RecipeSearchState = {
    data: RecipeCardData[];
    meta: RecipeSearchMeta | null;
    loading: boolean;
    error?: string;
};

export type InitialSearchData = {
    data: RecipeCardData[];
    meta: RecipeSearchMeta;
};

export type UseRecipeSearchOptions = {
    enabled?: boolean;
    debounceMs?: number;
    initialData?: InitialSearchData;
};

export function useRecipeSearch(
    filters: RecipeFilterSearchParams,
    options?: UseRecipeSearchOptions,
): RecipeSearchState {
    const { enabled = true, debounceMs = 0, initialData } = options ?? {};

    const [state, setState] = useState<RecipeSearchState>(() => ({
        data: initialData?.data ?? [],
        meta: initialData?.meta ?? null,
        loading: enabled && !initialData,
        error: undefined,
    }));

    const [debouncedFilters, setDebouncedFilters] = useState(filters);

    // Skip the very first fetch when initialData was provided for these exact filters
    const skipNextFetchRef = useRef(!!initialData);

    useEffect(() => {
        if (!enabled) {
            setDebouncedFilters(filters);
            return;
        }

        if (debounceMs > 0) {
            const timer = setTimeout(() => setDebouncedFilters(filters), debounceMs);
            return () => clearTimeout(timer);
        }

        setDebouncedFilters(filters);
    }, [filters, enabled, debounceMs]);

    const queryKey = useMemo(
        () => buildRecipeFilterQuery(debouncedFilters).toString(),
        [debouncedFilters],
    );

    useEffect(() => {
        if (!enabled) {
            setState((current) => ({ ...current, data: [], meta: null, loading: false }));
            return;
        }

        // Skip the initial fetch when server already provided this data
        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
            return;
        }

        const controller = new AbortController();

        async function fetchRecipes() {
            setState((current) => ({ ...current, loading: true, error: undefined }));
            try {
                const query = queryKey ? `?${queryKey}` : '';
                const response = await fetch(`/api/recipes/filter${query}`, {
                    signal: controller.signal,
                });
                if (!response.ok) {
                    throw new Error('Fehler beim Laden der Rezepte');
                }

                const payload: { data: RecipeCardData[]; meta: RecipeSearchMeta } =
                    await response.json();
                setState({ data: payload.data, meta: payload.meta, loading: false });
            } catch (error) {
                if ((error as Error).name === 'AbortError') return;
                setState((current) => ({
                    ...current,
                    loading: false,
                    error: (error as Error).message || 'Fehler beim Laden der Rezepte',
                }));
            }
        }

        fetchRecipes();

        return () => controller.abort();
    }, [queryKey, enabled]);

    return state;
}
