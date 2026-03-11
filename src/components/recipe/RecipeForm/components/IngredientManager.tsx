'use client';

import { MessageSquare, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';

import { AddedIngredient, IngredientSearchResult } from '../data';

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
}: IngredientManagerProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const showDropdown = ingredientQuery.length >= 2;
    const showAddNew = ingredientQuery.length >= 2;

    // Ghost autocomplete: top result whose name starts with the current query
    const topResult = searchResults[0] ?? null;
    const ghostCompletion =
        topResult && ingredientQuery.length >= 1
            ? topResult.name.toLowerCase().startsWith(ingredientQuery.toLowerCase())
                ? topResult.name.slice(ingredientQuery.length)
                : ''
            : '';

    const acceptGhost = () => {
        if (!ghostCompletion || !topResult) return;
        onAddIngredient(topResult);
        onIngredientQueryChange('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (ghostCompletion && (e.key === 'Tab' || e.key === 'ArrowRight')) {
            e.preventDefault();
            acceptGhost();
        }
    };

    const handleAddNew = async () => {
        const name = ingredientQuery.trim();
        if (!name) return;
        await onAddNewIngredient(name);
        onIngredientQueryChange('');
    };

    return (
        <div>
            {/* Servings */}
            <div className={css({ mb: '4' })}>
                <label className={labelSmClass}>Portionen</label>
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
                />
            </div>

            {/* Ingredient search */}
            <label className={labelClass}>Zutaten *</label>
            <div className={css({ position: 'relative', mb: '4' })}>
                {/* Ghost text overlay — sits behind the input, same padding/font */}
                <div className={ghostOverlayClass} aria-hidden>
                    <span style={{ visibility: 'hidden', whiteSpace: 'pre' }}>
                        {ingredientQuery}
                    </span>
                    <span className={ghostTextClass}>{ghostCompletion}</span>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={ingredientQuery}
                    onChange={(e) => onIngredientQueryChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Zutat suchen oder hinzufügen..."
                    className={inputClass}
                    style={{ background: 'transparent', position: 'relative' }}
                    autoComplete="off"
                />

                {/* Dropdown: search results + add-new option */}
                {showDropdown && (searchResults.length > 0 || showAddNew) && (
                    <div className={dropdownClass} onMouseDown={(e) => e.preventDefault()}>
                        {searchResults.map((ing) => (
                            <button
                                key={ing.id}
                                type="button"
                                onClick={() => {
                                    onAddIngredient(ing);
                                    onIngredientQueryChange('');
                                }}
                                className={resultBtnClass}
                            >
                                <span className={css({ fontWeight: '500' })}>{ing.name}</span>
                                <span
                                    className={css({
                                        color: 'text-muted',
                                        fontSize: 'sm',
                                        ml: '2',
                                    })}
                                >
                                    {ing.category || 'Ohne Kategorie'}
                                </span>
                            </button>
                        ))}
                        {showAddNew && (
                            <button type="button" onClick={handleAddNew} className={addNewBtnClass}>
                                <span
                                    className={css({
                                        color: PALETTE.orange,
                                        fontWeight: '700',
                                        mr: '1',
                                    })}
                                >
                                    +
                                </span>
                                <span>&ldquo;{ingredientQuery.trim()}&rdquo; hinzufügen</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Added ingredients list */}
            {ingredients.length > 0 && (
                <div
                    className={css({ borderRadius: 'lg', overflow: 'hidden' })}
                    style={{ border: `1px solid ${PALETTE.orange}50` }}
                >
                    {ingredients.map((ing, index) => (
                        <IngredientRow
                            key={`${ing.id}-${index}`}
                            ing={ing}
                            index={index}
                            isLast={index === ingredients.length - 1}
                            onUpdate={onUpdateIngredient}
                            onRemove={onRemoveIngredient}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function IngredientRow({
    ing,
    index,
    isLast,
    onUpdate,
    onRemove,
}: {
    ing: AddedIngredient;
    index: number;
    isLast: boolean;
    onUpdate: (index: number, changes: Partial<AddedIngredient>) => void;
    onRemove: (index: number) => void;
}) {
    const [showNotes, setShowNotes] = useState(Boolean(ing.notes));

    return (
        <div
            className={css({ display: 'flex', flexDir: 'column' })}
            style={!isLast ? { borderBottom: `1px solid ${PALETTE.orange}50` } : undefined}
        >
            {/* Main row */}
            <div className={css({ display: 'flex', alignItems: 'center', minHeight: '44px' })}>
                {/* Name */}
                <span
                    className={css({
                        flex: '1',
                        fontWeight: '600',
                        fontSize: 'sm',
                        px: '3',
                        py: '1',
                        color: 'text',
                        minWidth: '0',
                        lineClamp: '2',
                    })}
                >
                    {ing.name}
                </span>

                {/* Amount + Unit merged inputs */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                    })}
                    style={{ borderLeft: `1px solid ${PALETTE.orange}50` }}
                >
                    <input
                        type="text"
                        value={ing.amount}
                        onChange={(e) => onUpdate(index, { amount: e.target.value })}
                        placeholder="!"
                        className={!ing.amount ? amountInputEmptyClass : amountInputClass}
                    />
                    <div
                        className={css({ width: '1px', height: '60%', flexShrink: 0 })}
                        style={{ background: `${PALETTE.orange}50` }}
                    />
                    <input
                        type="text"
                        value={ing.unit}
                        onChange={(e) => onUpdate(index, { unit: e.target.value })}
                        placeholder="–"
                        className={unitInputClass}
                    />
                </div>

                {/* Optional toggle */}
                <button
                    type="button"
                    onClick={() => onUpdate(index, { isOptional: !ing.isOptional })}
                    className={css({
                        height: '100%',
                        px: '2.5',
                        fontSize: 'xs',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                        bg: 'transparent',
                        border: 'none',
                    })}
                    style={{
                        borderLeft: `1px solid ${PALETTE.orange}50`,
                        color: ing.isOptional ? PALETTE.orange : '#aaa',
                    }}
                    title={
                        ing.isOptional
                            ? 'Optional (klicken zum Ändern)'
                            : 'Pflicht (klicken für optional)'
                    }
                >
                    Opt
                </button>

                {/* Notes toggle */}
                <button
                    type="button"
                    onClick={() => setShowNotes(!showNotes)}
                    className={css({
                        height: '100%',
                        px: '2',
                        cursor: 'pointer',
                        bg: 'transparent',
                        border: 'none',
                        transition: 'all 120ms ease',
                    })}
                    style={{
                        borderLeft: `1px solid ${PALETTE.orange}50`,
                        color: ing.notes ? PALETTE.orange : '#aaa',
                    }}
                    title="Hinweis hinzufügen"
                >
                    <MessageSquare size={14} />
                </button>

                {/* Remove */}
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className={css({
                        height: '100%',
                        px: '2.5',
                        cursor: 'pointer',
                        bg: 'transparent',
                        border: 'none',
                        color: 'foreground.muted',
                        transition: 'color 120ms ease',
                        _hover: { color: 'red.500' },
                    })}
                    style={{ borderLeft: `1px solid ${PALETTE.orange}50` }}
                >
                    <X size={15} />
                </button>
            </div>

            {/* Notes row (collapsible) */}
            {showNotes && (
                <input
                    type="text"
                    value={ing.notes}
                    onChange={(e) => onUpdate(index, { notes: e.target.value })}
                    placeholder="Hinweis (z.B. frisch gehackt, fein gewürfelt)"
                    autoFocus={!ing.notes}
                    className={css({
                        width: '100%',
                        padding: '1.5',
                        paddingX: '3',
                        fontSize: 'xs',
                        color: 'text-muted',
                        bg: 'transparent',
                        outline: 'none',
                        _placeholder: { color: 'foreground.muted' },
                    })}
                    style={{ borderTop: `1px solid ${PALETTE.orange}50` }}
                />
            )}
        </div>
    );
}

const amountInputBase = {
    width: '56px',
    height: '100%',
    fontSize: 'md',
    textAlign: 'center' as const,
    outline: 'none',
    bg: 'transparent',
    fontWeight: '600',
};

const amountInputClass = css({
    ...amountInputBase,
    color: 'text',
    _placeholder: { color: 'gray.300' },
});

const amountInputEmptyClass = css({
    ...amountInputBase,
    color: 'text',
    bg: { base: 'rgba(224,70,70,0.06)', _dark: 'rgba(224,70,70,0.1)' },
    _placeholder: { color: '#d44', fontWeight: '700', fontSize: 'lg' },
});

const unitInputClass = css({
    width: '48px',
    height: '100%',
    fontSize: 'sm',
    textAlign: 'center',
    outline: 'none',
    bg: 'transparent',
    color: 'text.muted',
    fontWeight: '600',
    _placeholder: { color: 'gray.300' },
});

const labelSmClass = css({ fontWeight: '600', display: 'block', mb: '2', fontSize: 'sm' });
const labelClass = css({ fontWeight: '600', display: 'block', mb: '2' });

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

const dropdownClass = css({
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    bg: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    boxShadow: { base: 'lg', _dark: '0 10px 25px rgba(0,0,0,0.4)' },
    zIndex: '10',
    maxH: '200px',
    overflowY: 'auto',
    border: { base: 'none', _dark: '1px solid rgba(224,123,83,0.15)' },
});

const resultBtnClass = css({
    width: '100%',
    padding: '3',
    textAlign: 'left',
    bg: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'text',
    _hover: { bg: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' } },
});

const addNewBtnClass = css({
    width: '100%',
    padding: '3',
    textAlign: 'left',
    bg: 'transparent',
    border: 'none',
    borderTop: {
        base: '1px dashed rgba(224,123,83,0.25)',
        _dark: '1px dashed rgba(224,123,83,0.2)',
    },
    cursor: 'pointer',
    color: 'text.muted',
    fontSize: 'sm',
    display: 'flex',
    alignItems: 'center',
    _hover: { bg: { base: 'rgba(224,123,83,0.06)', _dark: 'rgba(224,123,83,0.1)' }, color: 'text' },
});
