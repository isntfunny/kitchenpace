'use client';

import { SlidersHorizontal, Search, X, LayoutGrid, List, UtensilsCrossed } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CategoryOption } from '@app/app/actions/filters';
import type { RecipeCardData } from '@app/app/actions/recipes';
import { Button } from '@app/components/atoms/Button';
import { RecipeCard } from '@app/components/features/RecipeCard';
import { RecipeCardSkeleton } from '@app/components/features/RecipeCardSkeleton';
import { useLocalStorage } from '@app/hooks/useLocalStorage';
import { PALETTE } from '@app/lib/palette';
import { buildRecipeFilterQuery, MULTI_VALUE_KEYS, NUMBER_KEYS } from '@app/lib/recipeFilters';
import type { RecipeFilterSearchParams, RecipeSortOption } from '@app/lib/recipeFilters';
import { STORAGE_KEYS } from '@app/lib/storageKeys';
import { css } from 'styled-system/css';

import { ActiveFilters } from './ActiveFilters';
import { FilterSidebar } from './FilterSidebar';
import type { InitialSearchData } from './useRecipeSearch';
import { useRecipeSearch } from './useRecipeSearch';

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

const ARRAY_FILTER_KEYS = MULTI_VALUE_KEYS;
const NUMERIC_FILTER_KEYS = NUMBER_KEYS;
const buildSliderSignature = (filters: RecipeFilterSearchParams) =>
    JSON.stringify([
        filters.minTotalTime ?? null,
        filters.maxTotalTime ?? null,
        filters.minPrepTime ?? null,
        filters.maxPrepTime ?? null,
        filters.minCookTime ?? null,
        filters.maxCookTime ?? null,
        filters.minRating ?? null,
        filters.minCookCount ?? null,
    ]);

const buildNonSliderSignature = (filters: RecipeFilterSearchParams) =>
    JSON.stringify({
        query: filters.query ?? null,
        tags: filters.tags ?? [],
        mealTypes: filters.mealTypes ?? [],
        ingredients: filters.ingredients ?? [],
        excludeIngredients: filters.excludeIngredients ?? [],
        difficulty: filters.difficulty ?? [],
        timeOfDay: filters.timeOfDay ?? [],
        filterMode: filters.filterMode ?? 'and',
    });

export const RecipeSearchClient: FC<RecipeSearchClientProps> = ({
    initialFilters,
    filterOptions,
    initialData,
}) => {
    const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>(STORAGE_KEYS.searchViewMode, 'grid');
    const [savedSort, setSavedSort] = useLocalStorage<RecipeSortOption>(STORAGE_KEYS.searchSort, 'rating');
    const [filters, setFilters] = useState({
        ...initialFilters,
        sort: initialFilters.sort ?? savedSort,
    });
    const [queryInput, setQueryInput] = useState(initialFilters.query ?? '');
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const { data, meta, loading, error } = useRecipeSearch(filters, { initialData });
    const facets = meta?.facets;
    const pathname = usePathname();
    const sliderSignature = useMemo(() => buildSliderSignature(filters), [filters]);

    const nonSliderSignature = useMemo(() => buildNonSliderSignature(filters), [filters]);

    const prevSliderSignatureRef = useRef(sliderSignature);
    const prevNonSliderSignatureRef = useRef(nonSliderSignature);
    const prevFiltersRef = useRef(filters);
    const [stableFacets, setStableFacets] = useState(() => facets);
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
        setFilters((prev) => ({
            ...prev,
            page: bounded,
        }));
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const updateFilters = useCallback((next: Partial<RecipeFilterSearchParams>) => {
        setFilters((prev) => ({
            ...prev,
            ...next,
            page: 1,
        }));
    }, []);

    const resetFilters = () => {
        setFilters((prev) => ({
            ...prev,
            query: undefined,
            tags: [],
            mealTypes: [],
            ingredients: [],
            excludeIngredients: [],
            difficulty: [],
            timeOfDay: [],
            minTotalTime: undefined,
            maxTotalTime: undefined,
            minPrepTime: undefined,
            maxPrepTime: undefined,
            minCookTime: undefined,
            maxCookTime: undefined,
            minRating: undefined,
            minCookCount: undefined,
            page: 1,
        }));
    };

    useEffect(() => {
        setFilters(initialFilters);
    }, [initialFilters]);

    useEffect(() => {
        setQueryInput(filters.query ?? '');
    }, [filters.query]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const sanitized = queryInput.trim();
            const nextQuery = sanitized.length > 0 ? queryInput : undefined;
            if (nextQuery === filters.query) {
                return;
            }
            updateFilters({ query: nextQuery });
        }, 400);

        return () => clearTimeout(timer);
    }, [filters.query, queryInput, updateFilters]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = buildRecipeFilterQuery(filters).toString();
        const next = params ? `${pathname}?${params}` : pathname;
        window.history.replaceState(null, '', next);
    }, [filters, pathname]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = showMobileFilters ? 'hidden' : originalOverflow;
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [showMobileFilters]);

    const activeFilterCount = useMemo(() => {
        const arrayCount = ARRAY_FILTER_KEYS.reduce((sum, key) => {
            const value = filters[key];
            if (Array.isArray(value)) {
                return sum + value.length;
            }
            return sum;
        }, 0);

        const numericCount = NUMERIC_FILTER_KEYS.reduce((sum, key) => {
            return typeof filters[key] === 'number' ? sum + 1 : sum;
        }, 0);

        const hasQuery = Boolean(filters.query?.trim());
        return arrayCount + numericCount + (hasQuery ? 1 : 0);
    }, [filters]);

    const resultStatusText = loading
        ? 'Rezepte laden…'
        : totalResults > 0
          ? `${totalResults} Rezepte gefunden`
          : 'Keine Rezepte mit den aktuellen Einstellungen gefunden.';

    const evaluateMinChange = (prevValue?: number, nextValue?: number) => {
        if (prevValue === nextValue) return 'none';
        if (nextValue === undefined) return 'relax';
        if (prevValue === undefined) return 'restrict';
        return nextValue < prevValue ? 'relax' : 'restrict';
    };

    const evaluateMaxChange = (prevValue?: number, nextValue?: number) => {
        if (prevValue === nextValue) return 'none';
        if (nextValue === undefined) return 'relax';
        if (prevValue === undefined) return 'restrict';
        return nextValue > prevValue ? 'relax' : 'restrict';
    };

    useEffect(() => {
        if (!facets) return;

        const prevSliderSignature = prevSliderSignatureRef.current;
        const prevNonSliderSignature = prevNonSliderSignatureRef.current;
        const sliderChanged = sliderSignature !== prevSliderSignature;
        const nonSliderChanged = nonSliderSignature !== prevNonSliderSignature;

        prevSliderSignatureRef.current = sliderSignature;
        prevNonSliderSignatureRef.current = nonSliderSignature;

        const prevFilters = prevFiltersRef.current;
        prevFiltersRef.current = filters;

        // No filter change (e.g. initial data arrival) — just sync facets
        if (!sliderChanged && !nonSliderChanged) {
            setStableFacets(facets);
            return;
        }

        // Only slider changed and it was a restriction (narrowing) — keep current facets
        // so the filter sidebar doesn't jump while the user is dragging
        if (sliderChanged && !nonSliderChanged) {
            const sliderRelaxed = [
                evaluateMinChange(prevFilters.minTotalTime, filters.minTotalTime),
                evaluateMaxChange(prevFilters.maxTotalTime, filters.maxTotalTime),
                evaluateMinChange(prevFilters.minPrepTime, filters.minPrepTime),
                evaluateMaxChange(prevFilters.maxPrepTime, filters.maxPrepTime),
                evaluateMinChange(prevFilters.minCookTime, filters.minCookTime),
                evaluateMaxChange(prevFilters.maxCookTime, filters.maxCookTime),
                evaluateMinChange(prevFilters.minRating, filters.minRating),
                evaluateMinChange(prevFilters.minCookCount, filters.minCookCount),
            ].some((result) => result === 'relax');

            if (!sliderRelaxed) return;
        }

        setStableFacets(facets);
         
    }, [facets, filters, sliderSignature, nonSliderSignature]);

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
                    facets={stableFacets ?? facets}
                    onFiltersChange={updateFilters}
                    loading={loading}
                />
            </aside>

            <section className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                {/* Hero header */}
                <div
                    className={css({
                        borderRadius: '2xl',
                        p: { base: '4', md: '5' },
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3',
                    })}
                    style={{
                        background: `linear-gradient(135deg, color-mix(in srgb, ${PALETTE.orange} 12%, transparent), color-mix(in srgb, ${PALETTE.gold} 8%, transparent))`,
                    }}
                >
                    <div
                        className={css({
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '3',
                        })}
                    >
                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5',
                            })}
                        >
                            <div
                                className={css({ display: 'flex', alignItems: 'center', gap: '2' })}
                            >
                                <SlidersHorizontal
                                    size={18}
                                    style={{ color: PALETTE.orange, flexShrink: 0 }}
                                />
                                <h1
                                    className={css({
                                        fontSize: { base: 'lg', md: 'xl' },
                                        fontWeight: '800',
                                        margin: 0,
                                        color: 'text',
                                    })}
                                >
                                    Rezepte entdecken
                                </h1>
                            </div>
                            <p className={css({ fontSize: 'xs', color: 'text-muted' })}>
                                {activeFilterCount > 0
                                    ? `${activeFilterCount} Filter aktiv · `
                                    : ''}
                                {resultStatusText}
                            </p>
                        </div>
                        <div
                            className={css({
                                display: 'flex',
                                gap: '2',
                                alignItems: 'center',
                                flexShrink: 0,
                            })}
                        >
                            {activeFilterCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={resetFilters}>
                                    Zurücksetzen
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Search input */}
                    <div className={css({ position: 'relative', maxWidth: '480px' })}>
                        <Search
                            size={16}
                            className={css({
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                            })}
                            style={{ color: PALETTE.orange, opacity: 0.6 }}
                        />
                        <input
                            type="search"
                            value={queryInput}
                            onChange={(event) => setQueryInput(event.target.value)}
                            placeholder="Rezepte, Zutaten oder Te…"
                            aria-label="Rezepte durchsuchen"
                            className={css({
                                width: '100%',
                                borderRadius: 'xl',
                                border: '1px solid',
                                borderColor: 'border.muted',
                                background: 'surface',
                                pl: '9',
                                pr: '3',
                                py: '2.5',
                                fontSize: 'sm',
                                outline: 'none',
                                transition: 'border-color 150ms ease, box-shadow 150ms ease',
                                _focus: {
                                    borderColor: 'accent',
                                    boxShadow: {
                                        base: '0 0 0 3px rgba(224,123,83,0.15)',
                                        _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                                    },
                                },
                            })}
                        />
                        {queryInput && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQueryInput('');
                                    updateFilters({ query: undefined });
                                }}
                                className={css({
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    p: '1',
                                    borderRadius: 'full',
                                    color: 'text-muted',
                                    _hover: { color: 'text' },
                                })}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Sort + view toggle row */}
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '2',
                        })}
                    >
                        <select
                            value={filters.sort ?? 'rating'}
                            onChange={(e) => {
                                const sort = e.target.value as RecipeSortOption;
                                setSavedSort(sort);
                                updateFilters({ sort });
                            }}
                            aria-label="Sortierung"
                            className={css({
                                fontSize: 'xs',
                                fontWeight: '600',
                                border: '1px solid',
                                borderColor: 'border.muted',
                                borderRadius: 'lg',
                                bg: 'surface',
                                color: 'text',
                                px: '2.5',
                                py: '1.5',
                                cursor: 'pointer',
                                outline: 'none',
                                _focus: { borderColor: 'accent' },
                            })}
                        >
                            <option value="rating">Beste Bewertung</option>
                            <option value="newest">Neueste</option>
                            <option value="fastest">Schnellste</option>
                            <option value="popular">Beliebteste</option>
                        </select>

                        <div className={css({ display: 'flex', gap: '1' })}>
                            {(['grid', 'list'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setViewMode(mode)}
                                    aria-label={mode === 'grid' ? 'Gitteransicht' : 'Listenansicht'}
                                    aria-pressed={viewMode === mode}
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: 'lg',
                                        border: '1px solid',
                                        borderColor: viewMode === mode ? 'accent' : 'border.muted',
                                        bg: viewMode === mode ? 'accent' : 'surface',
                                        color: viewMode === mode ? 'white' : 'text-muted',
                                        cursor: 'pointer',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            borderColor: 'accent',
                                            color: viewMode === mode ? 'white' : 'text',
                                        },
                                    })}
                                >
                                    {mode === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div aria-live="polite">
                    <ActiveFilters filters={filters} onRemove={updateFilters} />
                </div>

                {error ? (
                    <p className={css({ fontSize: 'sm', color: 'text-muted' })}>{error}</p>
                ) : !loading && data.length === 0 ? (
                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            py: '8',
                            px: '6',
                            gap: '4',
                        })}
                    >
                        <div
                            className={css({
                                width: '64px',
                                height: '64px',
                                borderRadius: 'full',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bg: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
                                color: 'brand.primary',
                            })}
                        >
                            <UtensilsCrossed size={28} />
                        </div>
                        <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
                            <p className={css({ fontSize: 'md', fontWeight: '700', color: 'text' })}>
                                Keine Rezepte gefunden
                            </p>
                            <p className={css({ fontSize: 'sm', color: 'text-muted', maxWidth: '300px', lineHeight: '1.6' })}>
                                Mit den aktuellen Filtern gibt es leider keine Treffer. Versuche weniger Filter oder eine andere Suche.
                            </p>
                        </div>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className={css({
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    color: 'white',
                                    bg: 'brand.primary',
                                    border: 'none',
                                    borderRadius: 'lg',
                                    px: '4',
                                    py: '2',
                                    cursor: 'pointer',
                                    transition: 'opacity 150ms ease',
                                    _hover: { opacity: '0.85' },
                                })}
                            >
                                Filter zurücksetzen
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div
                            className={css({
                                display: 'grid',
                                gridTemplateColumns: viewMode === 'list'
                                    ? '1fr'
                                    : {
                                          base: '1fr',
                                          xs: 'repeat(2, minmax(0, 1fr))',
                                          xl: 'repeat(3, minmax(0, 1fr))',
                                      },
                                gap: viewMode === 'list' ? '2' : '4',
                            })}
                        >
                            {loading
                                ? Array.from({ length: data.length || 6 }).map((_, index) => (
                                      <RecipeCardSkeleton
                                          key={index}
                                          variant={viewMode === 'list' ? 'list' : 'default'}
                                              categoryOnImage
                                      />
                                  ))
                                : data.map((recipe: RecipeCardData, index: number) => (
                                      <motion.div
                                          key={recipe.id}
                                          initial={{ opacity: 0, y: 12 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.3, delay: Math.min(index, 5) * 0.05 }}
                                      >
                                          <RecipeCard
                                              recipe={recipe}
                                              variant={viewMode === 'list' ? 'list' : 'default'}
                                              categoryOnImage
                                          />
                                      </motion.div>
                                  ))}
                        </div>

                        {totalPages > 1 && (
                            <div
                                className={css({
                                    marginTop: '5',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3',
                                    alignItems: 'center',
                                })}
                            >
                                <div
                                    className={css({
                                        display: 'flex',
                                        gap: '2',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    })}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={!canGoPrev}
                                        className={css({
                                            px: '3',
                                            py: '2',
                                            borderRadius: 'lg',
                                            border: '1px solid',
                                            borderColor: canGoPrev ? 'primary' : 'light',
                                            color: canGoPrev ? 'primary' : 'text-muted',
                                            background: 'surface',
                                            cursor: canGoPrev ? 'pointer' : 'not-allowed',
                                            fontSize: 'sm',
                                            fontWeight: '600',
                                            minWidth: '80px',
                                        })}
                                    >
                                        Zurück
                                    </button>

                                    <div
                                        className={css({
                                            display: 'flex',
                                            gap: '1',
                                            alignItems: 'center',
                                        })}
                                    >
                                        {pageNumbers.map((pageNumber) => {
                                            const isActive = pageNumber === currentPage;
                                            return (
                                                <button
                                                    key={pageNumber}
                                                    type="button"
                                                    onClick={() => handlePageChange(pageNumber)}
                                                    aria-current={isActive ? 'page' : undefined}
                                                    className={css({
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: 'md',
                                                        border: '1px solid',
                                                        borderColor: isActive ? 'primary' : 'light',
                                                        background: isActive
                                                            ? 'primary'
                                                            : 'surface',
                                                        color: isActive ? 'white' : 'text',
                                                        fontWeight: '600',
                                                        fontSize: 'sm',
                                                        cursor: 'pointer',
                                                    })}
                                                >
                                                    {pageNumber}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={!canGoNext}
                                        className={css({
                                            px: '3',
                                            py: '2',
                                            borderRadius: 'lg',
                                            border: '1px solid',
                                            borderColor: canGoNext ? 'primary' : 'light',
                                            color: canGoNext ? 'primary' : 'text-muted',
                                            background: 'surface',
                                            cursor: canGoNext ? 'pointer' : 'not-allowed',
                                            fontSize: 'sm',
                                            fontWeight: '600',
                                            minWidth: '80px',
                                        })}
                                    >
                                        Weiter
                                    </button>
                                </div>

                                <p className={css({ fontSize: 'xs', color: 'text-muted' })}>
                                    Zeige {startItem}-{endItem} von {totalResults} Rezepten
                                </p>
                            </div>
                        )}
                    </>
                )}
            </section>

            <AnimatePresence>
                {showMobileFilters && (
                    <motion.div
                        className={css({
                            position: 'fixed',
                            inset: 0,
                            zIndex: 60,
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            px: '2',
                            pb: '2',
                        })}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Rezepte filtern"
                        onClick={() => setShowMobileFilters(false)}
                        initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
                        animate={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                        exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
                        transition={{ duration: 0.2 }}
                    >
                        <motion.div
                            className={css({
                                width: '100%',
                                maxWidth: '480px',
                                borderRadius: '2xl',
                                background: 'surface.elevated',
                                boxShadow: {
                                    base: '0 24px 60px rgba(0,0,0,0.25)',
                                    _dark: '0 24px 60px rgba(0,0,0,0.5)',
                                },
                                maxHeight: '92vh',
                                overflowY: 'auto',
                                overflow: 'hidden',
                            })}
                            onClick={(event) => event.stopPropagation()}
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        >
                            <div
                                className={css({
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    px: '4',
                                    py: '3.5',
                                    borderTopRadius: '2xl',
                                })}
                                style={{
                                    background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                                }}
                            >
                                <p
                                    className={css({
                                        fontWeight: '700',
                                        fontSize: 'md',
                                        color: 'white',
                                    })}
                                >
                                    Filter
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowMobileFilters(false)}
                                    className={css({
                                        border: 'none',
                                        background: 'rgba(255,255,255,0.2)',
                                        fontWeight: '600',
                                        color: 'white',
                                        cursor: 'pointer',
                                        borderRadius: 'lg',
                                        px: '3',
                                        py: '1.5',
                                        fontSize: 'sm',
                                        transition: 'background 150ms ease',
                                        _hover: {
                                            background: 'rgba(255,255,255,0.35)',
                                        },
                                    })}
                                >
                                    Schließen
                                </button>
                            </div>
                            <div className={css({ px: '1', py: '2' })}>
                                <FilterSidebar
                                    filters={filters}
                                    options={filterOptions}
                                    facets={stableFacets ?? facets}
                                    onFiltersChange={updateFilters}
                                    loading={loading}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                className={css({
                    display: { base: 'flex', lg: 'none' },
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 50,
                    gap: '2',
                    padding: '3',
                    background: 'surface.elevated',
                    borderTop: '1px solid',
                    borderColor: 'light',
                })}
            >
                <button
                    type="button"
                    onClick={() => setShowMobileFilters(true)}
                    className={css({
                        flex: 1,
                        borderRadius: 'lg',
                        background: 'primary',
                        color: 'light',
                        fontWeight: '600',
                        padding: '3',
                        fontSize: 'sm',
                    })}
                >
                    Filter öffnen
                </button>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Zurücksetzen
                </Button>
            </div>
        </div>
    );
};
