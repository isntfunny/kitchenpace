'use client';

import { useEffect, useState } from 'react';

export type MultiSearchRecipe = {
    id: string;
    slug: string;
    title: string;
    category: string;
    totalTime: number;
    rating: number;
    imageKey: string | null;
    description: string;
};

export type SuggestItem = { name: string; count: number };

export type MultiSearchResult = {
    recipes: MultiSearchRecipe[];
    ingredients: SuggestItem[];
    tags: SuggestItem[];
    loading: boolean;
};

type Options = {
    enabled?: boolean;
    debounceMs?: number;
};

export function useMultiSearch(query: string, options?: Options): MultiSearchResult {
    const { enabled = true, debounceMs = 200 } = options ?? {};
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const [state, setState] = useState<MultiSearchResult>({
        recipes: [],
        ingredients: [],
        tags: [],
        loading: false,
    });

    useEffect(() => {
        if (!enabled) {
            setDebouncedQuery(query);
            return;
        }
        if (debounceMs > 0) {
            const timer = setTimeout(() => setDebouncedQuery(query), debounceMs);
            return () => clearTimeout(timer);
        }
        setDebouncedQuery(query);
    }, [query, enabled, debounceMs]);

    useEffect(() => {
        if (!enabled || debouncedQuery.length < 2) {
            setState({ recipes: [], ingredients: [], tags: [], loading: false });
            return;
        }

        const controller = new AbortController();

        async function fetchResults() {
            setState((current) => ({ ...current, loading: true }));
            try {
                const response = await fetch(
                    `/api/search/multi?q=${encodeURIComponent(debouncedQuery)}`,
                    { signal: controller.signal },
                );
                if (!response.ok) throw new Error('Search failed');

                const data: {
                    recipes: MultiSearchRecipe[];
                    ingredients: SuggestItem[];
                    tags: SuggestItem[];
                } = await response.json();

                setState({
                    recipes: data.recipes,
                    ingredients: data.ingredients,
                    tags: data.tags,
                    loading: false,
                });
            } catch (error) {
                if ((error as Error).name === 'AbortError') return;
                setState({ recipes: [], ingredients: [], tags: [], loading: false });
            }
        }

        fetchResults();
        return () => controller.abort();
    }, [debouncedQuery, enabled]);

    return state;
}
