'use client';

import { Clock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import {
    applyShelfLifeOrderAction,
    previewShelfLifeOrderAction,
} from '@app/app/plan/intelligence-actions';
import { button, sheet, sheetOverlay } from '@app/components/atoms/recipes';
import type { ShelfLifeProposalDTO } from '@app/lib/meal-plan/intelligence/week-planner';
import { MEAL_TYPE_LABELS } from '@app/lib/meal-plan/slots';
import { weekdayShort } from '@app/lib/meal-plan/view';


import { css, cx } from 'styled-system/css';

const place = (ref: { date: string; slot: string }) =>
    `${weekdayShort(ref.date)} ${MEAL_TYPE_LABELS[ref.slot as keyof typeof MEAL_TYPE_LABELS] ?? ref.slot}`;

/** "Nach Haltbarkeit ordnen": shows the proposal with reasons, saves only after "Übernehmen". */
export function ShelfLifeDialog({ startDate }: { startDate: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [proposal, setProposal] = useState<ShelfLifeProposalDTO | null>(null);
    const [error, setError] = useState('');

    async function load() {
        setLoading(true);
        setError('');
        setProposal(null);
        const result = await previewShelfLifeOrderAction({ startDate });
        setLoading(false);
        if (result.ok) setProposal(result.data);
        else setError(result.error);
    }

    async function apply() {
        if (!proposal) return;
        setSaving(true);
        const result = await applyShelfLifeOrderAction({
            startDate,
            signature: proposal.signature,
        });
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setOpen(false);
        router.refresh();
    }

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) void load();
            }}
        >
            <Dialog.Trigger className={button()}>
                <Clock size={16} aria-hidden />
                <span className={css({ display: { base: 'none', sm: 'inline' } })}>
                    Nach Haltbarkeit ordnen
                </span>
                <span className={css({ display: { base: 'inline', sm: 'none' } })}>
                    Haltbarkeit
                </span>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className={sheetOverlay} />
                <Dialog.Content className={sheet()} aria-describedby={undefined}>
                    <div className={css({ display: 'flex', alignItems: 'center', mb: '3' })}>
                        <Dialog.Title
                            className={css({
                                flex: 1,
                                fontFamily: 'heading',
                                fontSize: 'xl',
                                fontWeight: '700',
                            })}
                        >
                            Nach Haltbarkeit ordnen
                        </Dialog.Title>
                        <Dialog.Close
                            className={button({ variant: 'ghost' })}
                            aria-label="Schließen"
                        >
                            <X size={18} />
                        </Dialog.Close>
                    </div>

                    {loading && (
                        <p className={css({ color: 'foreground.muted' })}>
                            Ich prüfe deinen Plan …
                        </p>
                    )}
                    {error && (
                        <p role="alert" className={css({ color: 'status.error', fontSize: 'sm' })}>
                            {error}
                        </p>
                    )}

                    {proposal && (
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}
                        >
                            <ul
                                className={css({
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.5',
                                    fontSize: 'sm',
                                })}
                            >
                                {proposal.reasons.map((reason) => (
                                    <li key={reason}>{reason}</li>
                                ))}
                            </ul>
                            {proposal.moves.length > 0 && (
                                <ul
                                    aria-label="Verschiebungen"
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1',
                                        p: '3',
                                        borderRadius: 'lg',
                                        bg: 'surface.muted',
                                        fontSize: 'sm',
                                    })}
                                >
                                    {proposal.moves.map((move) => (
                                        <li
                                            key={`${move.title}-${move.from.date}-${move.from.slot}`}
                                        >
                                            <strong>{move.title}</strong>: {place(move.from)} →{' '}
                                            {place(move.to)}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <p className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                Fixierte Gerichte, Gerichte mit eigener Uhrzeit und schon gekochte
                                bleiben an ihrem Platz. Gespeichert wird erst, wenn du übernimmst.
                            </p>
                            <div
                                className={css({
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '2',
                                })}
                            >
                                <Dialog.Close className={button({ variant: 'outline' })}>
                                    {proposal.changed ? 'Abbrechen' : 'Schließen'}
                                </Dialog.Close>
                                {proposal.changed && (
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={apply}
                                        className={cx(button({ variant: 'primary' }))}
                                    >
                                        Übernehmen
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
