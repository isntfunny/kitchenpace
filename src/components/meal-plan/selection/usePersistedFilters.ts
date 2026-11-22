'use client';

import { useEffect, useState } from 'react';

import { countActiveFilters, type FiltersWithSort } from '@app/app/recipes/components/filter-state';
import { STORAGE_KEYS } from '@app/lib/storageKeys';
import {
    buildRecipeFilterQuery,
    parseRecipeFilterParams,
    type RecipeFilterSearchParams,
} from '@shared/recipe-filters';

const KEY = STORAGE_KEYS.weekSelectionFilters;

/** Stored filters of the week selection, normalised like URL filters; the sort is not kept. */
function readStored(): RecipeFilterSearchParams {
    try {
        const stored = localStorage.getItem(KEY);
        if (!stored) return {};
        const { sort: _sort, ...filters } = parseRecipeFilterParams(new URLSearchParams(stored));
        return filters;
    } catch {
        return {};
    }
}

/**
 * Filters of the week selection dialog survive closing it (KUC-126). Read once on mount
 * (the dialog body only renders in the browser); every change is written, and with no
 * active filter left ("Zurücksetzen") the stored state is removed.
 */
export function useStoredFilters(): RecipeFilterSearchParams {
    const [initialFilters] = useState(readStored);
    return initialFilters;
}

/** Writes the filters whenever they change. */
export function usePersistedFilters(filters: FiltersWithSort) {
    useEffect(() => {
        try {
            if (countActiveFilters(filters) === 0) {
                localStorage.removeItem(KEY);
                return;
            }
            const { sort: _sort, ...rest } = filters;
            localStorage.setItem(KEY, buildRecipeFilterQuery(rest).toString());
        } catch {
            // localStorage unavailable: the filters just don't survive closing
        }
    }, [filters]);
}
