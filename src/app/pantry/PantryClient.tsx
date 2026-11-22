'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';

import { Button } from '@app/components/atoms/Button';
import { input } from '@app/components/atoms/recipes';
import { IngredientIcon } from '@app/components/ingredients/IngredientIcon';
import {
    expiryHint,
    formatPantryAmount,
    groupPantryItems,
    type PantryViewInput,
} from '@app/lib/pantry/view';

import { css, cx } from 'styled-system/css';

import { addManualPantryItem, setPantryStatus, type PantryActionResult } from './actions';

export interface PantryEntry extends PantryViewInput {
    icon: string | null;
    hasIngredient: boolean;
}

const UNITS = ['g', 'kg', 'ml', 'l', 'Stk'] as const;

const card = css({
    bg: 'surface.card',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'xl',
    overflow: 'hidden',
});
const row = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    px: '4',
    py: '3',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderColor: 'border.muted',
    _first: { borderTop: 'none' },
});
const groupTitle = css({
    fontFamily: 'heading',
    fontSize: 'sm',
    fontWeight: 'semibold',
    color: 'text.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    mb: '2',
    mt: '5',
});
const TONE_COLOR = { ok: 'text.muted', soon: 'status.warning', expired: 'status.error' } as const;

export function PantryClient({ entries }: { entries: PantryEntry[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState('');
    const [undo, setUndo] = useState<{ id: string; label: string } | null>(null);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [unit, setUnit] = useState<(typeof UNITS)[number]>('g');
    const now = new Date();
    const groups = groupPantryItems(entries, now);

    function perform(action: () => Promise<PantryActionResult>, after?: () => void) {
        setMessage('');
        startTransition(async () => {
            const result = await action();
            if (!result.ok) {
                setMessage(result.error);
                return;
            }
            after?.();
            router.refresh();
        });
    }

    function finish(entry: PantryEntry, status: 'USED_UP' | 'DISCARDED') {
        perform(
            () => setPantryStatus(entry.id, status),
            () =>
                setUndo({
                    id: entry.id,
                    label: `${entry.name} ${status === 'USED_UP' ? 'aufgebraucht' : 'weggeworfen'}`,
                }),
        );
    }

    function add(event: FormEvent) {
        event.preventDefault();
        if (!name.trim()) return;
        perform(
            () => addManualPantryItem({ name, ...(amount.trim() ? { amount, unit } : {}) }),
            () => {
                setName('');
                setAmount('');
            },
        );
    }

    return (
        <div>
            <form
                onSubmit={add}
                className={css({
                    display: 'flex',
                    gap: '2',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                })}
            >
                <input
                    className={cx(input, css({ flex: '1 1 10rem', minW: 0 }))}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Etwas hinzufügen, z. B. Sahne"
                    aria-label="Name"
                    maxLength={200}
                />
                <input
                    className={cx(input, css({ w: '5rem', minW: 0 }))}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Menge"
                    inputMode="decimal"
                    aria-label="Menge"
                    maxLength={20}
                />
                <select
                    className={input}
                    value={unit}
                    onChange={(event) => setUnit(event.target.value as (typeof UNITS)[number])}
                    aria-label="Einheit"
                >
                    {UNITS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={pending || !name.trim()}
                >
                    Hinzufügen
                </Button>
            </form>

            <p role="status" className={css({ color: 'status.error', fontSize: 'sm', mt: '2' })}>
                {message}
            </p>
            {undo && (
                <div
                    role="status"
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '3',
                        mt: '3',
                        px: '4',
                        py: '2',
                        borderRadius: 'lg',
                        bg: 'surface.muted',
                        fontSize: 'sm',
                    })}
                >
                    <span>{undo.label}</span>
                    <button
                        type="button"
                        className={css({
                            color: 'primary',
                            fontWeight: 'semibold',
                            cursor: 'pointer',
                        })}
                        onClick={() => {
                            const id = undo.id;
                            perform(
                                () => setPantryStatus(id, 'AVAILABLE'),
                                () => setUndo(null),
                            );
                        }}
                    >
                        Rückgängig
                    </button>
                </div>
            )}

            {groups.length === 0 && (
                <p className={css({ color: 'text.muted', mt: '8', textAlign: 'center' })}>
                    Noch nichts im Vorrat. Was du abhakst und kochst, erscheint hier von selbst.
                </p>
            )}

            {groups.map((group) => (
                <section key={group.key} aria-label={group.title}>
                    <h2 className={groupTitle}>{group.title}</h2>
                    <div className={card}>
                        {group.items.map((entry) => {
                            const amountLabel = formatPantryAmount(entry);
                            const hint = expiryHint(entry.expiresAt, now);
                            return (
                                <div key={entry.id} className={row}>
                                    <span className={css({ color: 'text.muted' })}>
                                        <IngredientIcon
                                            icon={entry.icon}
                                            text={entry.hasIngredient ? undefined : entry.name}
                                            size={26}
                                        />
                                    </span>
                                    <div className={css({ flex: 1, minW: 0 })}>
                                        <div
                                            className={css({
                                                fontWeight: 'medium',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            })}
                                        >
                                            {entry.name}
                                            {amountLabel && (
                                                <span
                                                    className={css({
                                                        color: 'text.muted',
                                                        fontWeight: 'normal',
                                                    })}
                                                >
                                                    {' · '}
                                                    {amountLabel}
                                                </span>
                                            )}
                                        </div>
                                        {hint && (
                                            <div
                                                className={css({
                                                    fontSize: 'xs',
                                                    color: TONE_COLOR[hint.tone],
                                                })}
                                            >
                                                {hint.label}
                                            </div>
                                        )}
                                    </div>
                                    <div className={css({ display: 'flex', gap: '1.5' })}>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={pending}
                                            onClick={() => finish(entry, 'USED_UP')}
                                        >
                                            Aufgebraucht
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={pending}
                                            onClick={() => finish(entry, 'DISCARDED')}
                                        >
                                            Weggeworfen
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
