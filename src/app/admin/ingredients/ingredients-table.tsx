'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowLeft, GitMerge, Plus, Search, X } from 'lucide-react';
import { memo, useRef, useState, useMemo, useCallback, useEffect, startTransition } from 'react';

import { css } from 'styled-system/css';

import {
    type Ingredient,
    type IngredientCategory,
    type Unit,
    btnPrimary,
    btnSecondary,
} from './ingredient-types';
import { IngredientCard } from './IngredientCard';
import { IngredientEditPanel } from './IngredientEditPanel';
import { AddIngredientForm, MergeModal } from './IngredientModals';

const ITEM_HEIGHT = 48;
const estimateSize = () => ITEM_HEIGHT;

// ---------------------------------------------------------------------------
// Virtualized list — isolated so scroll only re-renders this component
// ---------------------------------------------------------------------------

const VirtualList = memo(function VirtualList({
    items,
    selectedId,
    onSelect,
}: {
    items: Ingredient[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const listRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => listRef.current,
        estimateSize,
        overscan: 15,
    });

    return (
        <div
            ref={listRef}
            className={css({
                flex: '1',
                overflowY: 'auto',
                contain: 'strict',
            })}
        >
            <div
                style={{
                    height: virtualizer.getTotalSize(),
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((vi) => {
                    const ingredient = items[vi.index];
                    return (
                        <div
                            key={ingredient.id}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: vi.size,
                                transform: `translateY(${vi.start}px)`,
                            }}
                        >
                            <IngredientCard
                                ingredient={ingredient}
                                isSelected={selectedId === ingredient.id}
                                onSelect={onSelect}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

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

    const prevIngredientsRef = useRef(ingredients);
    useEffect(() => {
        if (prevIngredientsRef.current !== ingredients) {
            prevIngredientsRef.current = ingredients;
            if (selectedId && !ingredients.find((i) => i.id === selectedId)) {
                startTransition(() => setSelectedId(null));
            }
        }
    }, [ingredients, selectedId]);

    const handleSelect = useCallback((id: string) => {
        setSelectedId((prev) => (prev === id ? null : id));
    }, []);

    const needsReviewCount = useMemo(
        () => ingredients.filter((i) => i.needsReview).length,
        [ingredients],
    );

    const showMobileDetail = selectedIngredient !== null;

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
            {/* Toolbar — hidden on mobile when detail is open */}
            <div
                className={css({
                    display: showMobileDetail ? { base: 'none', md: 'flex' } : 'flex',
                    alignItems: 'center',
                    gap: '2',
                    flexWrap: 'wrap',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        flex: '1',
                        minWidth: '180px',
                        gap: '2',
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        bg: 'surface',
                        paddingX: '2.5',
                        paddingY: '1.5',
                        transition: 'all 0.15s',
                        _focusWithin: {
                            borderColor: 'brand.primary',
                            boxShadow: {
                                base: '0 0 0 2px rgba(224,123,83,0.10)',
                                _dark: '0 0 0 2px rgba(224,123,83,0.15)',
                            },
                        },
                    })}
                >
                    <Search
                        size={14}
                        className={css({ color: 'foreground.muted', flexShrink: '0' })}
                    />
                    <input
                        type="text"
                        placeholder="Suchen..."
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
                            <X size={13} />
                        </button>
                    )}
                </div>

                <select
                    value={filterCategoryId ?? ''}
                    onChange={(e) => setFilterCategoryId(e.target.value || null)}
                    className={css({
                        paddingX: '2',
                        paddingY: '1.5',
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        bg: 'surface',
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

                {needsReviewCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowNeedsReview(!showNeedsReview)}
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '1.5',
                            paddingX: '2.5',
                            paddingY: '1.5',
                            borderRadius: 'lg',
                            fontSize: 'xs',
                            fontWeight: '600',
                            borderWidth: '1px',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            bg: showNeedsReview ? 'rgba(245,158,11,0.10)' : 'surface',
                            borderColor: showNeedsReview ? 'status.warning' : 'border.muted',
                            color: showNeedsReview ? 'status.warning' : 'foreground.muted',
                        })}
                    >
                        Review ({needsReviewCount})
                    </button>
                )}

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

            {showAdd && <AddIngredientForm onClose={() => setShowAdd(false)} />}
            {showMerge && <MergeModal onClose={() => setShowMerge(false)} />}

            {/* Master / Detail */}
            <div
                className={css({
                    display: { base: 'block', md: 'grid' },
                    gridTemplateColumns: { md: '300px 1fr' },
                    height: { md: 'calc(100vh - 200px)' },
                    minHeight: { md: '400px' },
                    borderRadius: 'xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    bg: 'surface',
                    overflow: 'hidden',
                })}
            >
                {/* Left: list */}
                <div
                    className={css({
                        display: showMobileDetail ? { base: 'none', md: 'flex' } : 'flex',
                        flexDirection: 'column',
                        borderRightWidth: { md: '1px' },
                        borderColor: 'border.muted',
                        overflow: 'hidden',
                    })}
                >
                    <div
                        className={css({
                            paddingX: '3',
                            paddingY: '1.5',
                            borderBottomWidth: '1px',
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
                        <span>Rez.</span>
                    </div>

                    <VirtualList items={filtered} selectedId={selectedId} onSelect={handleSelect} />
                </div>

                {/* Right: detail */}
                <div
                    className={css({
                        display: showMobileDetail
                            ? { base: 'flex', md: 'flex' }
                            : { base: 'none', md: 'flex' },
                        flexDirection: 'column',
                        overflow: 'hidden',
                    })}
                >
                    {selectedIngredient ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setSelectedId(null)}
                                className={css({
                                    display: { base: 'flex', md: 'none' },
                                    alignItems: 'center',
                                    gap: '1.5',
                                    paddingX: '3',
                                    paddingY: '2',
                                    borderBottomWidth: '1px',
                                    borderColor: 'border.muted',
                                    fontSize: 'sm',
                                    fontWeight: '500',
                                    color: 'foreground.muted',
                                    bg: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    flexShrink: '0',
                                    _hover: { color: 'foreground' },
                                })}
                            >
                                <ArrowLeft size={14} />
                                Zurueck zur Liste
                            </button>
                            <div
                                className={css({
                                    flex: '1',
                                    overflowY: 'auto',
                                    padding: { base: '4', md: '5' },
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
                        </>
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
                                Zutat aus der Liste auswaehlen
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
