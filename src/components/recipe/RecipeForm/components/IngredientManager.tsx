'use client';

import {
    closestCenter,
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { searchIngredients, type IngredientSearchResponse } from '@app/components/recipe/actions';
import type { ParsedIngredientInput } from '@app/lib/ingredients/parseIngredientInput';

import { css } from 'styled-system/css';

import { type AddedIngredient, type IngredientSearchResult } from '../data';

import { IngredientCard } from './IngredientCard';
import {
    IngredientAddNewButton,
    IngredientResultItem,
    IngredientSearchDropdown,
} from './IngredientSearchDropdown';
import { SegmentedBar } from './SegmentedBar';

const SERVING_PRESETS = [1, 2, 4, 6, 8] as const;
const SERVING_LABELS = SERVING_PRESETS.map(String);

interface IngredientManagerProps {
    servings: number;
    onServingsChange: (value: number) => void;
    ingredientQuery: string;
    onIngredientQueryChange: (value: string) => void;
    search: IngredientSearchResponse & { isLoading: boolean; cancelDebounce: () => void };
    ingredients: AddedIngredient[];
    onAddIngredient: (ingredient: IngredientSearchResult) => void;
    onAddNewIngredient: (name: string) => Promise<void>;
    onUpdateIngredient: (index: number, changes: Partial<AddedIngredient>) => void;
    onRemoveIngredient: (index: number) => void;
    onReorderIngredients?: (newOrder: AddedIngredient[]) => void;
    onReplaceIngredient?: (index: number, replacement: IngredientSearchResult) => void;
    ingredientSearchRef?: RefObject<HTMLInputElement | null>;
    onServingsCustomTriggerClick?: () => void;
    onIngredientAmountFocus?: () => void;
    onIngredientCommentClick?: () => void;
}

export function IngredientManager({
    servings,
    onServingsChange,
    ingredientQuery,
    onIngredientQueryChange,
    search,
    ingredients,
    onAddIngredient,
    onAddNewIngredient,
    onUpdateIngredient,
    onRemoveIngredient,
    onReorderIngredients,
    onReplaceIngredient,
    ingredientSearchRef,
    onServingsCustomTriggerClick,
    onIngredientAmountFocus,
    onIngredientCommentClick,
}: IngredientManagerProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [showNeuBadge, setShowNeuBadge] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        results: searchResults,
        parsed,
        bestMatch,
        matchType,
        isLoading,
        cancelDebounce,
    } = search;

    // ── DnD ──
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const sortableIds = ingredients.map((_, i) => `ing-${i}`);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const oldIndex = sortableIds.indexOf(String(active.id));
            const newIndex = sortableIds.indexOf(String(over.id));
            if (oldIndex === -1 || newIndex === -1) return;
            onReorderIngredients?.(arrayMove(ingredients, oldIndex, newIndex));
            if (editingIndex === oldIndex) setEditingIndex(newIndex);
            else if (editingIndex !== null) {
                if (oldIndex < editingIndex && newIndex >= editingIndex)
                    setEditingIndex(editingIndex - 1);
                else if (oldIndex > editingIndex && newIndex <= editingIndex)
                    setEditingIndex(editingIndex + 1);
            }
        },
        [ingredients, sortableIds, onReorderIngredients, editingIndex],
    );

    // ── Helpers ──

    const showDropdown = ingredientQuery.length >= 2;

    const topResult = searchResults[0] ?? null;
    const ghostCompletion =
        topResult && ingredientQuery.length >= 1
            ? topResult.name.toLowerCase().startsWith(ingredientQuery.toLowerCase())
                ? topResult.name.slice(ingredientQuery.length)
                : ''
            : '';

    const addAndOpen = useCallback(
        (add: () => void) => {
            add();
            setEditingIndex(ingredients.length);
        },
        [ingredients.length],
    );

    /** Apply amount/unit prefill to the newly added card. */
    const applyPrefill = useCallback(
        (idx: number, overrideParsed?: ParsedIngredientInput) => {
            const { amount, unit } = overrideParsed ?? search.parsed;
            if (!amount && !unit) return;
            const changes: Partial<AddedIngredient> = {};
            if (amount) changes.amount = amount;
            if (unit) changes.unit = unit;
            requestAnimationFrame(() => onUpdateIngredient(idx, changes));
        },
        [search.parsed, onUpdateIngredient],
    );

    const finishSubmit = useCallback(() => {
        setIsSubmitting(false);
        onIngredientQueryChange('');
        setShowNeuBadge(false);
        inputRef.current?.focus();
    }, [onIngredientQueryChange]);

    const addWithParsed = useCallback(
        (result: IngredientSearchResult, overrideParsed?: ParsedIngredientInput) => {
            const idx = ingredients.length;
            addAndOpen(() => onAddIngredient(result));
            applyPrefill(idx, overrideParsed);
            finishSubmit();
        },
        [addAndOpen, onAddIngredient, applyPrefill, ingredients.length, finishSubmit],
    );

    const addNew = useCallback(
        async (overrideName?: string, overrideParsed?: ParsedIngredientInput) => {
            const name = overrideName ?? (parsed.name || ingredientQuery.trim());
            if (!name) return;
            const idx = ingredients.length;
            await onAddNewIngredient(name);
            applyPrefill(idx, overrideParsed);
            setEditingIndex(idx);
            finishSubmit();
        },
        [
            parsed.name,
            ingredientQuery,
            ingredients.length,
            onAddNewIngredient,
            applyPrefill,
            finishSubmit,
        ],
    );

    // ── Key handling ──

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Tab' || e.key === 'ArrowRight') {
            if (ghostCompletion) {
                e.preventDefault();
                addWithParsed(topResult!);
            }
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (!ingredientQuery.trim() || isSubmitting) return;

            // Already have a match from debounced search → use immediately
            if (bestMatch) {
                addWithParsed(bestMatch);
                return;
            }

            // NEU badge already showing → create new ingredient
            if (showNeuBadge) {
                setIsSubmitting(true);
                void addNew();
                return;
            }

            // No results yet (search still loading or debounce pending) → fire immediately
            setIsSubmitting(true);
            cancelDebounce();
            void searchIngredients(ingredientQuery.trim()).then((fresh) => {
                if (fresh.bestMatch) {
                    addWithParsed(fresh.bestMatch, fresh.parsed);
                } else {
                    // No match → create new ingredient directly
                    void addNew(fresh.parsed.name || undefined, fresh.parsed);
                }
            });
        }
    };

    const handleQueryChange = (value: string) => {
        onIngredientQueryChange(value);
        if (showNeuBadge) setShowNeuBadge(false);
    };

    const busy = isSubmitting || isLoading;

    return (
        <div>
            {/* Servings */}
            <div className={css({ mb: '4' })} data-tutorial="servings-bar">
                <label className={labelClass}>Portionen</label>
                <SegmentedBar
                    items={SERVING_LABELS}
                    activeIndex={SERVING_PRESETS.indexOf(
                        servings as (typeof SERVING_PRESETS)[number],
                    )}
                    onSelect={(i) =>
                        onServingsChange(
                            SERVING_PRESETS.indexOf(
                                servings as (typeof SERVING_PRESETS)[number],
                            ) === i
                                ? 1
                                : SERVING_PRESETS[i],
                        )
                    }
                    trackingName="servings"
                    customInput={{
                        value: servings,
                        onChange: onServingsChange,
                        placeholder: 'z.B. 3',
                    }}
                    customTriggerDataTutorial="servings-custom-trigger"
                    onCustomTriggerClick={onServingsCustomTriggerClick}
                />
            </div>

            {/* Ingredient search */}
            <label className={labelClass}>Zutaten *</label>
            <div className={css({ position: 'relative', mb: '3' })}>
                {/* Ghost text overlay */}
                <div className={ghostOverlayClass} aria-hidden>
                    <span style={{ visibility: 'hidden', whiteSpace: 'pre' }}>
                        {ingredientQuery}
                    </span>
                    <span className={ghostTextClass}>{ghostCompletion}</span>
                </div>
                <input
                    ref={(node) => {
                        inputRef.current = node;
                        if (ingredientSearchRef) ingredientSearchRef.current = node;
                    }}
                    type="text"
                    value={ingredientQuery}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    placeholder="200g Spaghetti, 3 Eier, Apfel..."
                    className={inputClass}
                    style={{ background: 'transparent', position: 'relative' }}
                    autoComplete="off"
                    data-tutorial="ingredient-search"
                />

                {/* Right-side badge: loading spinner / match dot / NEU badge */}
                {ingredientQuery.length >= 2 && (
                    <div className={badgeSlotClass}>
                        {busy ? (
                            <Loader2 size={14} className={spinnerClass} />
                        ) : showNeuBadge ? (
                            <span className={neuBadgeClass}>NEU</span>
                        ) : bestMatch ? (
                            <span className={matchDotClass} title={`Match: ${bestMatch.name}`} />
                        ) : null}
                    </div>
                )}

                {/* Dropdown */}
                {showDropdown &&
                    !busy &&
                    (searchResults.length > 0 || ingredientQuery.length >= 2) && (
                        <IngredientSearchDropdown data-tutorial-child="ingredient-search">
                            {searchResults.map((ing) => (
                                <IngredientResultItem
                                    key={ing.id}
                                    result={ing}
                                    categoryFallback="Ohne Kategorie"
                                    isMatch={ing.id === bestMatch?.id}
                                    onClick={() => {
                                        addWithParsed(ing);
                                    }}
                                />
                            ))}
                            {matchType === 'none' && (
                                <IngredientAddNewButton
                                    name={parsed.name || ingredientQuery.trim()}
                                    onClick={() => void addNew()}
                                />
                            )}
                        </IngredientSearchDropdown>
                    )}
            </div>

            {/* Ingredient cards */}
            {ingredients.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                        <div className={cardListClass} data-tutorial-child="ingredient-search">
                            {ingredients.map((ing, index) => (
                                <IngredientCard
                                    key={`${ing.id}-${index}`}
                                    sortableId={sortableIds[index]}
                                    ing={ing}
                                    index={index}
                                    editing={editingIndex === index}
                                    onEditingChange={(open) => setEditingIndex(open ? index : null)}
                                    onUpdate={onUpdateIngredient}
                                    onRemove={onRemoveIngredient}
                                    onReplace={onReplaceIngredient}
                                    onAmountFocus={
                                        index === 0 ? onIngredientAmountFocus : undefined
                                    }
                                    onCommentClick={
                                        index === 0 ? onIngredientCommentClick : undefined
                                    }
                                    isTutorialTarget={index === 0}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            <p
                className={css({
                    mt: '3',
                    fontSize: 'xs',
                    color: 'text.muted',
                    fontStyle: 'italic',
                })}
            >
                Nährwerte werden automatisch aus den Zutaten berechnet.
            </p>
        </div>
    );
}

/* ── Styles ─────────────────────────────────────────────── */

const labelClass = css({
    fontWeight: '600',
    display: 'block',
    mb: '2',
    fontSize: 'sm',
});

const cardListClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
});

const ghostOverlayClass = css({
    position: 'absolute',
    inset: '0',
    padding: '3',
    borderRadius: 'xl',
    fontSize: 'md',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    color: 'text',
});

const ghostTextClass = css({
    color: { base: 'rgba(0,0,0,0.3)', _dark: 'rgba(255,255,255,0.28)' },
});

const inputClass = css({
    width: '100%',
    padding: '3',
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.4)', _dark: 'rgba(224,123,83,0.45)' },
    fontSize: 'md',
    outline: 'none',
    bg: { base: 'transparent', _dark: 'surface' },
    color: 'text',
    _focus: {
        borderColor: 'palette.orange',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.15)',
            _dark: '0 0 0 3px rgba(224,123,83,0.2)',
        },
    },
    _disabled: {
        opacity: '0.6',
        cursor: 'wait',
    },
});

const badgeSlotClass = css({
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: '5',
    display: 'flex',
    alignItems: 'center',
});

const neuBadgeClass = css({
    fontSize: '9px',
    fontWeight: '700',
    px: '2',
    py: '0.5',
    borderRadius: 'md',
    color: 'white',
    bg: 'palette.orange',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    lineHeight: '1',
    pointerEvents: 'none',
});

const matchDotClass = css({
    width: '8px',
    height: '8px',
    borderRadius: 'full',
    bg: 'palette.orange',
    pointerEvents: 'none',
});

const spinnerClass = css({
    color: 'text.muted',
    animation: 'spin 1s linear infinite',
});
