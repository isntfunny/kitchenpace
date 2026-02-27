'use client';

import { usePathname } from 'next/navigation';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';

import type { CategoryOption } from '@/app/actions/filters';
import type { RecipeCardData } from '@/app/actions/recipes';
import { Button } from '@/components/atoms/Button';
import { RecipeCard } from '@/components/features/RecipeCard';
import { buildRecipeFilterQuery, MULTI_VALUE_KEYS, NUMBER_KEYS } from '@/lib/recipeFilters';
import type { RecipeFilterSearchParams } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';

import { ActiveFilters } from './ActiveFilters';
import { FilterSidebar } from './FilterSidebar';
import { useRecipeSearch } from './useRecipeSearch';

type FilterOptions = {
    tags: string[];
    ingredients: string[];
    categories: CategoryOption[];
};

type RecipeSearchClientProps = {
    initialFilters: RecipeFilterSearchParams;
    filterOptions: FilterOptions;
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
}) => {
    const [filters, setFilters] = useState(initialFilters);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const { data, meta, loading, error } = useRecipeSearch(filters);
    const facets = meta?.facets;
    const pathname = usePathname();
    const sliderSignature = useMemo(
        () => buildSliderSignature(filters),
        [
            filters.minTotalTime,
            filters.maxTotalTime,
            filters.minPrepTime,
            filters.maxPrepTime,
            filters.minCookTime,
            filters.maxCookTime,
            filters.minRating,
            filters.minCookCount,
        ],
    );

    const nonSliderSignature = useMemo(
        () => buildNonSliderSignature(filters),
        [
            filters.query,
            filters.tags,
            filters.mealTypes,
            filters.ingredients,
            filters.excludeIngredients,
            filters.difficulty,
            filters.timeOfDay,
            filters.filterMode,
        ],
    );

    const prevSliderSignatureRef = useRef(sliderSignature);
    const prevNonSliderSignatureRef = useRef(nonSliderSignature);
    const prevFiltersRef = useRef(filters);
    const [stableFacets, setStableFacets] = useState(facets);
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

    useEffect(() => {
        setFilters(initialFilters);
    }, [initialFilters]);

    const updateFilters = (next: Partial<RecipeFilterSearchParams>) => {
        setFilters((prev) => ({
            ...prev,
            ...next,
            page: 1,
        }));
    };

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

    const filterSummaryText = activeFilterCount
        ? `${activeFilterCount} aktive Filter`
        : 'Alle Rezepte anzeigen';

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

        if (!sliderChanged && !nonSliderChanged) {
            if (!stableFacets) {
                setStableFacets(facets);
            }
            return;
        }

        const sliderRelaxed = sliderChanged
            ? [
                  evaluateMinChange(prevFilters.minTotalTime, filters.minTotalTime),
                  evaluateMaxChange(prevFilters.maxTotalTime, filters.maxTotalTime),
                  evaluateMinChange(prevFilters.minPrepTime, filters.minPrepTime),
                  evaluateMaxChange(prevFilters.maxPrepTime, filters.maxPrepTime),
                  evaluateMinChange(prevFilters.minCookTime, filters.minCookTime),
                  evaluateMaxChange(prevFilters.maxCookTime, filters.maxCookTime),
                  evaluateMinChange(prevFilters.minRating, filters.minRating),
                  evaluateMinChange(prevFilters.minCookCount, filters.minCookCount),
              ].some((result) => result === 'relax')
            : false;

        if (sliderChanged && !nonSliderChanged && !sliderRelaxed) {
            return;
        }

        setStableFacets(facets);
    }, [facets, filters, sliderSignature, nonSliderSignature, stableFacets]);

    return (
        <div
            className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', lg: '280px 1fr' },
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
                />
            </aside>

            <section className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                <header
                    className={css({
                        display: 'flex',
                        flexDirection: { base: 'column', md: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { base: 'flex-start', md: 'center' },
                        gap: '3',
                    })}
                >
                    <div>
                        <p className={css({ fontSize: 'lg', fontWeight: '600', color: 'text' })}>
                            Rezepte filtern
                        </p>
                        <p className={css({ fontSize: 'sm', color: 'text-muted', marginTop: '1' })}>
                            {filterSummaryText}
                        </p>
                        <p className={css({ fontSize: 'xs', color: 'text-muted', marginTop: '1' })}>
                            {resultStatusText}
                        </p>
                        <div
                            className={css({
                                marginTop: '3',
                                display: 'flex',
                                gap: '2',
                                alignItems: 'center',
                                width: '100%',
                                maxWidth: '420px',
                            })}
                        >
                            <input
                                type="search"
                                value={filters.query ?? ''}
                                onChange={(event) => {
                                    const nextValue = event.target.value;
                                    const sanitized = nextValue.trim();
                                    updateFilters({
                                        query: sanitized.length > 0 ? nextValue : undefined,
                                    });
                                }}
                                placeholder="Rezepte, Zutaten oder Techniken suchen"
                                aria-label="Rezepte durchsuchen"
                                className={css({
                                    flex: 1,
                                    borderRadius: 'lg',
                                    border: '1px solid',
                                    borderColor: 'light',
                                    background: 'surface',
                                    px: '3',
                                    py: '2.5',
                                    fontSize: 'sm',
                                })}
                            />
                            {filters.query ? (
                                <button
                                    type="button"
                                    onClick={() => updateFilters({ query: undefined })}
                                    className={css({
                                        borderRadius: 'lg',
                                        background: 'surface',
                                        border: '1px solid',
                                        borderColor: 'light',
                                        fontSize: 'xs',
                                        fontWeight: '600',
                                        px: '3',
                                        py: '2',
                                        color: 'text-muted',
                                    })}
                                >
                                    Suche löschen
                                </button>
                            ) : null}
                        </div>
                    </div>
                    <div
                        className={css({
                            display: 'flex',
                            gap: '2',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                        })}
                    >
                        <Button variant="ghost" size="sm" onClick={resetFilters}>
                            Filter zurücksetzen
                        </Button>
                        <button
                            type="button"
                            onClick={() => setShowMobileFilters((prev) => !prev)}
                            className={css({
                                display: { base: 'inline-flex', lg: 'none' },
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '1',
                                px: '4',
                                py: '2',
                                borderRadius: 'full',
                                border: '1px solid',
                                borderColor: 'primary',
                                background: 'surface',
                                color: 'primary',
                                fontSize: 'sm',
                                fontWeight: '600',
                                cursor: 'pointer',
                            })}
                        >
                            {showMobileFilters ? 'Filter schließen' : 'Filter öffnen'}
                        </button>
                    </div>
                </header>

                <div aria-live="polite">
                    <ActiveFilters filters={filters} onRemove={updateFilters} />
                </div>

                {error ? (
                    <p className={css({ fontSize: 'sm', color: 'text-muted' })}>{error}</p>
                ) : loading ? (
                    <p className={css({ fontSize: 'sm', color: 'text-muted' })}>
                        Rezepte werden geladen…
                    </p>
                ) : data.length === 0 ? (
                    <p className={css({ fontSize: 'sm', color: 'text-muted' })}>
                        Keine Rezepte mit den aktuellen Filtern gefunden.
                    </p>
                ) : (
                    <>
                        <div
                            className={css({
                                display: 'grid',
                                gridTemplateColumns: {
                                    base: '1fr',
                                    sm: 'repeat(2, minmax(0, 1fr))',
                                    lg: 'repeat(3, minmax(0, 1fr))',
                                },
                                gap: '4',
                            })}
                        >
                            {data.map((recipe: RecipeCardData) => (
                                <RecipeCard key={recipe.id} recipe={recipe} />
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

            {showMobileFilters && (
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        zIndex: 60,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        padding: '4',
                    })}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Rezepte filtern"
                    onClick={() => setShowMobileFilters(false)}
                >
                    <div
                        className={css({
                            width: '100%',
                            maxWidth: '480px',
                            borderRadius: '2xl',
                            background: 'surface.elevated',
                            border: '1px solid',
                            borderColor: 'primary',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                        })}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '4',
                                borderBottom: '1px solid',
                                borderColor: 'light',
                            })}
                        >
                            <p className={css({ fontWeight: '600', fontSize: 'sm' })}>Filter</p>
                            <button
                                type="button"
                                onClick={() => setShowMobileFilters(false)}
                                className={css({
                                    border: 'none',
                                    background: 'transparent',
                                    fontWeight: '600',
                                    color: 'primary',
                                    cursor: 'pointer',
                                })}
                            >
                                Schließen
                            </button>
                        </div>
                        <div className={css({ padding: '4' })}>
                            <FilterSidebar
                                filters={filters}
                                options={filterOptions}
                                facets={stableFacets ?? facets}
                                onFiltersChange={updateFilters}
                            />
                        </div>
                    </div>
                </div>
            )}

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
