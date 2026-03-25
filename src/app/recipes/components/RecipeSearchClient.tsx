'use client';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { RecipeCard } from '@app/components/features/RecipeCard';
import { RecipeCardSkeleton } from '@app/components/features/RecipeCardSkeleton';
import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';
import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import type { CategoryOption } from '../actions';

import { FilterSidebar } from './FilterSidebar';
import { MobileFilterSheet } from './MobileFilterSheet';
import { SearchEmptyState } from './SearchEmptyState';
import { SearchHeader } from './SearchHeader';
import type { InitialSearchData } from './useRecipeSearch';
import { useRecipeSearch } from './useRecipeSearch';
import { useSearchFilters } from './useSearchFilters';
import { useStableFacets } from './useStableFacets';

type FilterOptions = {
    tags: string[];
    ingredients: string[];
    categories: CategoryOption[];
};

/* ── Breakpoints matching panda.config.ts ── */
const BP_XS = '(min-width: 540px)';
const BP_XL = '(min-width: 1280px)';

function useGridColumns(viewMode: 'grid' | 'list'): number {
    const [cols, setCols] = useState(() => {
        if (viewMode === 'list') return 1;
        if (typeof window === 'undefined') return 1;
        if (window.matchMedia(BP_XL).matches) return 3;
        if (window.matchMedia(BP_XS).matches) return 2;
        return 1;
    });

    useEffect(() => {
        if (viewMode === 'list') return;

        const mqXl = window.matchMedia(BP_XL);
        const mqXs = window.matchMedia(BP_XS);

        const update = () => {
            const next = mqXl.matches ? 3 : mqXs.matches ? 2 : 1;
            setCols((prev) => (prev === next ? prev : next));
        };

        mqXl.addEventListener('change', update);
        mqXs.addEventListener('change', update);
        return () => {
            mqXl.removeEventListener('change', update);
            mqXs.removeEventListener('change', update);
        };
    }, [viewMode]);

    return viewMode === 'list' ? 1 : cols;
}

const ROW_HEIGHT_GRID = 400;
const ROW_HEIGHT_LIST = 136;

const gridColsClass = grid({ columns: { base: 1, xs: 2, xl: 3 }, gap: '4' });
const listColsClass = grid({ columns: 1, gap: '2' });

type RecipeSearchClientProps = {
    initialFilters: RecipeFilterSearchParams;
    filterOptions: FilterOptions;
    initialData?: InitialSearchData;
    filterSets?: FilterSetWithRelations[];
    isLoggedIn?: boolean;
};

export const RecipeSearchClient: FC<RecipeSearchClientProps> = ({
    initialFilters,
    filterOptions,
    initialData,
    filterSets,
    isLoggedIn,
}) => {
    const {
        filters,
        queryInput,
        setQueryInput,
        viewMode,
        setViewMode,
        updateFilters,
        resetFilters,
        handleSortChange,
        handleFilterSetToggle,
        activeFilterCount,
    } = useSearchFilters(initialFilters, filterSets);

    const { data, meta, loading, refreshing, loadingMore, hasMore, fetchNextPage, error } =
        useRecipeSearch(filters, { initialData });
    const stableFacets = useStableFacets(meta?.facets, filters);

    const totalResults = meta?.total ?? 0;

    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const cols = useGridColumns(viewMode);

    const rows = useMemo(() => {
        const result: RecipeCardData[][] = [];
        for (let i = 0; i < data.length; i += cols) {
            result.push(data.slice(i, i + cols));
        }
        return result;
    }, [data, cols]);

    const estimateSize = viewMode === 'list' ? ROW_HEIGHT_LIST : ROW_HEIGHT_GRID;

    const gridWrapperRef = useRef<HTMLDivElement>(null);
    const [scrollMargin, setScrollMargin] = useState(0);

    // Re-measure grid offset on mount and after filter changes (chip bar may resize header)
    const measureScrollMargin = () => {
        if (gridWrapperRef.current) {
            const next = gridWrapperRef.current.offsetTop;
            setScrollMargin((prev) => (prev === next ? prev : next));
        }
    };

    useEffect(() => {
        measureScrollMargin();
    }, []);

    // Scroll to top of grid when filters change so virtualizer renders the new data
    const prevFiltersRef = useRef(filters);
    useEffect(() => {
        if (prevFiltersRef.current !== filters) {
            prevFiltersRef.current = filters;
            // Header height may have changed (active chip count, filter badges)
            measureScrollMargin();
            if (gridWrapperRef.current) {
                const top = gridWrapperRef.current.offsetTop - 20;
                if (window.scrollY > top) {
                    window.scrollTo({ top, behavior: 'instant' });
                }
            }
        }
    }, [filters]);

    const virtualizer = useWindowVirtualizer({
        count: rows.length,
        estimateSize: () => estimateSize,
        overscan: 5,
        scrollMargin,
    });

    // Fetch next page when last visible row is near the end
    const virtualItems = virtualizer.getVirtualItems();
    const lastVirtualIndex = virtualItems[virtualItems.length - 1]?.index ?? -1;

    useEffect(() => {
        if (lastVirtualIndex >= rows.length - 3 && hasMore && !loadingMore && !loading) {
            fetchNextPage();
        }
    }, [lastVirtualIndex, rows.length, hasMore, loadingMore, loading, fetchNextPage]);

    const showSkeletons = loading && data.length === 0;
    const isRefetching = loading && data.length > 0;

    const rowGridClass = viewMode === 'list' ? listColsClass : gridColsClass;

    return (
        <div
            className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', lg: '380px 1fr' },
                gap: '4',
                paddingTop: '3',
                paddingBottom: '8',
                position: 'relative',
            })}
        >
            <aside
                className={css({
                    display: { base: 'none', lg: 'block' },
                    position: 'sticky',
                    top: '100px',
                    alignSelf: 'flex-start',
                })}
            >
                <FilterSidebar
                    filters={filters}
                    options={filterOptions}
                    facets={stableFacets}
                    onFiltersChange={updateFilters}
                    loading={loading || refreshing}
                    filterSets={filterSets}
                    onFilterSetToggle={handleFilterSetToggle}
                />
            </aside>

            <section className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                <SearchHeader
                    filters={filters}
                    queryInput={queryInput}
                    viewMode={viewMode}
                    activeFilterCount={activeFilterCount}
                    loading={loading}
                    totalResults={totalResults}
                    onQueryChange={setQueryInput}
                    onClearQuery={() => {
                        setQueryInput('');
                        updateFilters({ query: undefined });
                    }}
                    onSortChange={handleSortChange}
                    onViewModeChange={setViewMode}
                    onFiltersChange={updateFilters}
                    onReset={resetFilters}
                    isLoggedIn={isLoggedIn}
                />

                {error ? (
                    <p className={css({ fontSize: 'sm', color: 'text-muted' })}>{error}</p>
                ) : !loading && data.length === 0 ? (
                    <SearchEmptyState hasFilters={activeFilterCount > 0} onReset={resetFilters} />
                ) : showSkeletons ? (
                    <div className={rowGridClass}>
                        {Array.from({ length: 6 }).map((_, index) => (
                            <RecipeCardSkeleton
                                key={index}
                                variant={viewMode === 'list' ? 'list' : 'default'}
                            />
                        ))}
                    </div>
                ) : (
                    <>
                        <div
                            ref={gridWrapperRef}
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                                opacity: isRefetching ? 0.55 : 1,
                                transition: 'opacity 150ms ease',
                                pointerEvents: isRefetching ? 'none' : undefined,
                            }}
                        >
                            {virtualItems.map((virtualRow) => {
                                const row = rows[virtualRow.index];
                                return (
                                    <div
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                                        }}
                                    >
                                        <div className={rowGridClass}>
                                            {row.map((recipe) => (
                                                <RecipeCard
                                                    key={recipe.id}
                                                    recipe={recipe}
                                                    variant={
                                                        viewMode === 'list' ? 'list' : 'default'
                                                    }
                                                    categoryOnImage
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {loadingMore && (
                            <div
                                className={css({
                                    display: 'flex',
                                    justifyContent: 'center',
                                    py: '4',
                                })}
                            >
                                <Loader2
                                    size={24}
                                    className={css({
                                        animation: 'spin 1s linear infinite',
                                        color: 'text-muted',
                                    })}
                                />
                            </div>
                        )}
                    </>
                )}
            </section>

            <MobileFilterSheet
                open={showMobileFilters}
                onOpen={() => setShowMobileFilters(true)}
                onClose={() => setShowMobileFilters(false)}
                filters={filters}
                options={filterOptions}
                facets={stableFacets}
                loading={loading || refreshing}
                onFiltersChange={updateFilters}
                onReset={resetFilters}
                filterSets={filterSets}
                onFilterSetToggle={handleFilterSetToggle}
            />
        </div>
    );
};
