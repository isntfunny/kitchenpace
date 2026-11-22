'use client';

import { useEffect, useId, useState } from 'react';

import type { PlanActionResult } from '@app/app/plan/run';
import { Button } from '@app/components/atoms/Button';
import { fieldLabel, input } from '@app/components/atoms/recipes';
import { shortDate, weekdayLong, weekdayShort } from '@app/lib/meal-plan/view';

import { css } from 'styled-system/css';

import type { PlanWeekData } from './types';

// Shared parts of the week tools (KUC-101): conflict preview and the copy confirmation.

export type Mode = 'add' | 'skip' | 'replace';
export interface Preview {
    count: number;
    conflicts: Array<{ date: string; slot: string; titles: string[] }>;
}

/** Loads a conflict preview whenever `key` changes. */
export function usePreview(key: string | null, load: () => Promise<PlanActionResult<Preview>>) {
    const [state, setState] = useState<{ key: string; preview: Preview | null; error?: string }>();
    useEffect(() => {
        if (!key) return;
        let active = true;
        load().then(
            (result) => {
                if (!active) return;
                setState(
                    result.ok
                        ? { key, preview: result.data }
                        : { key, preview: null, error: result.error },
                );
            },
            () => active && setState({ key, preview: null, error: 'Keine Verbindung.' }),
        );
        return () => {
            active = false;
        };
        // `load` changes with every render; the key says when to reload
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return state?.key === key ? state : undefined;
}

export function CopyPanel({
    preview,
    loading,
    error,
    empty,
    slotLabel,
    confirmLabel,
    onConfirm,
    busy,
}: {
    preview: Preview | null;
    loading: boolean;
    error?: string;
    empty: string;
    slotLabel: (key: string) => string;
    confirmLabel: string;
    onConfirm: (mode: Mode) => void;
    busy: boolean;
}) {
    const [mode, setMode] = useState<Mode>('add');
    const name = useId();
    if (loading) return <p className={muted}>Einen Moment …</p>;
    if (error) return <p className={css({ color: 'status.error', fontSize: 'sm' })}>{error}</p>;
    if (!preview || preview.count === 0) return <p className={muted}>{empty}</p>;
    const options: Array<[Mode, string]> = [
        ['add', 'Dazulegen'],
        ['skip', 'Belegte Mahlzeiten überspringen'],
        ['replace', 'Belegte Mahlzeiten ersetzen'],
    ];
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <p className={css({ fontSize: 'sm' })}>
                {preview.count} {preview.count === 1 ? 'Gericht' : 'Gerichte'} werden eingeplant.
            </p>
            {preview.conflicts.length > 0 && (
                <fieldset
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2',
                        p: '3',
                        borderRadius: 'lg',
                        border: 0,
                        bg: 'palette.gold/14',
                    })}
                >
                    <legend className={css({ fontSize: 'sm', fontWeight: '600', float: 'left' })}>
                        Schon belegt:
                    </legend>
                    <ul
                        className={css({
                            fontSize: 'sm',
                            pl: '4',
                            listStyle: 'disc',
                            clear: 'both',
                        })}
                    >
                        {preview.conflicts.map((conflict) => (
                            <li key={`${conflict.date}|${conflict.slot}`}>
                                {weekdayShort(conflict.date)} {slotLabel(conflict.slot)}:{' '}
                                {conflict.titles.join(', ')}
                            </li>
                        ))}
                    </ul>
                    {options.map(([value, label]) => (
                        <label
                            key={value}
                            className={css({
                                display: 'flex',
                                gap: '2',
                                alignItems: 'center',
                                minH: '36px',
                                fontSize: 'sm',
                                cursor: 'pointer',
                            })}
                        >
                            <input
                                type="radio"
                                name={name}
                                checked={mode === value}
                                onChange={() => setMode(value)}
                                className={css({ accentColor: 'primary', w: '4', h: '4' })}
                            />
                            {label}
                        </label>
                    ))}
                </fieldset>
            )}
            <Button variant="primary" type="button" onClick={() => onConfirm(mode)} disabled={busy}>
                {confirmLabel}
            </Button>
        </div>
    );
}

export const muted = css({ fontSize: 'sm', color: 'foreground.muted' });

export function slotLabelFor(data: PlanWeekData) {
    return (key: string) =>
        data.allSlots.find((slot) => slot.key === key)?.label ??
        data.slots.find((slot) => slot.key === key)?.label ??
        key;
}

export function resultMessage(result: { created: number; replaced: number; skipped: number }) {
    return [
        `${result.created} eingeplant`,
        result.replaced ? `${result.replaced} ersetzt` : null,
        result.skipped ? `${result.skipped} übersprungen` : null,
    ]
        .filter(Boolean)
        .join(', ');
}

export function DaySelect({
    label,
    days,
    value,
    onChange,
}: {
    label: string;
    days: string[];
    value: string;
    onChange: (day: string) => void;
}) {
    const id = useId();
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
            <label htmlFor={id} className={fieldLabel}>
                {label}
            </label>
            <select
                id={id}
                className={input}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {days.map((day) => (
                    <option key={day} value={day}>
                        {weekdayLong(day)}, {shortDate(day)}
                    </option>
                ))}
            </select>
        </div>
    );
}
