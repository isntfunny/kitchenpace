import { useMemo } from 'react';

import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';

import type { RecipeSearchMeta } from './useRecipeSearch';

export function usePagination(
    filters: RecipeFilterSearchParams,
    meta: RecipeSearchMeta | null,
    setFilters: React.Dispatch<React.SetStateAction<RecipeFilterSearchParams & { sort: string }>>,
) {
    const currentPage = filters.page ?? 1;
    const pageSize = meta?.limit ?? filters.limit ?? 30;
    const totalResults = meta?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = totalResults === 0 ? 0 : Math.min(currentPage * pageSize, totalResults);
    const canGoPrev = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    const pageNumbers = useMemo(() => {
        const windowSize = Math.min(5, totalPages);
        const half = Math.floor(windowSize / 2);
        let start = Math.max(1, currentPage - half);
        let end = start + windowSize - 1;
        if (end > totalPages) {
            end = totalPages;
            start = Math.max(1, end - windowSize + 1);
        }
        return Array.from({ length: windowSize }, (_, index) => start + index);
    }, [currentPage, totalPages]);

    const handlePageChange = (nextPage: number) => {
        const bounded = Math.min(Math.max(1, nextPage), totalPages);
        setFilters((prev) => ({ ...prev, page: bounded }));
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return {
        currentPage,
        totalResults,
        totalPages,
        startItem,
        endItem,
        canGoPrev,
        canGoNext,
        pageNumbers,
        handlePageChange,
    };
}
