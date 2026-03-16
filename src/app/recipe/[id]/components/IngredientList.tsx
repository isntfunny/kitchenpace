'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { ingredientDisplayName, parseAmount } from '@app/lib/ingredient-display';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface Ingredient {
    name: string;
    pluralName?: string | null;
    amount: number;
    rawAmount?: string;
    unit: string;
    notes?: string | null;
    energyKcal?: number | null;
    protein?: number | null;
    fat?: number | null;
    carbs?: number | null;
    ingredientUnitGrams?: number | null;
    unitGramsDefault?: number | null;
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
    const [isCalculationOpen, setIsCalculationOpen] = useState(false);

    const nutritionBreakdown = useMemo(() => {
        const rows = ingredients.map((ingredient) => {
            const parsedAmount = parseAmount(ingredient.rawAmount ?? String(ingredient.amount));
            const scaledAmount =
                parsedAmount != null && parsedAmount > 0 ? parsedAmount * scale : null;
            const gramsPerUnit =
                ingredient.ingredientUnitGrams ?? ingredient.unitGramsDefault ?? null;
            const gramsAmount =
                scaledAmount != null && gramsPerUnit != null ? scaledAmount * gramsPerUnit : null;

            let missingReason: string | null = null;
            if (scaledAmount === null) {
                missingReason = 'Menge nicht lesbar';
            } else if (gramsPerUnit === null) {
                missingReason = `Keine Gramm-Umrechnung fuer ${ingredient.unit}`;
            } else if (ingredient.energyKcal == null) {
                missingReason = 'Keine Naehrwerte hinterlegt';
            }

            const caloriesTotal =
                missingReason || gramsAmount == null || ingredient.energyKcal == null
                    ? null
                    : roundToOne((ingredient.energyKcal * gramsAmount) / 100);
            const proteinTotal =
                missingReason || gramsAmount == null
                    ? null
                    : roundToOne(((ingredient.protein ?? 0) * gramsAmount) / 100);
            const carbsTotal =
                missingReason || gramsAmount == null
                    ? null
                    : roundToOne(((ingredient.carbs ?? 0) * gramsAmount) / 100);
            const fatTotal =
                missingReason || gramsAmount == null
                    ? null
                    : roundToOne(((ingredient.fat ?? 0) * gramsAmount) / 100);

            return {
                ingredient,
                scaledAmount,
                gramsPerUnit,
                gramsAmount,
                caloriesTotal,
                proteinTotal,
                carbsTotal,
                fatTotal,
                missingReason,
            };
        });

        const calculableRows = rows.filter((row) => row.caloriesTotal != null);
        const totals = calculableRows.reduce(
            (acc, row) => ({
                calories: acc.calories + (row.caloriesTotal ?? 0),
                protein: acc.protein + (row.proteinTotal ?? 0),
                carbs: acc.carbs + (row.carbsTotal ?? 0),
                fat: acc.fat + (row.fatTotal ?? 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        return {
            rows,
            totals: {
                calories: roundToOne(totals.calories),
                protein: roundToOne(totals.protein),
                carbs: roundToOne(totals.carbs),
                fat: roundToOne(totals.fat),
            },
        };
    }, [ingredients, scale]);

    const displayedCalories = hasNutrition
        ? Math.round(nutritionBreakdown.totals.calories / servings || calories)
        : null;
    const displayedProtein =
        proteinPerServing != null
            ? roundToOne(nutritionBreakdown.totals.protein / servings || proteinPerServing)
            : null;
    const displayedCarbs =
        carbsPerServing != null
            ? roundToOne(nutritionBreakdown.totals.carbs / servings || carbsPerServing)
            : null;
    const displayedFat =
        fatPerServing != null
            ? roundToOne(nutritionBreakdown.totals.fat / servings || fatPerServing)
            : null;

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
                            : `pro Portion bei ${servings} Portionen`}
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
                            value={displayedCalories ?? Math.round(calories!)}
                            unit="kcal"
                            highlight
                        />
                        {displayedProtein != null && (
                            <NutritionItem label="Protein" value={displayedProtein} unit="g" />
                        )}
                        {displayedCarbs != null && (
                            <NutritionItem label="Kohlenhydrate" value={displayedCarbs} unit="g" />
                        )}
                        {displayedFat != null && (
                            <NutritionItem label="Fett" value={displayedFat} unit="g" />
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
                    <button
                        type="button"
                        onClick={() => setIsCalculationOpen((open) => !open)}
                        className={css({
                            mt: '2',
                            fontSize: 'xs',
                            color: 'text-muted',
                            textDecoration: 'underline',
                            textUnderlineOffset: '2px',
                            cursor: 'pointer',
                            _hover: { color: 'text' },
                        })}
                    >
                        {isCalculationOpen ? 'Berechnung ausblenden' : 'Berechnung anzeigen'}
                    </button>

                    {isCalculationOpen && (
                        <div
                            className={css({
                                mt: '3',
                                pt: '3',
                                borderTop: '1px solid',
                                borderColor: 'border',
                            })}
                        >
                            <p className={css({ fontSize: 'xs', color: 'text-muted', mb: '2' })}>
                                So setzen sich die Gesamtwerte aus den Zutaten fuer {servings}{' '}
                                Portionen zusammen.
                            </p>
                            <div className={css({ overflowX: 'auto' })}>
                                <table
                                    className={css({
                                        width: 'full',
                                        minWidth: '720px',
                                        borderCollapse: 'collapse',
                                        fontSize: 'xs',
                                    })}
                                >
                                    <thead>
                                        <tr
                                            className={css({
                                                borderBottom: '1px solid',
                                                borderColor: 'border',
                                            })}
                                        >
                                            <TableHeader>Zutat</TableHeader>
                                            <TableHeader>Menge</TableHeader>
                                            <TableHeader>Gramm</TableHeader>
                                            <TableHeader>kcal/100g</TableHeader>
                                            <TableHeader>kcal</TableHeader>
                                            <TableHeader>Protein</TableHeader>
                                            <TableHeader>KH</TableHeader>
                                            <TableHeader>Fett</TableHeader>
                                            <TableHeader>Hinweis</TableHeader>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nutritionBreakdown.rows.map((row) => (
                                            <tr
                                                key={`${row.ingredient.name}-${row.ingredient.unit}-${row.ingredient.rawAmount ?? row.ingredient.amount}`}
                                                className={css({
                                                    borderBottom: '1px solid',
                                                    borderColor: 'border.subtle',
                                                })}
                                            >
                                                <TableCell>
                                                    {ingredientDisplayName(
                                                        row.ingredient.name,
                                                        row.ingredient.pluralName ?? null,
                                                        String(
                                                            row.scaledAmount ??
                                                                row.ingredient.amount,
                                                        ),
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {row.scaledAmount != null
                                                        ? `${formatAmount(row.scaledAmount)} ${row.ingredient.unit}`
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {row.gramsAmount != null
                                                        ? `${formatAmount(row.gramsAmount)} g`
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {formatNullableNumber(
                                                        row.ingredient.energyKcal,
                                                        'kcal',
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {formatNullableNumber(
                                                        row.caloriesTotal,
                                                        'kcal',
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {formatNullableNumber(row.proteinTotal, 'g')}
                                                </TableCell>
                                                <TableCell>
                                                    {formatNullableNumber(row.carbsTotal, 'g')}
                                                </TableCell>
                                                <TableCell>
                                                    {formatNullableNumber(row.fatTotal, 'g')}
                                                </TableCell>
                                                <TableCell>
                                                    {row.missingReason ?? 'eingerechnet'}
                                                </TableCell>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className={css({ fontWeight: '600', bg: 'light' })}>
                                            <TableCell>Gesamt</TableCell>
                                            <TableCell>{servings} Portionen</TableCell>
                                            <TableCell>-</TableCell>
                                            <TableCell>-</TableCell>
                                            <TableCell>
                                                {formatNullableNumber(
                                                    nutritionBreakdown.totals.calories,
                                                    'kcal',
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {formatNullableNumber(
                                                    nutritionBreakdown.totals.protein,
                                                    'g',
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {formatNullableNumber(
                                                    nutritionBreakdown.totals.carbs,
                                                    'g',
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {formatNullableNumber(
                                                    nutritionBreakdown.totals.fat,
                                                    'g',
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {nutritionCompleteness != null &&
                                                nutritionCompleteness < 1
                                                    ? 'teilweise berechnet'
                                                    : 'vollstaendig berechnet'}
                                            </TableCell>
                                        </tr>
                                        <tr className={css({ fontWeight: '600' })}>
                                            <TableCell>Pro Portion</TableCell>
                                            <TableCell>1 Portion</TableCell>
                                            <TableCell>-</TableCell>
                                            <TableCell>-</TableCell>
                                            <TableCell>
                                                {formatNullableNumber(displayedCalories, 'kcal')}
                                            </TableCell>
                                            <TableCell>
                                                {formatNullableNumber(displayedProtein, 'g')}
                                            </TableCell>
                                            <TableCell>
                                                {formatNullableNumber(displayedCarbs, 'g')}
                                            </TableCell>
                                            <TableCell>
                                                {formatNullableNumber(displayedFat, 'g')}
                                            </TableCell>
                                            <TableCell>-</TableCell>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
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

function TableHeader({ children }: { children: ReactNode }) {
    return (
        <th
            className={css({
                textAlign: 'left',
                py: '2',
                px: '2',
                color: 'text-muted',
                fontWeight: '600',
                whiteSpace: 'nowrap',
            })}
        >
            {children}
        </th>
    );
}

function TableCell({ children }: { children: ReactNode }) {
    return <td className={css({ py: '2', px: '2', verticalAlign: 'top' })}>{children}</td>;
}

function roundToOne(value: number) {
    return Math.round(value * 10) / 10;
}

function formatNullableNumber(value: number | null | undefined, unit: string) {
    if (value == null) return '-';
    const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
    return `${formatted} ${unit}`;
}
