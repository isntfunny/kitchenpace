'use client';

import { useCallback, useMemo, useRef, useState, useEffect, useTransition } from 'react';

import { searchIngredients, type IngredientSearchResponse } from './actions';

const EMPTY: IngredientSearchResponse = {
    results: [],
    parsed: { name: '', amount: '', unit: null },
    bestMatch: null,
    matchType: 'none',
};

export type IngredientSearchState = IngredientSearchResponse & {
    isLoading: boolean;
    /** Cancel pending debounce timer (e.g. before firing an immediate search on Enter). */
    cancelDebounce: () => void;
};

/**
 * Debounced ingredient search hook (300ms).
 * Returns search results, parsed input, best match, loading state, and cancel function.
 */
export function useIngredientSearch(query: string): IngredientSearchState {
    const [response, setResponse] = useState<IngredientSearchResponse>(EMPTY);
    const [isPending, startTransition] = useTransition();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const trimmed = useMemo(() => query.trim(), [query]);
    const tooShort = trimmed.length < 2;

    useEffect(() => {
        if (tooShort) return;

        timerRef.current = setTimeout(() => {
            startTransition(async () => {
                const r = await searchIngredients(trimmed);
                setResponse(r);
            });
        }, 150);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [trimmed, tooShort]);

    const cancelDebounce = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    if (tooShort) return { ...EMPTY, isLoading: false, cancelDebounce };

    // If response is from a previous query, treat as loading with empty results
    const isStale =
        response.parsed.name !== '' &&
        !trimmed.toLowerCase().includes(response.parsed.name.toLowerCase());
    const current = isStale ? EMPTY : response;

    return { ...current, isLoading: isPending || isStale, cancelDebounce };
}
