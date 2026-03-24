'use client';

import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { type FC, useEffect, useRef, useState } from 'react';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { RecipeCard } from '@app/components/features/RecipeCard';
import { RecipeCardSkeleton } from '@app/components/features/RecipeCardSkeleton';
import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';
import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';

import { css } from 'styled-system/css';

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

    const { data, meta, loading, loadingMore, hasMore, fetchNextPage, error } = useRecipeSearch(
        filters,
        { initialData },
    );
    const stableFacets = useStableFacets(meta?.facets, filters);

    const totalResults = meta?.total ?? 0;

    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Infinite scroll sentinel
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    fetchNextPage();
                }
            },
            { rootMargin: '200px' },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading, fetchNextPage]);

    // Initial load (no data yet): show skeletons
    // Refetch (have data, loading new): dim current results — no skeleton flash
    const showSkeletons = loading && data.length === 0;
    const isRefetching = loading && data.length > 0;

    const gridClass = css({
        display: 'grid',
        gridTemplateColumns:
            viewMode === 'list'
                ? '1fr'
                : {
                      base: '1fr',
                      xs: 'repeat(2, minmax(0, 1fr))',
                      xl: 'repeat(3, minmax(0, 1fr))',
                  },
        gap: viewMode === 'list' ? '2' : '4',
    });

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
                    loading={loading}
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
                ) : (
                    <>
                        <div
                            className={gridClass}
                            style={{
                                opacity: isRefetching ? 0.55 : 1,
                                transition: 'opacity 150ms ease',
                                pointerEvents: isRefetching ? 'none' : undefined,
                            }}
                        >
                            {showSkeletons
                                ? Array.from({ length: 6 }).map((_, index) => (
                                      <RecipeCardSkeleton
                                          key={index}
                                          variant={viewMode === 'list' ? 'list' : 'default'}
                                      />
                                  ))
                                : data.map((recipe: RecipeCardData, index: number) => (
                                      <motion.div
                                          key={recipe.id}
                                          initial={{ opacity: 0, y: 8 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{
                                              duration: 0.2,
                                              delay: Math.min(index, 4) * 0.03,
                                          }}
                                      >
                                          <RecipeCard
                                              recipe={recipe}
                                              variant={viewMode === 'list' ? 'list' : 'default'}
                                              categoryOnImage
                                          />
                                      </motion.div>
                                  ))}
                        </div>

                        {/* Infinite scroll sentinel + loading indicator */}
                        <div ref={sentinelRef} className={css({ minHeight: '1px' })} />
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
                loading={loading}
                onFiltersChange={updateFilters}
                onReset={resetFilters}
                filterSets={filterSets}
                onFilterSetToggle={handleFilterSetToggle}
            />
        </div>
    );
};
