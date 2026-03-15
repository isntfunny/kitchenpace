'use client';

import { ingredientDisplayName } from '@app/lib/ingredient-display';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface Ingredient {
    name: string;
    pluralName?: string | null;
    amount: number;
    unit: string;
    notes?: string | null;
}

interface IngredientListProps {
    ingredients: Ingredient[];
    servings: number;
    originalServings: number;
    onServingsChange: (servings: number) => void;
    calories?: number | null;
    formatAmount: (amount: number) => string;
}

export function IngredientList({
    ingredients,
    servings,
    originalServings,
    onServingsChange,
    calories,
    formatAmount,
}: IngredientListProps) {
    return (
        <div
            className={css({
                bg: 'surface',
                borderRadius: '2xl',
                p: '5',
                boxShadow: 'shadow.medium',
            })}
        >
            <h2
                className={css({
                    fontFamily: 'heading',
                    fontSize: 'xl',
                    fontWeight: '600',
                    mb: '3',
                })}
            >
                Zutaten
            </h2>

            <div
                className={css({
                    mb: '4',
                    p: '3',
                    bg: 'light',
                    borderRadius: 'xl',
                })}
            >
                <label
                    className={css({
                        display: 'block',
                        fontSize: 'sm',
                        color: 'text-muted',
                        mb: '2',
                        fontFamily: 'body',
                    })}
                >
                    Portionen
                </label>
                <div className={flex({ gap: '2', align: 'center' })}>
                    <button
                        onClick={() => onServingsChange(Math.max(1, servings - 1))}
                        className={css({
                            w: '10',
                            h: '10',
                            borderRadius: 'full',
                            bg: 'surface',
                            border: '1px solid',
                            borderColor: 'border',
                            cursor: 'pointer',
                            fontSize: 'xl',
                            _hover: { bg: 'light' },
                        })}
                    >
                        −
                    </button>
                    <span
                        className={css({
                            fontSize: 'xl',
                            fontWeight: '600',
                            minW: '12',
                            textAlign: 'center',
                            fontFamily: 'heading',
                        })}
                    >
                        {servings}
                    </span>
                    <button
                        onClick={() => onServingsChange(servings + 1)}
                        className={css({
                            w: '10',
                            h: '10',
                            borderRadius: 'full',
                            bg: 'surface',
                            border: '1px solid',
                            borderColor: 'border',
                            cursor: 'pointer',
                            fontSize: 'xl',
                            _hover: { bg: 'light' },
                        })}
                    >
                        +
                    </button>
                </div>
            </div>

            <ul className={css({ spaceY: '2' })}>
                {ingredients.map((ingredient, index) => (
                    <li
                        key={index}
                        className={flex({
                            justify: 'space-between',
                            align: 'center',
                            p: '2',
                            bg: 'light',
                            borderRadius: 'lg',
                            fontFamily: 'body',
                        })}
                    >
                        <div>
                            <span className={css({ fontWeight: '500' })}>
                                {ingredientDisplayName(
                                    ingredient.name,
                                    ingredient.pluralName ?? null,
                                    String(ingredient.amount),
                                )}
                            </span>
                            {ingredient.notes && (
                                <span
                                    className={css({
                                        display: 'block',
                                        fontSize: 'xs',
                                        color: 'text-muted',
                                        fontStyle: 'italic',
                                    })}
                                >
                                    {ingredient.notes}
                                </span>
                            )}
                        </div>
                        <span className={css({ color: 'text-muted' })}>
                            {formatAmount(ingredient.amount)} {ingredient.unit}
                        </span>
                    </li>
                ))}
            </ul>

            {calories != null && calories > 0 && (
                <div
                    className={css({
                        mt: '3',
                        pt: '3',
                        borderTop: '1px solid',
                        borderColor: 'border',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 'sm',
                        color: 'text-muted',
                    })}
                >
                    <span>Kalorien</span>
                    <span className={css({ fontWeight: '600', color: 'text' })}>
                        {Math.round(calories * (servings / originalServings))} kcal
                    </span>
                </div>
            )}
        </div>
    );
}
