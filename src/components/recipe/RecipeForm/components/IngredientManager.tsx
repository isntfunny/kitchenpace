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
import { useCallback, useState } from 'react';

import type { ParsedIngredientInput } from '@app/lib/ingredients/parseIngredientInput';

import { css } from 'styled-system/css';

import { type AddedIngredient, type IngredientSearchResult } from '../data';

import { IngredientCard } from './IngredientCard';
import { IngredientSearchInput } from './IngredientSearchInput';
import { SegmentedBar } from './SegmentedBar';

const SERVING_PRESETS = [1, 2, 4, 6, 8] as const;
const SERVING_LABELS = SERVING_PRESETS.map(String);

interface IngredientManagerProps {
    servings: number;
    onServingsChange: (value: number) => void;
    ingredients: AddedIngredient[];
    onAddIngredient: (ingredient: IngredientSearchResult) => void;
    onAddNewIngredient: (name: string) => Promise<void>;
    onUpdateIngredient: (index: number, changes: Partial<AddedIngredient>) => void;
    onRemoveIngredient: (index: number) => void;
    onReorderIngredients?: (newOrder: AddedIngredient[]) => void;
    onReplaceIngredient?: (index: number, replacement: IngredientSearchResult) => void;
    onServingsCustomTriggerClick?: () => void;
    onIngredientAmountFocus?: () => void;
    onIngredientCommentClick?: () => void;
}

export function IngredientManager({
    servings,
    onServingsChange,
    ingredients,
    onAddIngredient,
    onAddNewIngredient,
    onUpdateIngredient,
    onRemoveIngredient,
    onReorderIngredients,
    onReplaceIngredient,
    onServingsCustomTriggerClick,
    onIngredientAmountFocus,
    onIngredientCommentClick,
}: IngredientManagerProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

    const addAndOpen = useCallback(
        (add: () => void) => {
            add();
            setEditingIndex(ingredients.length);
        },
        [ingredients.length],
    );

    /** Apply amount/unit prefill to the newly added card. */
    const applyPrefill = useCallback(
        (idx: number, parsed: ParsedIngredientInput) => {
            const { amount, unit } = parsed;
            if (!amount && !unit) return;
            const changes: Partial<AddedIngredient> = {};
            if (amount) changes.amount = amount;
            if (unit) changes.unit = unit;
            requestAnimationFrame(() => onUpdateIngredient(idx, changes));
        },
        [onUpdateIngredient],
    );

    /** If ingredient already in list, merge parsed values and return true. */
    const tryMergeExisting = useCallback(
        (id: string, name: string, p: ParsedIngredientInput): boolean => {
            const nameLower = name.toLowerCase();
            const idx = ingredients.findIndex(
                (i) =>
                    i.id === id ||
                    i.name.toLowerCase() === nameLower ||
                    i.pluralName?.toLowerCase() === nameLower,
            );
            if (idx === -1) return false;
            const changes: Partial<AddedIngredient> = {};
            if (p.amount) changes.amount = p.amount;
            if (p.unit) changes.unit = p.unit;
            if (Object.keys(changes).length > 0) onUpdateIngredient(idx, changes);
            setEditingIndex(idx);
            return true;
        },
        [ingredients, onUpdateIngredient],
    );

    const handleSelect = useCallback(
        (result: IngredientSearchResult, parsed: ParsedIngredientInput) => {
            if (tryMergeExisting(result.id, result.name, parsed)) return;
            const idx = ingredients.length;
            addAndOpen(() => onAddIngredient(result));
            applyPrefill(idx, parsed);
        },
        [addAndOpen, onAddIngredient, applyPrefill, ingredients.length, tryMergeExisting],
    );

    const handleCreateNew = useCallback(
        async (name: string, parsed: ParsedIngredientInput) => {
            // Check by name or pluralName before creating
            const nameLower = name.toLowerCase();
            const existingIdx = ingredients.findIndex(
                (i) =>
                    i.name.toLowerCase() === nameLower || i.pluralName?.toLowerCase() === nameLower,
            );
            if (existingIdx !== -1) {
                const changes: Partial<AddedIngredient> = {};
                if (parsed.amount) changes.amount = parsed.amount;
                if (parsed.unit) changes.unit = parsed.unit;
                if (Object.keys(changes).length > 0) onUpdateIngredient(existingIdx, changes);
                setEditingIndex(existingIdx);
                return;
            }
            const idx = ingredients.length;
            await onAddNewIngredient(name);
            applyPrefill(idx, parsed);
            setEditingIndex(idx);
        },
        [ingredients, onAddNewIngredient, onUpdateIngredient, applyPrefill],
    );

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
            <div className={css({ mb: '3' })}>
                <IngredientSearchInput
                    onSelect={handleSelect}
                    onCreateNew={handleCreateNew}
                    placeholder="200g Spaghetti, 3 Eier, Apfel..."
                    data-tutorial="ingredient-search"
                />
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
