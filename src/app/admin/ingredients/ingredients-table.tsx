'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Filter, GitMerge, Plus, Search, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useRef, useState, useMemo, useCallback, useEffect } from 'react';

import { css } from 'styled-system/css';

import {
    type Ingredient,
    type IngredientCategory,
    type Unit,
    btnPrimary,
    btnSecondary,
    overlayStyle,
    dialogContentStyle,
} from './ingredient-types';
import { IngredientCard } from './IngredientCard';
import { IngredientEditPanel } from './IngredientEditPanel';
import { AddIngredientForm, MergeModal } from './IngredientModals';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IngredientsDashboardProps {
    ingredients: Ingredient[];
    categories: IngredientCategory[];
    units: Unit[];
}

// Re-export under old name for page.tsx compatibility
export { IngredientsDashboard as IngredientsTable };

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function IngredientsDashboard({
    ingredients,
    categories,
    units,
}: IngredientsDashboardProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
    const [showNeedsReview, setShowNeedsReview] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [showMerge, setShowMerge] = useState(false);

    const filtered = useMemo(() => {
        let list = ingredients;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (i) =>
                    i.name.toLowerCase().includes(q) ||
                    i.aliases.some((a) => a.toLowerCase().includes(q)),
            );
        }
        if (filterCategoryId) {
            list = list.filter((i) => i.categories.some((c) => c.id === filterCategoryId));
        }
        if (showNeedsReview) {
            list = list.filter((i) => i.needsReview);
        }
        return list;
    }, [ingredients, searchQuery, filterCategoryId, showNeedsReview]);

    const selectedIngredient = useMemo(
        () => ingredients.find((i) => i.id === selectedId) ?? null,
        [ingredients, selectedId],
    );

    useEffect(() => {
        if (selectedId && !ingredients.find((i) => i.id === selectedId)) {
            setSelectedId(null);
        }
    }, [ingredients, selectedId]);

    const handleSelect = useCallback((id: string) => {
        setSelectedId((prev) => (prev === id ? null : id));
    }, []);

    const listRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: filtered.length,
        getScrollElement: () => listRef.current,
        estimateSize: () => 52,
        overscan: 20,
    });

    const needsReviewCount = useMemo(
        () => ingredients.filter((i) => i.needsReview).length,
        [ingredients],
    );

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
            {/* Toolbar */}
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    flexWrap: 'wrap',
                })}
            >
                {/* Search */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        flex: '1',
                        minWidth: '200px',
                        gap: '2',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border',
                        bg: 'surface.elevated',
                        paddingX: '3',
                        paddingY: '2',
                        transition: 'all 0.15s',
                        _focusWithin: {
                            borderColor: 'brand.primary',
                            boxShadow: {
                                base: '0 0 0 3px rgba(224,123,83,0.12)',
                                _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                            },
                        },
                    })}
                >
                    <Search
                        size={15}
                        className={css({ color: 'foreground.muted', flexShrink: '0' })}
                    />
                    <input
                        type="text"
                        placeholder="Zutat suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={css({
                            flex: '1',
                            bg: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: 'sm',
                            color: 'foreground',
                        })}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className={css({
                                bg: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'foreground.muted',
                                display: 'flex',
                                padding: '0.5',
                                borderRadius: 'md',
                                _hover: { color: 'foreground', bg: 'surface.muted' },
                            })}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Category filter */}
                <div className={css({ display: 'flex', alignItems: 'center', gap: '1' })}>
                    <Filter size={14} className={css({ color: 'foreground.muted' })} />
                    <select
                        value={filterCategoryId ?? ''}
                        onChange={(e) => setFilterCategoryId(e.target.value || null)}
                        className={css({
                            paddingX: '2',
                            paddingY: '1.5',
                            borderRadius: 'lg',
                            border: '1px solid',
                            borderColor: 'border',
                            bg: 'surface.elevated',
                            fontSize: 'sm',
                            color: 'foreground',
                            cursor: 'pointer',
                        })}
                    >
                        <option value="">Alle Kategorien</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name} ({cat._count.ingredients})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Needs review toggle */}
                {needsReviewCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowNeedsReview(!showNeedsReview)}
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '1.5',
                            paddingX: '3',
                            paddingY: '1.5',
                            borderRadius: 'lg',
                            fontSize: 'sm',
                            fontWeight: '500',
                            border: '1px solid',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            bg: showNeedsReview ? 'rgba(245,158,11,0.12)' : 'surface.elevated',
                            borderColor: showNeedsReview ? 'status.warning' : 'border',
                            color: showNeedsReview ? 'status.warning' : 'foreground.muted',
                        })}
                    >
                        Review ({needsReviewCount})
                    </button>
                )}

                {/* Action buttons */}
                <button
                    type="button"
                    onClick={() => setShowMerge(true)}
                    className={btnSecondary}
                    title="Zutaten zusammenfuehren"
                >
                    <GitMerge size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => setShowAdd(!showAdd)}
                    className={btnPrimary}
                    title="Neue Zutat"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Add form */}
            {showAdd && <AddIngredientForm onClose={() => setShowAdd(false)} />}

            {/* Merge modal */}
            {showMerge && (
                <MergeModal ingredients={ingredients} onClose={() => setShowMerge(false)} />
            )}

            {/* Master / Detail — use viewport-pinned height so both panels scroll independently */}
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: { base: '1fr', md: '340px 1fr' },
                    gap: '0',
                    height: 'calc(100vh - 260px)',
                    minHeight: '400px',
                    borderRadius: '2xl',
                    border: '1px solid',
                    borderColor: 'border.muted',
                    bg: 'surface',
                    overflow: 'hidden',
                })}
            >
                {/* Left: Ingredient list */}
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: { md: '1px solid' },
                        borderColor: 'border.muted',
                        overflow: 'hidden',
                    })}
                >
                    {/* List header */}
                    <div
                        className={css({
                            padding: '2.5',
                            paddingX: '3',
                            borderBottom: '1px solid',
                            borderColor: 'border.muted',
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            fontWeight: '500',
                            display: 'flex',
                            justifyContent: 'space-between',
                            flexShrink: '0',
                        })}
                    >
                        <span>{filtered.length} Zutaten</span>
                        <span>Rez. · kcal</span>
                    </div>

                    {/* Virtualized list */}
                    <div
                        ref={listRef}
                        className={css({
                            flex: '1',
                            overflowY: 'auto',
                        })}
                    >
                        <div
                            style={{
                                height: virtualizer.getTotalSize(),
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualItem) => {
                                const ingredient = filtered[virtualItem.index];
                                return (
                                    <div
                                        key={ingredient.id}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: virtualItem.size,
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                    >
                                        <IngredientCard
                                            ingredient={ingredient}
                                            isSelected={selectedId === ingredient.id}
                                            onClick={() => handleSelect(ingredient.id)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: Detail panel (desktop) */}
                <div
                    className={css({
                        display: { base: 'none', md: 'flex' },
                        flexDirection: 'column',
                        overflow: 'hidden',
                    })}
                >
                    {selectedIngredient ? (
                        <div
                            className={css({
                                flex: '1',
                                overflowY: 'auto',
                                padding: '5',
                                display: 'flex',
                                flexDirection: 'column',
                            })}
                        >
                            <IngredientEditPanel
                                key={selectedIngredient.id}
                                ingredient={selectedIngredient}
                                allCategories={categories}
                                allUnits={units}
                                onClose={() => setSelectedId(null)}
                                mode="inline"
                            />
                        </div>
                    ) : (
                        <div
                            className={css({
                                flex: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            })}
                        >
                            <p className={css({ color: 'foreground.muted', fontSize: 'sm' })}>
                                Wähle eine Zutat aus der Liste, um sie zu bearbeiten.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile: Detail dialog */}
            <Dialog.Root
                open={!!selectedIngredient}
                onOpenChange={(open) => {
                    if (!open) setSelectedId(null);
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay
                        className={css({
                            display: { base: 'block', md: 'none' },
                        })}
                    >
                        <div className={overlayStyle} />
                    </Dialog.Overlay>
                    <Dialog.Content
                        className={css({
                            display: { base: 'flex', md: 'none' },
                        })}
                    >
                        <div className={dialogContentStyle}>
                            {selectedIngredient && (
                                <IngredientEditPanel
                                    key={selectedIngredient.id}
                                    ingredient={selectedIngredient}
                                    allCategories={categories}
                                    allUnits={units}
                                    onClose={() => setSelectedId(null)}
                                    mode="dialog"
                                />
                            )}
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
