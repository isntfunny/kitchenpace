'use client';

import { Check, X } from 'lucide-react';
import { Checkbox } from 'radix-ui';

import { css } from 'styled-system/css';

import { AddedIngredient, IngredientSearchResult } from '../data';

interface IngredientManagerProps {
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
    const inputClass = css({
        width: '100%',
        padding: '3',
        borderRadius: 'xl',
        border: '1px solid rgba(224,123,83,0.4)',
        fontSize: 'md',
        outline: 'none',
        _focus: {
            borderColor: '#e07b53',
            boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
        },
    });

    const searchContainerClass = css({ position: 'relative', mb: '4' });
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

    const resultButtonClass = css({
        width: '100%',
        padding: '3',
        textAlign: 'left',
        bg: 'transparent',
        border: 'none',
        cursor: 'pointer',
        _hover: { bg: 'rgba(224,123,83,0.1)' },
    });

    const newIngredientCardClass = css({
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

    const labelClass = css({ fontWeight: '600', display: 'block', mb: '2' });

    return (
        <div>
            <label className={labelClass}>Zutaten *</label>
            <div className={searchContainerClass}>
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

                {searchResults.length > 0 && (
                    <div className={dropdownClass}>
                        {searchResults.map((ing) => (
                            <button
                                key={ing.id}
                                type="button"
                                onClick={() => onAddIngredient(ing)}
                                className={resultButtonClass}
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
                    </div>
                )}

                {ingredientQuery.length >= 2 && !showNewIngredient && (
                    <button
                        type="button"
                        onClick={() => onShowNewIngredient(true)}
                        className={css({
                            position: 'absolute',
                            right: '2',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            bg: '#e07b53',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'lg',
                            px: '3',
                            py: '1',
                            fontSize: 'sm',
                            cursor: 'pointer',
                        })}
                    >
                        + Neu
                    </button>
                )}

                {showNewIngredient && (
                    <div className={newIngredientCardClass}>
                        <div className={css({ fontWeight: '600', mb: '2' })}>
                            Neue Zutat erstellen
                        </div>
                        <input
                            type="text"
                            value={newIngredientName}
                            onChange={(e) => onNewIngredientNameChange(e.target.value)}
                            placeholder="Name der Zutat"
                            className={css({
                                width: '100%',
                                padding: '2',
                                borderRadius: 'lg',
                                border: '1px solid rgba(224,123,83,0.4)',
                                mb: '2',
                            })}
                        />
                        <input
                            type="text"
                            value={newIngredientUnit}
                            onChange={(e) => onNewIngredientUnitChange(e.target.value)}
                            placeholder="Einheit (z.B. g, ml, Stück)"
                            className={css({
                                width: '100%',
                                padding: '2',
                                borderRadius: 'lg',
                                border: '1px solid rgba(224,123,83,0.4)',
                                mb: '3',
                            })}
                        />
                        <div className={css({ display: 'flex', gap: '2' })}>
                            <button
                                type="button"
                                onClick={onCreateNewIngredient}
                                className={css({
                                    flex: '1',
                                    bg: '#e07b53',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'lg',
                                    py: '2',
                                    cursor: 'pointer',
                                })}
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
                                    border: '1px solid rgba(224,123,83,0.4)',
                                    borderRadius: 'lg',
                                    py: '2',
                                    cursor: 'pointer',
                                })}
                            >
                                Abbrechen
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {ingredients.length > 0 && (
                <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
                    {ingredients.map((ing, index) => (
                        <div
                            key={`${ing.id}-${index}`}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                padding: '3',
                                bg: 'rgba(224,123,83,0.05)',
                                borderRadius: 'xl',
                            })}
                        >
                            <span className={css({ flex: '1', fontWeight: '500' })}>
                                {ing.name}
                            </span>
                            <input
                                type="text"
                                value={ing.amount}
                                onChange={(e) =>
                                    onUpdateIngredient(index, { amount: e.target.value })
                                }
                                placeholder="Menge"
                                className={css({
                                    width: '80px',
                                    padding: '2',
                                    borderRadius: 'lg',
                                    border: '1px solid rgba(224,123,83,0.3)',
                                    fontSize: 'sm',
                                    textAlign: 'center',
                                })}
                            />
                            <input
                                type="text"
                                value={ing.unit}
                                onChange={(e) =>
                                    onUpdateIngredient(index, { unit: e.target.value })
                                }
                                placeholder="Einheit"
                                className={css({
                                    width: '80px',
                                    padding: '2',
                                    borderRadius: 'lg',
                                    border: '1px solid rgba(224,123,83,0.3)',
                                    fontSize: 'sm',
                                    textAlign: 'center',
                                })}
                            />
                            <label
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1',
                                    fontSize: 'sm',
                                })}
                            >
                                <Checkbox.Root
                                    checked={ing.isOptional}
                                    onCheckedChange={(checked) =>
                                        onUpdateIngredient(index, { isOptional: checked === true })
                                    }
                                    className={css({
                                        width: '4',
                                        height: '4',
                                        backgroundColor: 'white',
                                        borderRadius: 'sm',
                                        border: '2px solid',
                                        borderColor: ing.isOptional ? 'brand.primary' : 'gray.300',
                                        cursor: 'pointer',
                                        transition: 'all 150ms ease',
                                        _hover: { borderColor: 'brand.primary' },
                                        '&[data-state="checked"]': {
                                            backgroundColor: 'brand.primary',
                                            borderColor: 'brand.primary',
                                        },
                                    })}
                                >
                                    <Checkbox.Indicator>
                                        <Check color="white" size={12} />
                                    </Checkbox.Indicator>
                                </Checkbox.Root>
                                Optional
                            </label>
                            <button
                                type="button"
                                onClick={() => onRemoveIngredient(index)}
                                className={css({
                                    bg: 'transparent',
                                    border: 'none',
                                    color: '#e07b53',
                                    fontSize: 'lg',
                                    cursor: 'pointer',
                                    padding: '1',
                                })}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
