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
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import {
    buildIngredientParser,
    levenshtein,
    type ParsedIngredientInput,
    type UnitEntry,
} from '@app/lib/ingredients/parseIngredientInput';

import { css } from 'styled-system/css';

import { getUnitNames } from '../../actions';
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
    searchResults: IngredientSearchResult[];
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

/** Find a search result matching the parsed name exactly (name or alias). */
function findExactMatch(
    results: IngredientSearchResult[],
    name: string,
): IngredientSearchResult | null {
    const lower = name.toLowerCase();
    return (
        results.find(
            (r) => r.name.toLowerCase() === lower || r.matchedAlias?.toLowerCase() === lower,
        ) ?? null
    );
}

/** Find closest fuzzy match using Levenshtein distance. */
function findFuzzyMatch(
    results: IngredientSearchResult[],
    name: string,
): IngredientSearchResult | null {
    const lower = name.toLowerCase();
    const maxDist = lower.length <= 8 ? 2 : 3;

    let best: IngredientSearchResult | null = null;
    let bestDist = Infinity;

    for (const r of results) {
        const dist = levenshtein(r.name.toLowerCase(), lower);
        if (dist <= maxDist && dist < bestDist) {
            best = r;
            bestDist = dist;
        }
    }
    return best;
}

export function IngredientManager({
    servings,
    onServingsChange,
    ingredientQuery,
    onIngredientQueryChange,
    searchResults,
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
            // Update editing index to follow the moved card
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
    const pendingPrefillRef = useRef<{ amount: string; unit: string | null } | null>(null);

    // ── Parser: fetch unit names once, build parser ──
    const [parser, setParser] = useState<((raw: string) => ParsedIngredientInput) | null>(null);

    useEffect(() => {
        let cancelled = false;
        getUnitNames().then((units: UnitEntry[]) => {
            if (!cancelled) {
                const parse = buildIngredientParser(units);
                setParser(() => parse);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const showDropdown = ingredientQuery.length >= 2;
    const showAddNew = ingredientQuery.length >= 2;

    // Ghost autocomplete
    const topResult = searchResults[0] ?? null;
    const ghostCompletion =
        topResult && ingredientQuery.length >= 1
            ? topResult.name.toLowerCase().startsWith(ingredientQuery.toLowerCase())
                ? topResult.name.slice(ingredientQuery.length)
                : ''
            : '';

    // ── Add helpers ──

    const addAndOpen = useCallback(
        (add: () => void) => {
            add();
            setEditingIndex(ingredients.length);
        },
        [ingredients.length],
    );

    /** Apply pending prefill after ingredient was added. */
    const applyPrefill = useCallback(
        (newIndex: number) => {
            const prefill = pendingPrefillRef.current;
            if (!prefill) return;
            pendingPrefillRef.current = null;
            const changes: Partial<AddedIngredient> = {};
            if (prefill.amount) changes.amount = prefill.amount;
            if (prefill.unit) changes.unit = prefill.unit;
            if (Object.keys(changes).length > 0) {
                // Apply in next tick after state update
                requestAnimationFrame(() => onUpdateIngredient(newIndex, changes));
            }
        },
        [onUpdateIngredient],
    );

    // Watch for new ingredients to apply prefill
    const prevCountRef = useRef(ingredients.length);
    useEffect(() => {
        if (ingredients.length > prevCountRef.current) {
            applyPrefill(ingredients.length - 1);
        }
        prevCountRef.current = ingredients.length;
    }, [ingredients.length, applyPrefill]);

    const addWithPrefill = useCallback(
        (result: IngredientSearchResult, parsed: ParsedIngredientInput) => {
            if (parsed.amount || parsed.unit) {
                pendingPrefillRef.current = { amount: parsed.amount, unit: parsed.unit };
            }
            addAndOpen(() => onAddIngredient(result));
            onIngredientQueryChange('');
            setShowNeuBadge(false);
            inputRef.current?.focus();
        },
        [addAndOpen, onAddIngredient, onIngredientQueryChange],
    );

    const addNewWithPrefill = useCallback(
        async (parsed: ParsedIngredientInput) => {
            if (parsed.amount || parsed.unit) {
                pendingPrefillRef.current = { amount: parsed.amount, unit: parsed.unit };
            }
            await onAddNewIngredient(parsed.name);
            setEditingIndex(ingredients.length);
            onIngredientQueryChange('');
            setShowNeuBadge(false);
            inputRef.current?.focus();
        },
        [ingredients.length, onAddNewIngredient, onIngredientQueryChange],
    );

    // ── Key handling ──

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Tab' || e.key === 'ArrowRight') {
            if (ghostCompletion) {
                e.preventDefault();
                addAndOpen(() => onAddIngredient(topResult!));
                onIngredientQueryChange('');
                inputRef.current?.focus();
            }
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmed = ingredientQuery.trim();
            if (!trimmed) return;

            const parsed = parser ? parser(trimmed) : { name: trimmed, amount: '', unit: null };
            const searchName = parsed.name;

            // Try exact match
            const exact = findExactMatch(searchResults, searchName);
            if (exact) {
                addWithPrefill(exact, parsed);
                return;
            }

            // Try fuzzy match
            const fuzzy = findFuzzyMatch(searchResults, searchName);
            if (fuzzy) {
                addWithPrefill(fuzzy, parsed);
                return;
            }

            // No match: if NEU badge is already showing, create new
            if (showNeuBadge) {
                void addNewWithPrefill(parsed);
                return;
            }

            // First Enter with no match → show NEU badge
            setShowNeuBadge(true);
        }
    };

    // Hide NEU badge when query changes
    const handleQueryChange = (value: string) => {
        onIngredientQueryChange(value);
        if (showNeuBadge) setShowNeuBadge(false);
    };

    const handleAddNew = async () => {
        const trimmed = ingredientQuery.trim();
        if (!trimmed) return;
        const parsed = parser ? parser(trimmed) : { name: trimmed, amount: '', unit: null };
        await addNewWithPrefill(parsed);
    };

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
                    placeholder="200g Spaghetti, 3 Eier, Apfel..."
                    className={inputClass}
                    style={{ background: 'transparent', position: 'relative' }}
                    autoComplete="off"
                    data-tutorial="ingredient-search"
                />

                {/* NEU badge — shown when no match, next Enter creates */}
                {showNeuBadge && <div className={neuBadgeClass}>NEU</div>}

                {/* Dropdown: search results + add-new option */}
                {showDropdown && (searchResults.length > 0 || showAddNew) && (
                    <IngredientSearchDropdown data-tutorial-child="ingredient-search">
                        {searchResults.map((ing) => (
                            <IngredientResultItem
                                key={ing.id}
                                result={ing}
                                categoryFallback="Ohne Kategorie"
                                onClick={() => {
                                    addAndOpen(() => onAddIngredient(ing));
                                    onIngredientQueryChange('');
                                    inputRef.current?.focus();
                                }}
                            />
                        ))}
                        {showAddNew && (
                            <IngredientAddNewButton
                                name={ingredientQuery.trim()}
                                onClick={handleAddNew}
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
});

const neuBadgeClass = css({
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
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
    zIndex: '5',
});
