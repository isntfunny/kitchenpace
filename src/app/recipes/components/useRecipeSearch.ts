'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
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

type SearchPage = {
    data: RecipeCardData[];
    meta: RecipeSearchMeta;
};

export type InitialSearchData = SearchPage;

export type RecipeSearchState = {
    data: RecipeCardData[];
    meta: RecipeSearchMeta | null;
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    fetchNextPage: () => void;
    error?: string;
};

/**
 * Build a stable query key from filters, excluding `page` (managed by react-query).
 */
function filterFingerprint(filters: RecipeFilterSearchParams): string {
    return buildRecipeFilterQuery({ ...filters, page: 1 }).toString();
}

async function fetchPage(
    filters: RecipeFilterSearchParams,
    page: number,
    signal?: AbortSignal,
): Promise<SearchPage> {
    const params = buildRecipeFilterQuery({ ...filters, page });
    const query = params.toString();
    const url = query ? `/api/recipes/filter?${query}` : '/api/recipes/filter';
    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error('Fehler beim Laden der Rezepte');
    }

    return response.json();
}

export function useRecipeSearch(
    filters: RecipeFilterSearchParams,
    options?: { initialData?: InitialSearchData },
): RecipeSearchState {
    const { initialData } = options ?? {};
    const fp = useMemo(() => filterFingerprint(filters), [filters]);

    // Only seed initialData for the very first query key (SSR match).
    // Once filters change, react-query must fetch fresh data.
    const [initialFp] = useState(fp);
    const ssrData =
        initialData && fp === initialFp ? { pages: [initialData], pageParams: [1] } : undefined;

    // Keep a ref to the latest filters so queryFn never captures a stale closure
    const filtersRef = useRef(filters);
    useEffect(() => {
        filtersRef.current = filters;
    });

    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending,
        error,
    } = useInfiniteQuery<SearchPage>({
        queryKey: ['recipes', fp],
        queryFn: ({ pageParam, signal }) =>
            fetchPage(filtersRef.current, pageParam as number, signal),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, p) => sum + p.data.length, 0);
            return loaded < lastPage.meta.total ? allPages.length + 1 : undefined;
        },
        initialData: ssrData,
    });

    const data = useMemo(() => infiniteData?.pages.flatMap((p) => p.data) ?? [], [infiniteData]);

    const meta = infiniteData?.pages.at(-1)?.meta ?? null;

    return {
        data,
        meta,
        loading: isPending,
        loadingMore: isFetchingNextPage,
        hasMore: !!hasNextPage,
        fetchNextPage,
        error: error?.message,
    };
}
