'use client';

import { Loader2 } from 'lucide-react';
import { type ReactNode, type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { RecipeCard, type RecipeCardSelection } from '@app/components/features/RecipeCard';
import { RecipeCardSkeleton } from '@app/components/features/RecipeCardSkeleton';
import { useLocalStorage } from '@app/hooks/useLocalStorage';
import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';
import type { Season } from '@app/lib/fits-now/labels';
import { STORAGE_KEYS } from '@app/lib/storageKeys';
import type { ThemeChip } from '@shared/theme-clusters/release';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import type { CategoryOption } from '../actions';

import { FilterSetChipBar } from './FilterSetChipBar';
import { FilterSidebar, type FilterSectionId } from './FilterSidebar';
import { useContainerColumns } from './grid-columns';
import { MobileFilterSheet } from './MobileFilterSheet';
import { SearchEmptyState } from './SearchEmptyState';
import { SearchHeader, type SortChoice } from './SearchHeader';
import type { RecipeFilterState } from './useRecipeFilterState';
import type { RecipeSearchState } from './useRecipeSearch';
import { useStableFacets } from './useStableFacets';
import { VirtualRecipeRows } from './VirtualRecipeRows';

export type FilterOptions = {
    tags: string[];
    ingredients: string[];
    categories: CategoryOption[];
};

export type RecipeSearchViewProps = {
    state: RecipeFilterState;
    results: RecipeSearchState;
    filterOptions: FilterOptions;
    filterSets?: FilterSetWithRelations[];
    themes?: ThemeChip[];
    currentSeason?: Season;
    isLoggedIn: boolean;
    title?: string;
    titleAs?: 'h1' | 'h2';
    sortOptions?: SortChoice[];
    headerExtra?: ReactNode;
    hiddenSections?: FilterSectionId[];
    /** Scroll container; without it the window scrolls */
    scrollElement?: RefObject<HTMLElement | null>;
    /** Turns cards into selectable cards (week selection dialog) */
    renderCardSelection?: (recipe: RecipeCardData) => RecipeCardSelection | undefined;
    /** Cards shown before the results, not virtualized (the dialog's picks) */
    leading?: RecipeCardData[];
    /** Content after the results, e.g. the "Probier auch mal" row */
    listFooter?: ReactNode;
    /** Top offset of the sticky sidebar */
    sidebarTop?: string;
};

const ROW_HEIGHT_GRID = 400;
const ROW_HEIGHT_LIST = 136;

const gridClass = (cols: number) => (cols === 3 ? grid3 : cols === 2 ? grid2 : grid1);
const grid1 = grid({ columns: 1, gap: '4' });
const grid2 = grid({ columns: 2, gap: '4' });
const grid3 = grid({ columns: 3, gap: '4' });
const listColsClass = grid({ columns: 1, gap: '2' });

/**
 * The recipe search UI (header, filter sets, sidebar, results) driven entirely by props.
 * Used by the recipe page and the week selection dialog (KUC-126).
 */
export function RecipeSearchView({
    state,
    results,
    filterOptions,
    filterSets,
    themes,
    currentSeason,
    isLoggedIn,
    title,
    titleAs,
    sortOptions,
    headerExtra,
    hiddenSections,
    scrollElement,
    renderCardSelection,
    leading = [],
    listFooter,
    sidebarTop = '100px',
}: RecipeSearchViewProps) {
    const {
        filters,
        queryInput,
        setQueryInput,
        updateFilters,
        resetFilters,
        handleSortChange,
        handleFilterSetToggle,
        handleThemeToggle,
        activeFilterCount,
    } = state;
    const { data, meta, loading, refreshing, loadingMore, hasMore, fetchNextPage, error } = results;
    const stableFacets = useStableFacets(meta?.facets, filters);
    const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>(
        STORAGE_KEYS.searchViewMode,
        'grid',
    );
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const listRef = useRef<HTMLElement>(null);
    const cols = useContainerColumns(listRef, viewMode);

    const rows = useMemo(() => {
        const result: RecipeCardData[][] = [];
        for (let i = 0; i < data.length; i += cols) result.push(data.slice(i, i + cols));
        return result;
    }, [data, cols]);

    const variant = viewMode === 'list' ? 'list' : 'default';
    const rowClass = viewMode === 'list' ? listColsClass : gridClass(cols);
    const showSkeletons = loading && data.length === 0;

    const onNearEnd = useCallback(() => {
        if (hasMore && !loadingMore && !loading) fetchNextPage();
    }, [hasMore, loadingMore, loading, fetchNextPage]);

    const card = (recipe: RecipeCardData) => (
        <RecipeCard
            key={recipe.id}
            recipe={recipe}
            variant={variant}
            categoryOnImage
            selection={renderCardSelection?.(recipe)}
        />
    );

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
                    alignSelf: 'flex-start',
                })}
                style={{ top: sidebarTop }}
            >
                <FilterSidebar
                    filters={filters}
                    options={filterOptions}
                    facets={stableFacets}
                    onFiltersChange={updateFilters}
                    loading={loading || refreshing}
                    hiddenSections={hiddenSections}
                />
            </aside>

            <section
                ref={listRef}
                className={css({ display: 'flex', flexDirection: 'column', gap: '4', minW: 0 })}
            >
                <SearchHeader
                    filters={filters}
                    queryInput={queryInput}
                    viewMode={viewMode}
                    activeFilterCount={activeFilterCount}
                    loading={loading}
                    totalResults={meta?.total ?? 0}
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
                    title={title}
                    titleAs={titleAs}
                    sortOptions={sortOptions}
                    headerExtra={headerExtra}
                />

                <FilterSetChipBar
                    filterSets={filterSets ?? []}
                    activeFilterSetId={filters.filterSetId}
                    currentSeason={currentSeason}
                    onToggle={handleFilterSetToggle}
                    themes={themes}
                    filters={filters}
                    onThemeToggle={handleThemeToggle}
                />

                {leading.length > 0 && <div className={rowClass}>{leading.map(card)}</div>}

                {error ? (
                    <p className={css({ fontSize: 'sm', color: 'text-muted' })}>{error}</p>
                ) : !loading && data.length === 0 ? (
                    <SearchEmptyState hasFilters={activeFilterCount > 0} onReset={resetFilters} />
                ) : showSkeletons ? (
                    <div className={rowClass}>
                        {Array.from({ length: 6 }).map((_, index) => (
                            <RecipeCardSkeleton key={index} variant={variant} />
                        ))}
                    </div>
                ) : (
                    <>
                        <VirtualRecipeRows
                            rows={rows}
                            estimateSize={viewMode === 'list' ? ROW_HEIGHT_LIST : ROW_HEIGHT_GRID}
                            scrollElement={scrollElement}
                            renderRow={(row) => <div className={rowClass}>{row.map(card)}</div>}
                            onNearEnd={onNearEnd}
                            dimmed={loading && data.length > 0}
                            resetKey={filters}
                        />
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

                {listFooter}
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
                hiddenSections={hiddenSections}
            />
        </div>
    );
}
