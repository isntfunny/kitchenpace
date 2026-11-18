'use client';

import { useMemo, useState } from 'react';

import { PERISHABILITY_LABELS, perishability } from '@shared/ingredient-shelf-life/perishability';
import {
    PACK_UNITS,
    STORAGE_TYPES,
    type IngredientShelfLifeInput,
    type PackUnitValue,
    type StorageTypeValue,
} from '@shared/ingredient-shelf-life/schema';

import { css } from 'styled-system/css';

import {
    type Ingredient,
    fieldLabelStyle,
    inputStyle,
    sectionLabelStyle,
} from './ingredient-types';
import { updateIngredientShelfLife } from './shelf-life-actions';

const STORAGE_LABELS: Record<StorageTypeValue, string> = {
    FRIDGE: 'Kühlschrank',
    PANTRY: 'Vorrat (Raumtemperatur)',
    FREEZER: 'Tiefkühler',
};

const PACK_UNIT_LABELS: Record<PackUnitValue, string> = {
    G: 'g',
    ML: 'ml',
    PIECE: 'Stück',
    BUNCH: 'Bund',
};

const SOURCE_LABELS = { AI: 'KI', MANUAL: 'manuell', DEFAULT: 'Standard' } as const;
const CONFIDENCE_LABELS = { HIGH: 'sicher', MEDIUM: 'mittel', LOW: 'unsicher' } as const;

type FormState = {
    storageDays: Record<StorageTypeValue, string>;
    defaultStorage: StorageTypeValue | '';
    openedShelfLifeDays: string;
    openSensitive: boolean;
    packSize: string;
    packUnit: PackUnitValue | '';
};

const toText = (value: number | null | undefined) => (value == null ? '' : String(value));
const toNumber = (value: string) => {
    const parsed = Number(value.replace(',', '.'));
    return value.trim() === '' || Number.isNaN(parsed) ? null : parsed;
};

function initialState(ingredient: Ingredient): FormState {
    const days = (storage: StorageTypeValue) =>
        toText(ingredient.storageLives.find((life) => life.storage === storage)?.days);
    return {
        storageDays: { FRIDGE: days('FRIDGE'), PANTRY: days('PANTRY'), FREEZER: days('FREEZER') },
        defaultStorage: ingredient.defaultStorage ?? '',
        openedShelfLifeDays: toText(ingredient.openedShelfLifeDays),
        openSensitive: ingredient.openSensitive,
        packSize: toText(ingredient.packSize),
        packUnit: ingredient.packUnit ?? '',
    };
}

function toInput(state: FormState): IngredientShelfLifeInput {
    return {
        storageDays: {
            FRIDGE: toNumber(state.storageDays.FRIDGE),
            PANTRY: toNumber(state.storageDays.PANTRY),
            FREEZER: toNumber(state.storageDays.FREEZER),
        },
        defaultStorage: state.defaultStorage || null,
        openedShelfLifeDays: toNumber(state.openedShelfLifeDays),
        openSensitive: state.openSensitive,
        packSize: toNumber(state.packSize),
        packUnit: state.packUnit || null,
    };
}

export function useShelfLifeForm(ingredient: Ingredient) {
    const [initial] = useState(() => initialState(ingredient));
    const [state, setState] = useState(initial);
    const changed = useMemo(
        () => JSON.stringify(state) !== JSON.stringify(initial),
        [state, initial],
    );
    const input = toInput(state);
    /** Saves only real changes; they become shelfLifeSource MANUAL */
    const save = async () => {
        if (changed) await updateIngredientShelfLife(ingredient.id, input);
    };
    return { ingredient, state, setState, changed, input, save };
}

type ShelfLifeForm = ReturnType<typeof useShelfLifeForm>;

const hint = css({ fontSize: 'xs', color: 'foreground.muted' });

export function ShelfLifeSection({ form }: { form: ShelfLifeForm }) {
    const { ingredient, state, setState, input } = form;
    const update = (patch: Partial<FormState>) => setState((prev) => ({ ...prev, ...patch }));
    const lives = STORAGE_TYPES.flatMap((storage) => {
        const days = input.storageDays[storage];
        return days == null ? [] : [{ storage, days }];
    });
    const level = perishability(input.defaultStorage, lives);

    return (
        <div>
            <p className={sectionLabelStyle}>Haltbarkeit (roh)</p>
            <p className={hint}>
                {ingredient.shelfLifeSource
                    ? `Quelle: ${SOURCE_LABELS[ingredient.shelfLifeSource]}${
                          ingredient.shelfLifeConfidence
                              ? `, ${CONFIDENCE_LABELS[ingredient.shelfLifeConfidence]}`
                              : ''
                      }`
                    : 'Noch nicht ermittelt'}
                {level ? ` · Stufe: ${PERISHABILITY_LABELS[level]}` : ''}
                {form.changed ? ' · wird als manuell gespeichert' : ''}
            </p>
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
                    gap: '3',
                    marginTop: '2.5',
                })}
            >
                {STORAGE_TYPES.map((storage) => (
                    <div key={storage}>
                        <label className={fieldLabelStyle}>{STORAGE_LABELS[storage]} (Tage)</label>
                        <input
                            type="number"
                            min={1}
                            value={state.storageDays[storage]}
                            onChange={(e) =>
                                update({
                                    storageDays: {
                                        ...state.storageDays,
                                        [storage]: e.target.value,
                                    },
                                })
                            }
                            placeholder="nicht möglich"
                            className={inputStyle}
                        />
                    </div>
                ))}
                <div>
                    <label className={fieldLabelStyle}>Übliche Lagerart</label>
                    <select
                        value={state.defaultStorage}
                        onChange={(e) =>
                            update({ defaultStorage: e.target.value as StorageTypeValue | '' })
                        }
                        className={inputStyle}
                    >
                        <option value="">–</option>
                        {STORAGE_TYPES.map((storage) => (
                            <option key={storage} value={storage}>
                                {STORAGE_LABELS[storage]}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={fieldLabelStyle}>Nach Anbruch (Tage, 0 = sofort)</label>
                    <input
                        type="number"
                        min={0}
                        value={state.openedShelfLifeDays}
                        onChange={(e) => update({ openedShelfLifeDays: e.target.value })}
                        className={inputStyle}
                    />
                </div>
                <div>
                    <label className={fieldLabelStyle}>Packung</label>
                    <div className={css({ display: 'flex', gap: '2' })}>
                        <input
                            type="number"
                            min={0}
                            step="any"
                            value={state.packSize}
                            onChange={(e) => update({ packSize: e.target.value })}
                            className={inputStyle}
                        />
                        <select
                            value={state.packUnit}
                            onChange={(e) =>
                                update({ packUnit: e.target.value as PackUnitValue | '' })
                            }
                            className={inputStyle}
                        >
                            <option value="">–</option>
                            {PACK_UNITS.map((unit) => (
                                <option key={unit} value={unit}>
                                    {PACK_UNIT_LABELS[unit]}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <label
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    fontSize: 'sm',
                    color: 'foreground',
                    marginTop: '3',
                    cursor: 'pointer',
                })}
            >
                <input
                    type="checkbox"
                    checked={state.openSensitive}
                    onChange={(e) => update({ openSensitive: e.target.checked })}
                    className={css({ accentColor: 'brand.primary' })}
                />
                Anbruchempfindlich (Rest verdirbt schnell)
            </label>
        </div>
    );
}

/** Clean display name (KUC-114); an edited value is never overwritten by the AI. */
export function DisplayNameField({
    ingredient,
    state: [value, onChange],
}: {
    ingredient: Ingredient;
    state: [string, (value: string) => void];
}) {
    return (
        <div>
            <label className={fieldLabelStyle}>
                Anzeigename{ingredient.normalizedNameManual ? ' (manuell)' : ''}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputStyle}
                placeholder="z.B. geschälte Kartoffel"
            />
        </div>
    );
}
