import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react';

import { Button } from '@app/components/atoms/Button';
import { PALETTE } from '@app/lib/palette';
import type { RecipeFilterSearchParams, RecipeSortOption } from '@app/lib/recipeFilters';
import { css } from 'styled-system/css';

import { ActiveFilters } from './ActiveFilters';

type SearchHeaderProps = {
    filters: RecipeFilterSearchParams;
    queryInput: string;
    viewMode: 'grid' | 'list';
    activeFilterCount: number;
    loading: boolean;
    totalResults: number;
    onQueryChange: (value: string) => void;
    onClearQuery: () => void;
    onSortChange: (sort: RecipeSortOption) => void;
    onViewModeChange: (mode: 'grid' | 'list') => void;
    onFiltersChange: (next: Partial<RecipeFilterSearchParams>) => void;
    onReset: () => void;
};

export function SearchHeader({
    filters,
    queryInput,
    viewMode,
    activeFilterCount,
    loading,
    totalResults,
    onQueryChange,
    onClearQuery,
    onSortChange,
    onViewModeChange,
    onFiltersChange,
    onReset,
}: SearchHeaderProps) {
    const resultStatusText = loading
        ? 'Rezepte laden\u2026'
        : totalResults > 0
          ? `${totalResults} Rezepte gefunden`
          : 'Keine Rezepte mit den aktuellen Einstellungen gefunden.';

    return (
        <>
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
                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.5' })}>
                        <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
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
                                ? `${activeFilterCount} Filter aktiv \u00b7 `
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
                            <Button variant="ghost" size="sm" onClick={onReset}>
                                Zur\u00fccksetzen
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
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="Rezepte, Zutaten oder Te\u2026"
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
                            onClick={onClearQuery}
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
                        onChange={(e) => onSortChange(e.target.value as RecipeSortOption)}
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
                                onClick={() => onViewModeChange(mode)}
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
                <ActiveFilters filters={filters} onRemove={onFiltersChange} />
            </div>
        </>
    );
}
