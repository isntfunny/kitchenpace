'use client';

import { Check, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState, useTransition } from 'react';

import { css } from 'styled-system/css';

import { createUnit, updateUnit } from './actions';
import {
    type Unit,
    btnPrimary,
    btnSecondary,
    closeButtonStyle,
    inputStyle,
} from './ingredient-types';

// ---------------------------------------------------------------------------
// UnitEditPanel
// ---------------------------------------------------------------------------

export function UnitEditPanel({ unit, onClose }: { unit: Unit; onClose: () => void }) {
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

    return (
        <div className={css({ padding: '6', display: 'flex', flexDirection: 'column', gap: '4' })}>
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                })}
            >
                <div>
                    <Dialog.Title
                        className={css({
                            fontSize: 'lg',
                            fontWeight: '700',
                            fontFamily: 'heading',
                            color: 'foreground',
                        })}
                    >
                        Einheit bearbeiten
                    </Dialog.Title>
                    <p
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            marginTop: '0.5',
                        })}
                    >
                        {unit.shortName} ({unit.longName})
                    </p>
                </div>
                <Dialog.Close asChild>
                    <button type="button" className={closeButtonStyle}>
                        <X size={18} />
                    </button>
                </Dialog.Close>
            </div>

            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto',
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
                        Gramm
                    </label>
                    <input
                        type="number"
                        value={gramsDefault}
                        onChange={(e) => setGramsDefault(e.target.value)}
                        placeholder="-"
                        className={inputStyle}
                        style={{ width: 100 }}
                    />
                </div>
            </div>

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

            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '2',
                    paddingTop: '2',
                    borderTop: '1px solid',
                    borderColor: 'border.muted',
                })}
            >
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
    );
}

// ---------------------------------------------------------------------------
// AddUnitForm
// ---------------------------------------------------------------------------

export function AddUnitForm({ onClose }: { onClose: () => void }) {
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
                padding: '4',
                borderBottom: '1px solid',
                borderColor: 'border.muted',
                bg: { base: 'rgba(224,123,83,0.04)', _dark: 'rgba(224,123,83,0.06)' },
                display: 'flex',
                alignItems: 'flex-end',
                gap: '3',
            })}
        >
            <div
                className={css({
                    width: '3px',
                    alignSelf: 'stretch',
                    borderRadius: 'full',
                    bg: 'brand.primary',
                    flexShrink: '0',
                })}
            />
            <div className={css({ flex: '1' })}>
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
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmit();
                        }
                        if (e.key === 'Escape') onClose();
                    }}
                    placeholder="z.B. EL"
                    autoFocus
                    className={inputStyle}
                />
            </div>
            <div className={css({ flex: '1' })}>
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
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                    placeholder="z.B. Essloeffel"
                    className={inputStyle}
                />
            </div>
            <div className={css({ width: '140px' })}>
                <label
                    className={css({
                        fontSize: 'xs',
                        color: 'foreground.muted',
                        display: 'block',
                        marginBottom: '1',
                        fontWeight: '500',
                    })}
                >
                    Gramm
                </label>
                <input
                    type="number"
                    value={gramsDefault}
                    onChange={(e) => setGramsDefault(e.target.value)}
                    placeholder="-"
                    className={inputStyle}
                />
            </div>
            {error && (
                <span className={css({ fontSize: 'xs', color: 'error.text', fontWeight: '500' })}>
                    {error}
                </span>
            )}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !shortName.trim() || !longName.trim()}
                className={btnPrimary}
            >
                <Check size={14} />
            </button>
            <button type="button" onClick={onClose} className={btnSecondary}>
                <X size={14} />
            </button>
        </div>
    );
}
