'use client';

import { useState, useEffect } from 'react';

import { searchIngredients } from './actions';
import type { IngredientSearchResult } from './RecipeForm/data';

/**
 * Debounced ingredient search hook (300ms).
 * Returns empty array immediately when query is shorter than 2 chars.
 */
export function useIngredientSearch(query: string): IngredientSearchResult[] {
    const [results, setResults] = useState<IngredientSearchResult[]>([]);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            const r = await searchIngredients(trimmed);
            setResults(r);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    return results;
}
