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
    proteinPerServing?: number | null;
    fatPerServing?: number | null;
    carbsPerServing?: number | null;
    nutritionCompleteness?: number | null;
    formatAmount: (amount: number) => string;
}

export function IngredientList({
    ingredients,
    servings,
    originalServings,
    onServingsChange,
    calories,
    proteinPerServing,
    fatPerServing,
    carbsPerServing,
    nutritionCompleteness,
    formatAmount,
}: IngredientListProps) {
    const scale = servings / originalServings;
    const hasNutrition = calories != null && calories > 0;

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

            {hasNutrition && (
                <div
                    className={css({
                        mt: '4',
                        pt: '4',
                        borderTop: '1px solid',
                        borderColor: 'border',
                    })}
                >
                    <h3
                        className={css({
                            fontSize: 'sm',
                            fontWeight: '600',
                            mb: '3',
                            color: 'text',
                        })}
                    >
                        {servings === originalServings
                            ? 'pro Portion'
                            : `pro Portion (${servings} Portionen)`}
                    </h3>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '2',
                        })}
                    >
                        <NutritionItem
                            label="Kalorien"
                            value={Math.round(calories! * scale)}
                            unit="kcal"
                            highlight
                        />
                        {proteinPerServing != null && (
                            <NutritionItem
                                label="Protein"
                                value={Math.round(proteinPerServing * scale * 10) / 10}
                                unit="g"
                            />
                        )}
                        {carbsPerServing != null && (
                            <NutritionItem
                                label="Kohlenhydrate"
                                value={Math.round(carbsPerServing * scale * 10) / 10}
                                unit="g"
                            />
                        )}
                        {fatPerServing != null && (
                            <NutritionItem
                                label="Fett"
                                value={Math.round(fatPerServing * scale * 10) / 10}
                                unit="g"
                            />
                        )}
                    </div>
                    {nutritionCompleteness != null && nutritionCompleteness < 1 && (
                        <p
                            className={css({
                                fontSize: 'xs',
                                color: 'text-muted',
                                mt: '2',
                                fontStyle: 'italic',
                            })}
                        >
                            Basierend auf {Math.round(nutritionCompleteness * ingredients.length)}{' '}
                            von {ingredients.length} Zutaten
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function NutritionItem({
    label,
    value,
    unit,
    highlight,
}: {
    label: string;
    value: number;
    unit: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={css({
                p: '2',
                bg: 'light',
                borderRadius: 'lg',
                textAlign: 'center',
            })}
        >
            <div
                className={css({
                    fontSize: highlight ? 'lg' : 'md',
                    fontWeight: '600',
                    color: 'text',
                })}
            >
                {value} {unit}
            </div>
            <div className={css({ fontSize: 'xs', color: 'text-muted' })}>{label}</div>
        </div>
    );
}
