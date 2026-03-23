'use client';

import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { css } from 'styled-system/css';

import { createUnit, deleteUnit, updateUnit } from '../ingredients/actions';
import {
    btnDanger,
    btnPrimary,
    btnSecondary,
    inputStyle,
    sectionLabelStyle,
} from '../ingredients/ingredient-types';

import type { UnitWithDetails } from './page';

// ---------------------------------------------------------------------------
// UnitsDashboard
// ---------------------------------------------------------------------------

export function UnitsDashboard({ units }: { units: UnitWithDetails[] }) {
    const [showAdd, setShowAdd] = useState(false);

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            {/* Actions bar */}
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                })}
            >
                <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                    {units.length} Einheiten
                </span>
                <button type="button" onClick={() => setShowAdd(!showAdd)} className={btnPrimary}>
                    <Plus size={14} /> Neue Einheit
                </button>
            </div>

            {/* Add form */}
            {showAdd && <AddUnitCard onClose={() => setShowAdd(false)} />}

            {/* Units grid */}
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: {
                        base: '1fr',
                        sm: 'repeat(2, 1fr)',
                        lg: 'repeat(3, 1fr)',
                    },
                    gap: '4',
                })}
            >
                {units.map((unit) => (
                    <UnitCard key={unit.id} unit={unit} />
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// UnitCard
// ---------------------------------------------------------------------------

function UnitCard({ unit }: { unit: UnitWithDetails }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div
            className={css({
                borderRadius: '2xl',
                border: '1px solid',
                borderColor: 'border.muted',
                bg: 'surface',
                overflow: 'hidden',
                transition: 'all 0.15s',
                _hover: { borderColor: 'border' },
            })}
        >
            {isEditing ? (
                <EditUnitForm unit={unit} onClose={() => setIsEditing(false)} />
            ) : (
                <>
                    {/* Header */}
                    <div className={css({ padding: '4', paddingBottom: '3' })}>
                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                            })}
                        >
                            <div>
                                <span
                                    className={css({
                                        fontSize: 'lg',
                                        fontWeight: '700',
                                        color: 'foreground',
                                    })}
                                >
                                    {unit.shortName}
                                </span>
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'foreground.muted',
                                        marginTop: '0.5',
                                    })}
                                >
                                    {unit.longName}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '7',
                                    height: '7',
                                    borderRadius: 'lg',
                                    border: 'none',
                                    bg: 'transparent',
                                    cursor: 'pointer',
                                    color: 'foreground.muted',
                                    _hover: { bg: 'surface.muted', color: 'foreground' },
                                })}
                            >
                                <Pencil size={14} />
                            </button>
                        </div>

                        {/* Stats */}
                        <div
                            className={css({
                                display: 'flex',
                                gap: '3',
                                marginTop: '3',
                                fontSize: 'xs',
                                color: 'foreground.muted',
                            })}
                        >
                            <span>
                                {unit.gramsDefault != null
                                    ? `${unit.gramsDefault}g Standard`
                                    : 'Kein Standardgewicht'}
                            </span>
                            <span>·</span>
                            <span>{unit.ingredientCount} Zutaten</span>
                        </div>
                    </div>

                    {/* Expandable ingredients list */}
                    {unit.ingredientCount > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={css({
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingX: '4',
                                    paddingY: '2',
                                    bg: 'surface.muted',
                                    border: 'none',
                                    borderTop: '1px solid',
                                    borderColor: 'border.muted',
                                    cursor: 'pointer',
                                    fontSize: 'xs',
                                    color: 'foreground.muted',
                                    fontWeight: '500',
                                    _hover: { color: 'foreground' },
                                })}
                            >
                                <span>Zutaten anzeigen</span>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {isExpanded && (
                                <div
                                    className={css({
                                        padding: '3',
                                        paddingX: '4',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1',
                                        bg: 'surface.muted',
                                    })}
                                >
                                    {unit.topIngredients.map((ing) => (
                                        <div
                                            key={ing.ingredientId}
                                            className={css({
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: 'xs',
                                                paddingY: '0.5',
                                            })}
                                        >
                                            <span className={css({ color: 'foreground' })}>
                                                {ing.ingredientName}
                                            </span>
                                            <span
                                                className={css({
                                                    color: 'foreground.muted',
                                                    fontVariantNumeric: 'tabular-nums',
                                                })}
                                            >
                                                {ing.grams != null ? `${ing.grams}g` : '–'}
                                            </span>
                                        </div>
                                    ))}
                                    {unit.ingredientCount > unit.topIngredients.length && (
                                        <span
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                                paddingTop: '1',
                                            })}
                                        >
                                            +{unit.ingredientCount - unit.topIngredients.length}{' '}
                                            weitere
                                        </span>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// EditUnitForm (inline in card)
// ---------------------------------------------------------------------------

function EditUnitForm({ unit, onClose }: { unit: UnitWithDetails; onClose: () => void }) {
    const [shortName, setShortName] = useState(unit.shortName);
    const [longName, setLongName] = useState(unit.longName);
    const [gramsDefault, setGramsDefault] = useState<string>(
        unit.gramsDefault != null ? String(unit.gramsDefault) : '',
    );
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleSave = () => {
        setError('');
        startTransition(async () => {
            try {
                await updateUnit(unit.id, {
                    shortName: shortName.trim(),
                    longName: longName.trim(),
                    gramsDefault: gramsDefault === '' ? null : parseFloat(gramsDefault),
                });
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Fehler');
            }
        });
    };

    const handleDelete = () => {
        if (unit.ingredientCount > 0) return;
        if (!confirm(`"${unit.shortName}" wirklich loeschen?`)) return;
        startTransition(async () => {
            try {
                await deleteUnit(unit.id);
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Fehler beim Loeschen');
            }
        });
    };

    return (
        <div className={css({ padding: '4', display: 'flex', flexDirection: 'column', gap: '3' })}>
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                })}
            >
                <p className={sectionLabelStyle}>Einheit bearbeiten</p>
                <button
                    type="button"
                    onClick={onClose}
                    className={css({
                        bg: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'foreground.muted',
                        display: 'flex',
                        _hover: { color: 'foreground' },
                    })}
                >
                    <X size={16} />
                </button>
            </div>

            {error && (
                <div
                    className={css({
                        padding: '2',
                        borderRadius: 'lg',
                        bg: 'error.bg',
                        color: 'error.text',
                        fontSize: 'xs',
                    })}
                >
                    {error}
                </div>
            )}

            <div>
                <label
                    className={css({
                        fontSize: 'xs',
                        color: 'foreground.muted',
                        display: 'block',
                        marginBottom: '1',
                        fontWeight: '500',
                    })}
                >
                    Kurzname
                </label>
                <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    className={inputStyle}
                />
            </div>

            <div>
                <label
                    className={css({
                        fontSize: 'xs',
                        color: 'foreground.muted',
                        display: 'block',
                        marginBottom: '1',
                        fontWeight: '500',
                    })}
                >
                    Langname
                </label>
                <input
                    type="text"
                    value={longName}
                    onChange={(e) => setLongName(e.target.value)}
                    className={inputStyle}
                />
            </div>

            <div>
                <label
                    className={css({
                        fontSize: 'xs',
                        color: 'foreground.muted',
                        display: 'block',
                        marginBottom: '1',
                        fontWeight: '500',
                    })}
                >
                    Standard-Gramm
                </label>
                <input
                    type="number"
                    step="0.1"
                    value={gramsDefault}
                    onChange={(e) => setGramsDefault(e.target.value)}
                    placeholder="z.B. 1000 fuer kg"
                    className={inputStyle}
                />
            </div>

            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '2',
                    borderTop: '1px solid',
                    borderColor: 'border.muted',
                })}
            >
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending || unit.ingredientCount > 0}
                    className={btnDanger}
                    title={unit.ingredientCount > 0 ? 'Einheit wird noch verwendet' : 'Loeschen'}
                >
                    <Trash2 size={14} />
                </button>
                <div className={css({ display: 'flex', gap: '2' })}>
                    <button type="button" onClick={onClose} className={btnSecondary}>
                        Abbrechen
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending || !shortName.trim() || !longName.trim()}
                        className={btnPrimary}
                    >
                        {isPending ? 'Speichern...' : 'Speichern'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// AddUnitCard
// ---------------------------------------------------------------------------

function AddUnitCard({ onClose }: { onClose: () => void }) {
    const [shortName, setShortName] = useState('');
    const [longName, setLongName] = useState('');
    const [gramsDefault, setGramsDefault] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!shortName.trim() || !longName.trim()) return;
        setError('');
        startTransition(async () => {
            try {
                await createUnit({
                    shortName: shortName.trim(),
                    longName: longName.trim(),
                    gramsDefault: gramsDefault === '' ? null : parseFloat(gramsDefault),
                });
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Fehler');
            }
        });
    };

    return (
        <div
            className={css({
                borderRadius: '2xl',
                border: '1px solid',
                borderColor: 'brand.primary',
                bg: { base: 'rgba(224,123,83,0.04)', _dark: 'rgba(224,123,83,0.06)' },
                padding: '4',
                display: 'flex',
                flexDirection: 'column',
                gap: '3',
            })}
        >
            <p className={sectionLabelStyle}>Neue Einheit</p>

            {error && (
                <div
                    className={css({
                        padding: '2',
                        borderRadius: 'lg',
                        bg: 'error.bg',
                        color: 'error.text',
                        fontSize: 'xs',
                    })}
                >
                    {error}
                </div>
            )}

            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: { base: '1fr', sm: '1fr 1fr auto' },
                    gap: '3',
                })}
            >
                <div>
                    <label
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            display: 'block',
                            marginBottom: '1',
                            fontWeight: '500',
                        })}
                    >
                        Kurzname
                    </label>
                    <input
                        type="text"
                        value={shortName}
                        onChange={(e) => setShortName(e.target.value)}
                        placeholder="z.B. Stk"
                        autoFocus
                        className={inputStyle}
                    />
                </div>
                <div>
                    <label
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            display: 'block',
                            marginBottom: '1',
                            fontWeight: '500',
                        })}
                    >
                        Langname
                    </label>
                    <input
                        type="text"
                        value={longName}
                        onChange={(e) => setLongName(e.target.value)}
                        placeholder="z.B. Stueck"
                        className={inputStyle}
                    />
                </div>
                <div>
                    <label
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            display: 'block',
                            marginBottom: '1',
                            fontWeight: '500',
                        })}
                    >
                        Standard-g
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={gramsDefault}
                        onChange={(e) => setGramsDefault(e.target.value)}
                        placeholder="optional"
                        className={inputStyle}
                    />
                </div>
            </div>

            <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: '2' })}>
                <button type="button" onClick={onClose} className={btnSecondary}>
                    <X size={14} /> Abbrechen
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending || !shortName.trim() || !longName.trim()}
                    className={btnPrimary}
                >
                    <Check size={14} /> {isPending ? 'Erstellen...' : 'Erstellen'}
                </button>
            </div>
        </div>
    );
}
