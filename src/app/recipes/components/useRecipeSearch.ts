'use client';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { RecipeCardData } from '@app/app/actions/recipes';
import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';
import { buildRecipeFilterQuery } from '@app/lib/recipeFilters';
import { appendRecipeSearchContext, type RecipeSearchContext } from '@app/lib/recipeSearchQuery';
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
    /** True when a background refetch is in progress (cache-hit scenario). */
    refreshing: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    fetchNextPage: () => void;
    error?: string;
};

/**
 * Build a stable query key from filters, excluding `page` (managed by react-query).
 */
function searchParams(
    filters: RecipeFilterSearchParams,
    page: number,
    context?: RecipeSearchContext,
): URLSearchParams {
    const params = buildRecipeFilterQuery({ ...filters, page });
    appendRecipeSearchContext(params, context);
    return params;
}

function filterFingerprint(
    filters: RecipeFilterSearchParams,
    context?: RecipeSearchContext,
): string {
    return searchParams(filters, 1, context).toString();
}

async function fetchPage(
    filters: RecipeFilterSearchParams,
    page: number,
    context: RecipeSearchContext | undefined,
    signal?: AbortSignal,
): Promise<SearchPage> {
    const query = searchParams(filters, page, context).toString();
    const url = query ? `/api/recipes/filter?${query}` : '/api/recipes/filter';
    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error('Fehler beim Laden der Rezepte');
    }

    return response.json();
}

export function useRecipeSearch(
    filters: RecipeFilterSearchParams,
    options?: {
        initialData?: InitialSearchData;
        /** Hidden base filter (week selection dialog, KUC-126); part of the query key */
        context?: RecipeSearchContext;
        /** Keep showing the previous results while a changed query loads (dialog picks) */
        keepPrevious?: boolean;
    },
): RecipeSearchState {
    const { initialData, context, keepPrevious = false } = options ?? {};
    const fp = useMemo(() => filterFingerprint(filters, context), [filters, context]);

    // Capture SSR data once on mount. React Query only consumes initialData when
    // the cache is empty for a given key, and refetches in the background (staleTime=0).
    const [initialFp] = useState(fp);
    const [ssrSnapshot] = useState(() =>
        initialData ? { pages: [initialData], pageParams: [1] } : undefined,
    );

    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending,
        isFetching,
        error,
    } = useInfiniteQuery<SearchPage>({
        queryKey: ['recipes', fp],
        // Pass filters directly via closure over `fp` — NOT via a ref that might
        // be stale when React Query fires the queryFn before passive effects run.
        queryFn: ({ pageParam, signal }) =>
            fetchPage(filters, pageParam as number, context, signal),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, p) => sum + p.data.length, 0);
            return loaded < lastPage.meta.total ? allPages.length + 1 : undefined;
        },
        initialData: fp === initialFp ? ssrSnapshot : undefined,
        placeholderData: keepPrevious ? keepPreviousData : undefined,
    });

    const data = useMemo(() => infiniteData?.pages.flatMap((p) => p.data) ?? [], [infiniteData]);

    const meta = infiniteData?.pages.at(-1)?.meta ?? null;

    return {
        data,
        meta,
        loading: isPending,
        refreshing: isFetching && !isPending && !isFetchingNextPage,
        loadingMore: isFetchingNextPage,
        hasMore: !!hasNextPage,
        fetchNextPage,
        error: error?.message,
    };
}
