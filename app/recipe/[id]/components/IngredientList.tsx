'use client';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface Ingredient {
    name: string;
    amount: number;
    unit: string;
}

interface IngredientListProps {
    ingredients: Ingredient[];
    servings: number;
    originalServings: number;
    onServingsChange: (servings: number) => void;
}

export function IngredientList({
    ingredients,
    servings,
    originalServings,
    onServingsChange,
}: IngredientListProps) {
    const formatAmount = (amount: number): string => {
        const scaled = amount * (servings / originalServings);
        return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
    };

    return (
        <div
            className={css({
                bg: 'white',
                borderRadius: '2xl',
                p: '5',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
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
                            bg: 'white',
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
                            bg: 'white',
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
                        <span className={css({ fontWeight: '500' })}>{ingredient.name}</span>
                        <span className={css({ color: 'text-muted' })}>
                            {formatAmount(ingredient.amount)} {ingredient.unit}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
