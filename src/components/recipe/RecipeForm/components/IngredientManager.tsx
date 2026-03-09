'use client';

import { MessageSquare, X } from 'lucide-react';
import { useState } from 'react';

import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';


import { AddedIngredient, IngredientSearchResult } from '../data';

import { SegmentedBar } from './SegmentedBar';

const SERVING_PRESETS = [1, 2, 4, 6, 8] as const;
const SERVING_LABELS = SERVING_PRESETS.map(String);

const UNIT_PRESETS = ['g', 'ml', 'EL', 'TL', 'Stk'] as const;
const UNIT_LABELS = [...UNIT_PRESETS] as string[];

interface IngredientManagerProps {
    servings: number;
    onServingsChange: (value: number) => void;
    ingredientQuery: string;
    onIngredientQueryChange: (value: string) => void;
    searchResults: IngredientSearchResult[];
    showNewIngredient: boolean;
    onShowNewIngredient: (value: boolean) => void;
    newIngredientName: string;
    onNewIngredientNameChange: (value: string) => void;
    newIngredientUnit: string;
    onNewIngredientUnitChange: (value: string) => void;
    onCreateNewIngredient: () => void;
    ingredients: AddedIngredient[];
    onAddIngredient: (ingredient: IngredientSearchResult) => void;
    onUpdateIngredient: (index: number, changes: Partial<AddedIngredient>) => void;
    onRemoveIngredient: (index: number) => void;
}

export function IngredientManager({
    servings,
    onServingsChange,
    ingredientQuery,
    onIngredientQueryChange,
    searchResults,
    showNewIngredient,
    onShowNewIngredient,
    newIngredientName,
    onNewIngredientNameChange,
    newIngredientUnit,
    onNewIngredientUnitChange,
    onCreateNewIngredient,
    ingredients,
    onAddIngredient,
    onUpdateIngredient,
    onRemoveIngredient,
}: IngredientManagerProps) {
    const unitActiveIndex = UNIT_PRESETS.indexOf(newIngredientUnit as (typeof UNIT_PRESETS)[number]);

    const handleNeu = () => {
        onNewIngredientNameChange(ingredientQuery);
        onNewIngredientUnitChange('g');
        onShowNewIngredient(true);
    };

    return (
        <div>
            {/* Servings */}
            <div className={css({ mb: '4' })}>
                <label className={labelSmClass}>Portionen</label>
                <SegmentedBar
                    items={SERVING_LABELS}
                    activeIndex={SERVING_PRESETS.indexOf(servings as (typeof SERVING_PRESETS)[number])}
                    onSelect={(i) => onServingsChange(
                        SERVING_PRESETS.indexOf(servings as (typeof SERVING_PRESETS)[number]) === i ? 1 : SERVING_PRESETS[i],
                    )}
                    trackingName="servings"
                    customInput={{ value: servings, onChange: onServingsChange, placeholder: 'z.B. 3' }}
                />
            </div>

            {/* Ingredient search */}
            <label className={labelClass}>Zutaten *</label>
            <div className={css({ position: 'relative', mb: '4' })}>
                <input
                    type="text"
                    value={ingredientQuery}
                    onChange={(e) => {
                        onIngredientQueryChange(e.target.value);
                        onShowNewIngredient(false);
                    }}
                    placeholder="Zutat suchen oder neu erstellen..."
                    className={inputClass}
                />

                {/* Search results dropdown */}
                {searchResults.length > 0 && !showNewIngredient && (
                    <div className={dropdownClass}>
                        {searchResults.map((ing) => (
                            <button
                                key={ing.id}
                                type="button"
                                onClick={() => onAddIngredient(ing)}
                                className={resultBtnClass}
                            >
                                <span className={css({ fontWeight: '500' })}>{ing.name}</span>
                                <span className={css({ color: 'text-muted', fontSize: 'sm', ml: '2' })}>
                                    {ing.category || 'Ohne Kategorie'}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* "+ Neu" button inside search field */}
                {ingredientQuery.length >= 2 && !showNewIngredient && (
                    <button
                        type="button"
                        onClick={handleNeu}
                        className={neuBtnClass}
                        style={{ background: PALETTE.orange }}
                    >
                        + Neu
                    </button>
                )}

                {/* Inline new ingredient creation */}
                {showNewIngredient && (
                    <div className={newCardClass}>
                        <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '3' })}>
                            <input
                                type="text"
                                value={newIngredientName}
                                onChange={(e) => onNewIngredientNameChange(e.target.value)}
                                placeholder="Name der Zutat"
                                autoFocus
                                className={css({
                                    flex: '1',
                                    padding: '2',
                                    borderRadius: 'lg',
                                    fontSize: 'sm',
                                    fontWeight: '500',
                                    outline: 'none',
                                })}
                                style={{ border: `1px solid ${PALETTE.orange}40` }}
                            />
                        </div>
                        <div className={css({ mb: '3' })}>
                            <span className={css({ fontSize: 'xs', fontWeight: '600', color: 'foreground.muted', display: 'block', mb: '1' })}>
                                Einheit
                            </span>
                            <SegmentedBar
                                items={UNIT_LABELS}
                                activeIndex={unitActiveIndex}
                                onSelect={(i) => onNewIngredientUnitChange(UNIT_PRESETS[i])}
                                trackingName="ingredient_unit"
                                customInput={{
                                    type: 'string',
                                    value: unitActiveIndex === -1 ? newIngredientUnit : '',
                                    onChange: onNewIngredientUnitChange,
                                    placeholder: 'z.B. Prise, Bund',
                                }}
                            />
                        </div>
                        <div className={css({ display: 'flex', gap: '2' })}>
                            <button
                                type="button"
                                onClick={onCreateNewIngredient}
                                className={css({
                                    flex: '1',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'lg',
                                    py: '2',
                                    fontWeight: '600',
                                    fontSize: 'sm',
                                    cursor: 'pointer',
                                })}
                                style={{ background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})` }}
                            >
                                Erstellen
                            </button>
                            <button
                                type="button"
                                onClick={() => onShowNewIngredient(false)}
                                className={css({
                                    flex: '1',
                                    bg: 'transparent',
                                    color: 'text',
                                    borderRadius: 'lg',
                                    py: '2',
                                    fontSize: 'sm',
                                    cursor: 'pointer',
                                })}
                                style={{ border: `1px solid ${PALETTE.orange}40` }}
                            >
                                Abbrechen
                            </button>
                        </div>
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
                    title={ing.isOptional ? 'Optional (klicken zum Ändern)' : 'Pflicht (klicken für optional)'}
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
                        color: '#aaa',
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
    bg: 'rgba(224,70,70,0.06)',
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

const inputClass = css({
    width: '100%',
    padding: '3',
    borderRadius: 'xl',
    border: '1px solid rgba(224,123,83,0.4)',
    fontSize: 'md',
    outline: 'none',
    _focus: { borderColor: 'palette.orange', boxShadow: '0 0 0 3px rgba(224,123,83,0.15)' },
});

const dropdownClass = css({
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    bg: 'white',
    borderRadius: 'xl',
    boxShadow: 'lg',
    zIndex: '10',
    maxH: '200px',
    overflowY: 'auto',
});

const resultBtnClass = css({
    width: '100%',
    padding: '3',
    textAlign: 'left',
    bg: 'transparent',
    border: 'none',
    cursor: 'pointer',
    _hover: { bg: 'rgba(224,123,83,0.1)' },
});

const neuBtnClass = css({
    position: 'absolute',
    right: '2',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'white',
    border: 'none',
    borderRadius: 'lg',
    px: '3',
    py: '1',
    fontSize: 'sm',
    fontWeight: '600',
    cursor: 'pointer',
});

const newCardClass = css({
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    bg: 'white',
    borderRadius: 'xl',
    boxShadow: 'lg',
    p: '4',
    zIndex: '10',
});

