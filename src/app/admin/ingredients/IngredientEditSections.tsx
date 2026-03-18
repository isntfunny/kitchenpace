'use client';

import { css } from 'styled-system/css';

import { type Unit, inputSmallStyle, sectionLabelStyle } from './ingredient-types';

// ---------------------------------------------------------------------------
// Nutrition fields section for IngredientEditPanel
// ---------------------------------------------------------------------------

type NutritionValues = {
    energyKcal: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    fiber: number | null;
    sugar: number | null;
    sodium: number | null;
    saturatedFat: number | null;
};

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
// Units selection section for IngredientEditPanel
// ---------------------------------------------------------------------------

export function UnitsSection({
    allUnits,
    selectedUnits,
    onToggleUnit,
    onSetGrams,
}: {
    allUnits: Unit[];
    selectedUnits: Map<string, number | null>;
    onToggleUnit: (unitId: string) => void;
    onSetGrams: (unitId: string, grams: number | null) => void;
}) {
    return (
        <div>
            <p className={sectionLabelStyle}>Einheiten</p>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
                {allUnits.map((unit) => {
                    const isChecked = selectedUnits.has(unit.id);
                    const gramsValue = selectedUnits.get(unit.id);
                    return (
                        <div
                            key={unit.id}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3',
                                paddingX: '2',
                                paddingY: '1.5',
                                borderRadius: 'lg',
                                transition: 'background 0.1s',
                                bg: isChecked ? 'accent.soft' : 'transparent',
                                _hover: {
                                    bg: isChecked ? 'accent.soft' : 'surface.muted',
                                },
                            })}
                        >
                            <label
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    fontSize: 'sm',
                                    color: 'foreground',
                                    cursor: 'pointer',
                                    minWidth: '160px',
                                })}
                            >
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => onToggleUnit(unit.id)}
                                    className={css({ accentColor: 'brand.primary' })}
                                />
                                <span
                                    className={css({
                                        fontWeight: isChecked ? '600' : '400',
                                    })}
                                >
                                    {unit.shortName}
                                </span>
                                <span
                                    className={css({
                                        color: 'foreground.muted',
                                        fontSize: 'xs',
                                    })}
                                >
                                    ({unit.longName})
                                </span>
                            </label>
                            {isChecked && (
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
                                            ? `Standard: ${unit.gramsDefault}g`
                                            : 'Gramm'
                                    }
                                    className={css({
                                        width: '150px',
                                        paddingX: '2.5',
                                        paddingY: '1.5',
                                        borderRadius: 'lg',
                                        border: '1px solid',
                                        borderColor: 'border',
                                        bg: 'surface',
                                        fontSize: 'sm',
                                        color: 'foreground',
                                        outline: 'none',
                                        transition: 'all 0.15s',
                                        _focus: {
                                            borderColor: 'brand.primary',
                                            boxShadow: {
                                                base: '0 0 0 3px rgba(224,123,83,0.12)',
                                                _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                                            },
                                        },
                                    })}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
