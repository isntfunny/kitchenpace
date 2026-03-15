import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';

import type { CategoryOption } from '@app/app/actions/filters';
import { Button } from '@app/components/atoms/Button';
import { PALETTE } from '@app/lib/palette';
import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';

import { css } from 'styled-system/css';

import { FilterSidebar } from './FilterSidebar';
import type { RecipeSearchFacets } from './useRecipeSearch';

type FilterOptions = {
    tags: string[];
    ingredients: string[];
    categories: CategoryOption[];
};

type MobileFilterSheetProps = {
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    filters: RecipeFilterSearchParams;
    options: FilterOptions;
    facets: RecipeSearchFacets | undefined;
    loading: boolean;
    onFiltersChange: (next: Partial<RecipeFilterSearchParams>) => void;
    onReset: () => void;
};

export function MobileFilterSheet({
    open,
    onOpen,
    onClose,
    filters,
    options,
    facets,
    loading,
    onFiltersChange,
    onReset,
}: MobileFilterSheetProps) {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = open ? 'hidden' : originalOverflow;
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [open]);

    return (
        <>
            <AnimatePresence>
                {open && (
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
                        onClick={onClose}
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
                                    onClick={onClose}
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
                                        _hover: { background: 'rgba(255,255,255,0.35)' },
                                    })}
                                >
                                    Schlie\u00dfen
                                </button>
                            </div>
                            <div className={css({ px: '1', py: '2' })}>
                                <FilterSidebar
                                    filters={filters}
                                    options={options}
                                    facets={facets}
                                    onFiltersChange={onFiltersChange}
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
                    onClick={onOpen}
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
                    Filter \u00f6ffnen
                </button>
                <Button variant="ghost" size="sm" onClick={onReset}>
                    Zur\u00fccksetzen
                </Button>
            </div>
        </>
    );
}
