'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type FC } from 'react';

import type { CategoryOption } from '@/app/actions/filters';
import type { RecipeCardData } from '@/app/actions/recipes';
import { Button } from '@/components/atoms/Button';
import { RecipeCard } from '@/components/features/RecipeCard';
import { buildRecipeFilterQuery } from '@/lib/recipeFilters';
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

export const RecipeSearchClient: FC<RecipeSearchClientProps> = ({
    initialFilters,
    filterOptions,
}) => {
    const [filters, setFilters] = useState(initialFilters);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const { data, meta, loading, error } = useRecipeSearch(filters);
    const pathname = usePathname();

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

    const totalResults = meta?.total ?? 0;

    return (
        <div
            className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', lg: '320px 1fr' },
                gap: '6',
                paddingTop: '5',
                paddingBottom: '10',
            })}
        >
            <div
                className={css({
                    display: { base: 'none', lg: 'block' },
                    position: 'sticky',
                    top: '96px',
                })}
            >
                <FilterSidebar
                    filters={filters}
                    options={filterOptions}
                    onFiltersChange={updateFilters}
                />
            </div>

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
                        <p className={css({ fontSize: 'sm', color: 'text-muted' })}>
                            {totalResults} Ergebnisse gefunden
                        </p>
                    </div>
                    <div className={css({ display: 'flex', gap: '2', alignItems: 'center' })}>
                        <button
                            type="button"
                            onClick={() => setShowMobileFilters((prev) => !prev)}
                            className={css({
                                display: { base: 'inline-flex', lg: 'none' },
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2',
                                px: '4',
                                py: '2',
                                borderRadius: 'full',
                                border: '1px solid',
                                borderColor: 'rgba(0,0,0,0.15)',
                                background: 'white',
                                fontFamily: 'body',
                                fontSize: 'sm',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 150ms ease',
                                _hover: {
                                    borderColor: 'rgba(224,123,83,0.6)',
                                },
                            })}
                        >
                            Filter {showMobileFilters ? 'verbergen' : 'anzeigen'}
                        </button>
                        <Button variant="ghost" size="sm" onClick={resetFilters}>
                            Filter zurücksetzen
                        </Button>
                    </div>
                </header>

                {showMobileFilters && (
                    <div
                        className={css({
                            position: 'fixed',
                            inset: 0,
                            zIndex: 60,
                            bg: 'rgba(0,0,0,0.35)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                            padding: '4',
                        })}
                    >
                        <div
                            className={css({
                                width: '100%',
                                maxW: '480px',
                                bg: 'white',
                                borderRadius: '2xl',
                                border: '1px solid',
                                borderColor: 'rgba(0,0,0,0.08)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                                maxHeight: 'calc(100vh - 32px)',
                                overflowY: 'auto',
                            })}
                        >
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    px: '4',
                                    py: '3',
                                    borderBottom: '1px solid',
                                    borderColor: 'rgba(0,0,0,0.08)',
                                })}
                            >
                                <span className={css({ fontWeight: '600' })}>Filter</span>
                                <button
                                    type="button"
                                    onClick={() => setShowMobileFilters(false)}
                                    className={css({
                                        border: 'none',
                                        background: 'transparent',
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        color: 'primary',
                                        cursor: 'pointer',
                                        padding: 0,
                                    })}
                                >
                                    Schließen
                                </button>
                            </div>
                            <div className={css({ padding: '4' })}>
                                <FilterSidebar
                                    filters={filters}
                                    options={filterOptions}
                                    onFiltersChange={updateFilters}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <ActiveFilters filters={filters} onRemove={updateFilters} />

                {error && (
                    <div className={css({ color: 'text-muted', fontSize: 'sm' })}>{error}</div>
                )}

                {loading ? (
                    <div className={css({ fontSize: 'sm', color: 'text-muted' })}>
                        Lädt Rezepte…
                    </div>
                ) : data.length === 0 ? (
                    <div className={css({ fontSize: 'sm', color: 'text-muted' })}>
                        Keine Rezepte mit den aktuellen Filtern gefunden.
                    </div>
                ) : (
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: {
                                base: '1fr',
                                sm: 'repeat(2, minmax(0, 1fr))',
                                lg: 'repeat(3, minmax(0, 1fr))',
                            },
                            gap: '5',
                        })}
                    >
                        {data.map((recipe: RecipeCardData) => (
                            <RecipeCard key={recipe.id} recipe={recipe} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};
