'use client';

import { motion } from 'motion/react';
import { type FC, useState } from 'react';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { RecipeCard } from '@app/components/features/RecipeCard';
import { RecipeCardSkeleton } from '@app/components/features/RecipeCardSkeleton';
import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';

import { css } from 'styled-system/css';

import type { CategoryOption } from '../actions';

import { FilterSidebar } from './FilterSidebar';
import { MobileFilterSheet } from './MobileFilterSheet';
import { SearchEmptyState } from './SearchEmptyState';
import { SearchHeader } from './SearchHeader';
import { SearchPagination } from './SearchPagination';
import { usePagination } from './usePagination';
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
};

export const RecipeSearchClient: FC<RecipeSearchClientProps> = ({
    initialFilters,
    filterOptions,
    initialData,
}) => {
    const {
        filters,
        setFilters,
        queryInput,
        setQueryInput,
        viewMode,
        setViewMode,
        updateFilters,
        resetFilters,
        handleSortChange,
        activeFilterCount,
    } = useSearchFilters(initialFilters);

    const { data, meta, loading, error } = useRecipeSearch(filters, { initialData });
    const stableFacets = useStableFacets(meta?.facets, filters);

    const {
        currentPage,
        totalResults,
        totalPages,
        startItem,
        endItem,
        canGoPrev,
        canGoNext,
        pageNumbers,
        handlePageChange,
    } = usePagination(filters, meta, setFilters);

    const [showMobileFilters, setShowMobileFilters] = useState(false);

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

                        <SearchPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalResults={totalResults}
                            startItem={startItem}
                            endItem={endItem}
                            canGoPrev={canGoPrev}
                            canGoNext={canGoNext}
                            pageNumbers={pageNumbers}
                            onPageChange={handlePageChange}
                        />
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
            />
        </div>
    );
};
