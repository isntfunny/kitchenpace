'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { css } from 'styled-system/css';

import { deleteIngredient, updateIngredient, updateIngredientUnits } from './actions';
import {
    type Ingredient,
    type IngredientCategory,
    type NutritionValues,
    type Unit,
    btnDanger,
    btnPrimary,
    btnSecondary,
    closeButtonStyle,
    inputStyle,
    sectionLabelStyle,
    tagStyle,
} from './ingredient-types';
import { NutritionCalculator, NutritionSection, UnitsSection } from './IngredientEditSections';

export function IngredientEditPanel({
    ingredient,
    allCategories,
    allUnits,
    onClose,
    mode = 'inline',
}: {
    ingredient: Ingredient;
    allCategories: IngredientCategory[];
    allUnits: Unit[];
    onClose: () => void;
    mode?: 'inline' | 'dialog';
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const [name, setName] = useState(ingredient.name);
    const [pluralName, setPluralName] = useState(ingredient.pluralName ?? '');
    const [aliases, setAliases] = useState<string[]>(ingredient.aliases);
    const [newAlias, setNewAlias] = useState('');
    const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(
        new Set(ingredient.categories.map((c) => c.id)),
    );
    const [selectedUnits, setSelectedUnits] = useState<Map<string, number | null>>(
        new Map(ingredient.ingredientUnits.map((iu) => [iu.unit.id, iu.grams])),
    );
    const [nutrition, setNutrition] = useState<NutritionValues>({
        energyKcal: ingredient.energyKcal,
        protein: ingredient.protein,
        fat: ingredient.fat,
        carbs: ingredient.carbs,
        fiber: ingredient.fiber,
        sugar: ingredient.sugar,
        sodium: ingredient.sodium,
        saturatedFat: ingredient.saturatedFat,
    });

    const handleAddAlias = () => {
        const trimmed = newAlias.trim().toLowerCase();
        if (trimmed && !aliases.includes(trimmed)) {
            setAliases([...aliases, trimmed]);
            setNewAlias('');
        }
    };

    const toggleCategory = (catId: string) => {
        setSelectedCatIds((prev) => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId);
            else next.add(catId);
            return next;
        });
    };

    const toggleUnit = (unitId: string) => {
        setSelectedUnits((prev) => {
            const next = new Map(prev);
            if (next.has(unitId)) next.delete(unitId);
            else next.set(unitId, null);
            return next;
        });
    };

    const setUnitGrams = (unitId: string, grams: number | null) => {
        setSelectedUnits((prev) => {
            const next = new Map(prev);
            next.set(unitId, grams);
            return next;
        });
    };

    const updateNutritionField = (field: keyof NutritionValues, value: string) => {
        const parsed = parseFloat(value);
        setNutrition((prev) => ({
            ...prev,
            [field]: value === '' || Number.isNaN(parsed) ? null : parsed,
        }));
    };

    const handleSave = () => {
        setError('');
        startTransition(async () => {
            try {
                await updateIngredient(ingredient.id, {
                    name,
                    pluralName: pluralName.trim() || null,
                    aliases,
                    categoryIds: Array.from(selectedCatIds),
                    ...nutrition,
                });
                const unitEntries = Array.from(selectedUnits.entries()).map(([unitId, grams]) => ({
                    unitId,
                    grams,
                }));
                await updateIngredientUnits(ingredient.id, unitEntries);
                if (mode === 'dialog') onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
            }
        });
    };

    const handleDelete = () => {
        if (!confirm(`"${ingredient.name}" wirklich loeschen?`)) return;
        startTransition(async () => {
            try {
                await deleteIngredient(ingredient.id);
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Fehler beim Loeschen');
            }
        });
    };

    const px = mode === 'dialog' ? '5' : '0';

    return (
        <>
            {/* Header */}
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingX: px,
                    paddingTop: mode === 'dialog' ? '5' : '0',
                    paddingBottom: '3',
                    borderBottomWidth: '1px',
                    borderColor: 'border.muted',
                    flexShrink: '0',
                })}
            >
                <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                    <h2
                        className={css({
                            fontSize: 'md',
                            fontWeight: '600',
                            color: 'foreground',
                        })}
                    >
                        {ingredient.name}
                    </h2>
                    {ingredient.needsReview && (
                        <span
                            className={css({
                                paddingX: '1.5',
                                paddingY: '0.5',
                                borderRadius: 'full',
                                fontSize: '2xs',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                bg: {
                                    base: 'rgba(245,158,11,0.10)',
                                    _dark: 'rgba(245,158,11,0.15)',
                                },
                                color: 'status.warning',
                            })}
                        >
                            Review
                        </span>
                    )}
                </div>
                {mode === 'dialog' && (
                    <button type="button" onClick={onClose} className={closeButtonStyle}>
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Scrollable content */}
            <div
                className={css({
                    paddingX: px,
                    paddingTop: '4',
                    overflowY: 'auto',
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5',
                })}
            >
                {error && (
                    <div
                        className={css({
                            padding: '3',
                            borderRadius: 'lg',
                            bg: 'error.bg',
                            color: 'error.text',
                            fontSize: 'sm',
                            fontWeight: '500',
                        })}
                    >
                        {error}
                    </div>
                )}

                {/* Section: Allgemein */}
                <div>
                    <p className={sectionLabelStyle}>Allgemein</p>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
                            gap: '3',
                        })}
                    >
                        <div>
                            <label className={fieldLabelStyle}>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={inputStyle}
                            />
                        </div>
                        <div>
                            <label className={fieldLabelStyle}>Pluralname</label>
                            <input
                                type="text"
                                value={pluralName}
                                onChange={(e) => setPluralName(e.target.value)}
                                className={inputStyle}
                                placeholder="z.B. Tomaten"
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Aliase */}
                <div>
                    <p className={sectionLabelStyle}>Aliase</p>
                    <div
                        className={css({
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '1.5',
                            marginBottom: '2.5',
                        })}
                    >
                        {aliases.map((alias) => (
                            <span key={alias} className={tagStyle}>
                                {alias}
                                <button
                                    type="button"
                                    onClick={() => setAliases(aliases.filter((a) => a !== alias))}
                                    className={css({
                                        display: 'flex',
                                        bg: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'foreground.muted',
                                        padding: '0',
                                        borderRadius: 'full',
                                        transition: 'color 0.1s',
                                        _hover: { color: 'status.danger' },
                                    })}
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                        {aliases.length === 0 && (
                            <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                Keine Aliase
                            </span>
                        )}
                    </div>
                    <div className={css({ display: 'flex', gap: '2', maxWidth: '320px' })}>
                        <input
                            type="text"
                            value={newAlias}
                            onChange={(e) => setNewAlias(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddAlias();
                                }
                            }}
                            placeholder="Neuer Alias..."
                            className={inputStyle}
                        />
                        <button type="button" onClick={handleAddAlias} className={btnSecondary}>
                            <Plus size={14} />
                        </button>
                    </div>
                </div>

                {/* Section: Kategorien */}
                <div>
                    <p className={sectionLabelStyle}>Kategorien</p>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                            gap: '0',
                        })}
                    >
                        {allCategories.map((cat) => (
                            <label
                                key={cat.id}
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    fontSize: 'sm',
                                    color: 'foreground',
                                    cursor: 'pointer',
                                    paddingX: '2',
                                    paddingY: '1',
                                    borderRadius: 'lg',
                                    transition: 'background 0.1s',
                                    _hover: { bg: 'surface.muted' },
                                })}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCatIds.has(cat.id)}
                                    onChange={() => toggleCategory(cat.id)}
                                    className={css({ accentColor: 'brand.primary' })}
                                />
                                {cat.name}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Section: Einheiten */}
                <UnitsSection
                    allUnits={allUnits}
                    selectedUnits={selectedUnits}
                    onToggleUnit={toggleUnit}
                    onSetGrams={setUnitGrams}
                    nutrition={nutrition}
                />

                {/* Section: Naehrwerte */}
                <NutritionSection nutrition={nutrition} onFieldChange={updateNutritionField} />

                {/* Section: Naehrwert-Rechner */}
                <NutritionCalculator
                    selectedUnits={selectedUnits}
                    allUnits={allUnits}
                    nutrition={nutrition}
                />
            </div>

            {/* Footer */}
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '3',
                    paddingX: px,
                    paddingBottom: mode === 'dialog' ? '4' : '0',
                    borderTopWidth: '1px',
                    borderColor: 'border.muted',
                    flexShrink: '0',
                })}
            >
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className={btnDanger}
                >
                    <Trash2 size={14} /> Loeschen
                </button>
                <div className={css({ display: 'flex', gap: '2' })}>
                    {mode === 'dialog' && (
                        <button type="button" onClick={onClose} className={btnSecondary}>
                            Abbrechen
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending || !name.trim()}
                        className={btnPrimary}
                    >
                        {isPending ? 'Speichern...' : 'Speichern'}
                    </button>
                </div>
            </div>
        </>
    );
}

const fieldLabelStyle = css({
    fontSize: 'xs',
    color: 'foreground.muted',
    display: 'block',
    marginBottom: '1',
    fontWeight: '500',
});
