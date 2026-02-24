'use client';

import { useEffect, useMemo, useState } from 'react';

import type { RecipeCardData } from '@/app/actions/recipes';
import type { RecipeFilterSearchParams } from '@/lib/recipeFilters';
import { buildRecipeFilterQuery } from '@/lib/recipeFilters';

export type RecipeSearchMeta = {
    total: number;
    page: number;
    limit: number;
};

export type RecipeSearchResult = {
    data: RecipeCardData[];
    meta: RecipeSearchMeta | null;
    loading: boolean;
    error?: string;
};

export type UseRecipeSearchOptions = {
    enabled?: boolean;
    debounceMs?: number;
};

export function useRecipeSearch(
    filters: RecipeFilterSearchParams,
    options?: UseRecipeSearchOptions,
): RecipeSearchResult {
    const { enabled = true, debounceMs = 0 } = options ?? {};
    const [state, setState] = useState<RecipeSearchResult>({
        data: [],
        meta: null,
        loading: enabled,
        error: undefined,
    });
    const [debouncedFilters, setDebouncedFilters] = useState(filters);

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
            setState((current) => ({
                ...current,
                data: [],
                meta: null,
                loading: false,
            }));
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
