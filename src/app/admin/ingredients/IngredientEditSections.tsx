'use client';

import { css } from 'styled-system/css';

import {
    type CalculatedNutrition,
    type NutritionValues,
    type Unit,
    calculateUnitNutrition,
    inputSmallStyle,
    sectionLabelStyle,
} from './ingredient-types';

// ---------------------------------------------------------------------------
// Nutrition fields section for IngredientEditPanel
// ---------------------------------------------------------------------------

const nutritionFields: Array<{ key: keyof NutritionValues; label: string }> = [
    { key: 'energyKcal', label: 'kcal' },
    { key: 'protein', label: 'Protein (g)' },
    { key: 'fat', label: 'Fett (g)' },
    { key: 'carbs', label: 'Kohlenhydrate (g)' },
    { key: 'fiber', label: 'Ballaststoffe (g)' },
    { key: 'sugar', label: 'Zucker (g)' },
    { key: 'sodium', label: 'Natrium (mg)' },
    { key: 'saturatedFat', label: 'Ges. Fett (g)' },
];

export function NutritionSection({
    nutrition,
    onFieldChange,
}: {
    nutrition: NutritionValues;
    onFieldChange: (field: keyof NutritionValues, value: string) => void;
}) {
    return (
        <div>
            <p className={sectionLabelStyle}>Naehrwerte pro 100g</p>
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: { base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: '3',
                })}
            >
                {nutritionFields.map((nf) => (
                    <div key={nf.key}>
                        <label
                            className={css({
                                fontSize: 'xs',
                                color: 'foreground.muted',
                                display: 'block',
                                marginBottom: '1',
                                fontWeight: '500',
                            })}
                        >
                            {nf.label}
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={nutrition[nf.key] ?? ''}
                            onChange={(e) => onFieldChange(nf.key, e.target.value)}
                            className={inputSmallStyle}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Units selection section with inline nutrition calculation
// ---------------------------------------------------------------------------

function InlineCalc({ calc }: { calc: CalculatedNutrition }) {
    if (calc.energyKcal == null) return null;
    return (
        <span
            className={css({
                fontSize: 'xs',
                color: 'foreground.muted',
                whiteSpace: 'nowrap',
            })}
        >
            ≈ {calc.energyKcal} kcal
            {calc.protein != null && ` | ${calc.protein}g E`}
            {calc.fat != null && ` | ${calc.fat}g F`}
            {calc.carbs != null && ` | ${calc.carbs}g KH`}
        </span>
    );
}

export function UnitsSection({
    allUnits,
    selectedUnits,
    onToggleUnit,
    onSetGrams,
    nutrition,
}: {
    allUnits: Unit[];
    selectedUnits: Map<string, number | null>;
    onToggleUnit: (unitId: string) => void;
    onSetGrams: (unitId: string, grams: number | null) => void;
    nutrition?: NutritionValues;
}) {
    return (
        <div>
            <p className={sectionLabelStyle}>Einheiten</p>
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: {
                        base: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(4, 1fr)',
                    },
                    gap: '0',
                })}
            >
                {allUnits.map((unit) => {
                    const isChecked = selectedUnits.has(unit.id);

                    return (
                        <label
                            key={unit.id}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.5',
                                fontSize: 'sm',
                                color: 'foreground',
                                cursor: 'pointer',
                                paddingX: '2',
                                paddingY: '1',
                                borderRadius: 'lg',
                                transition: 'background 0.1s',
                                bg: isChecked ? 'accent.soft' : 'transparent',
                                _hover: { bg: isChecked ? 'accent.soft' : 'surface.muted' },
                            })}
                        >
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => onToggleUnit(unit.id)}
                                className={css({ accentColor: 'brand.primary' })}
                            />
                            <span className={css({ fontWeight: isChecked ? '600' : '400' })}>
                                {unit.shortName}
                            </span>
                        </label>
                    );
                })}
            </div>

            {/* Gram overrides for checked units */}
            {allUnits.some((u) => selectedUnits.has(u.id)) && (
                <div
                    className={css({
                        marginTop: '3',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5',
                    })}
                >
                    {allUnits
                        .filter((u) => selectedUnits.has(u.id))
                        .map((unit) => {
                            const gramsValue = selectedUnits.get(unit.id);
                            const effectiveGrams = gramsValue ?? unit.gramsDefault;
                            const calc =
                                effectiveGrams != null && nutrition
                                    ? calculateUnitNutrition(nutrition, effectiveGrams)
                                    : null;

                            return (
                                <div
                                    key={unit.id}
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2',
                                        fontSize: 'sm',
                                    })}
                                >
                                    <span
                                        className={css({
                                            fontWeight: '500',
                                            color: 'foreground',
                                            minWidth: '40px',
                                        })}
                                    >
                                        {unit.shortName}
                                    </span>
                                    <input
                                        type="number"
                                        value={gramsValue ?? ''}
                                        onChange={(e) =>
                                            onSetGrams(
                                                unit.id,
                                                e.target.value === ''
                                                    ? null
                                                    : parseFloat(e.target.value),
                                            )
                                        }
                                        placeholder={
                                            unit.gramsDefault != null
                                                ? `${unit.gramsDefault}g`
                                                : 'g'
                                        }
                                        className={css({
                                            width: '80px',
                                            paddingX: '2',
                                            paddingY: '1',
                                            borderRadius: 'lg',
                                            borderWidth: '1px',
                                            borderColor: 'border.muted',
                                            bg: 'surface',
                                            fontSize: 'sm',
                                            color: 'foreground',
                                            outline: 'none',
                                            transition: 'all 0.15s',
                                            _focus: {
                                                borderColor: 'brand.primary',
                                                boxShadow: {
                                                    base: '0 0 0 2px rgba(224,123,83,0.10)',
                                                    _dark: '0 0 0 2px rgba(224,123,83,0.15)',
                                                },
                                            },
                                        })}
                                    />
                                    {calc && <InlineCalc calc={calc} />}
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Nutrition Calculator summary
// ---------------------------------------------------------------------------

export function NutritionCalculator({
    selectedUnits,
    allUnits,
    nutrition,
}: {
    selectedUnits: Map<string, number | null>;
    allUnits: Unit[];
    nutrition: NutritionValues;
}) {
    const hasNutrition = nutrition.energyKcal != null;

    const entries = allUnits
        .filter((u) => selectedUnits.has(u.id))
        .map((unit) => {
            const grams = selectedUnits.get(unit.id) ?? unit.gramsDefault;
            return {
                unit,
                grams,
                calc: grams != null ? calculateUnitNutrition(nutrition, grams) : null,
            };
        })
        .filter((e) => e.calc != null);

    if (!hasNutrition) {
        return (
            <div>
                <p className={sectionLabelStyle}>Naehrwert-Rechner</p>
                <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                    Naehrwerte fehlen — Berechnung nicht moeglich.
                </p>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div>
                <p className={sectionLabelStyle}>Naehrwert-Rechner</p>
                <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                    Wähle Einheiten mit Grammgewicht aus, um die Naehrwerte pro Einheit zu sehen.
                </p>
            </div>
        );
    }

    return (
        <div>
            <p className={sectionLabelStyle}>Naehrwert-Rechner</p>
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)' },
                    gap: '3',
                })}
            >
                {entries.map(({ unit, grams, calc }) => (
                    <div
                        key={unit.id}
                        className={css({
                            borderRadius: 'xl',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            bg: 'surface.elevated',
                            padding: '3',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1',
                        })}
                    >
                        <div className={css({ display: 'flex', alignItems: 'baseline', gap: '2' })}>
                            <span
                                className={css({
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    color: 'foreground',
                                })}
                            >
                                1 {unit.shortName}
                            </span>
                            <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                = {grams}g
                            </span>
                        </div>
                        <div
                            className={css({
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '2',
                                marginTop: '1',
                            })}
                        >
                            <NutritionBadge label="kcal" value={calc!.energyKcal} highlight />
                            <NutritionBadge label="Eiweiß" value={calc!.protein} suffix="g" />
                            <NutritionBadge label="Fett" value={calc!.fat} suffix="g" />
                            <NutritionBadge label="KH" value={calc!.carbs} suffix="g" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function NutritionBadge({
    label,
    value,
    suffix = '',
    highlight = false,
}: {
    label: string;
    value: number | null;
    suffix?: string;
    highlight?: boolean;
}) {
    if (value == null) return null;
    return (
        <span
            className={css({
                fontSize: 'xs',
                fontWeight: highlight ? '700' : '500',
                color: highlight ? 'brand.primary' : 'foreground.muted',
            })}
        >
            {value}
            {suffix} {label}
        </span>
    );
}
