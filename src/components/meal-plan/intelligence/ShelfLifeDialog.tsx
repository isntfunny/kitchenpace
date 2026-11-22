'use client';

import { Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
    applyShelfLifeOrderAction,
    previewShelfLifeOrderAction,
} from '@app/app/plan/intelligence-actions';
import { Button } from '@app/components/atoms/Button';
import { Sheet, SheetClose } from '@app/components/ui/Sheet';
import type { ShelfLifeProposalDTO } from '@app/lib/meal-plan/intelligence/week-planner';
import { MEAL_TYPE_LABELS } from '@app/lib/meal-plan/slots';
import { weekdayShort } from '@shared/dates';

import { css } from 'styled-system/css';

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
        <Sheet
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) void load();
            }}
            title="Nach Haltbarkeit ordnen"
            trigger={
                <Button type="button">
                    <Clock size={16} aria-hidden />
                    <span className={css({ display: { base: 'none', sm: 'inline' } })}>
                        Nach Haltbarkeit ordnen
                    </span>
                    <span className={css({ display: { base: 'inline', sm: 'none' } })}>
                        Haltbarkeit
                    </span>
                </Button>
            }
            footer={
                proposal && (
                    <>
                        <SheetClose asChild>
                            <Button type="button" variant="outline">
                                {proposal.changed ? 'Abbrechen' : 'Schließen'}
                            </Button>
                        </SheetClose>
                        {proposal.changed && (
                            <Button
                                type="button"
                                variant="primary"
                                disabled={saving}
                                onClick={apply}
                            >
                                Übernehmen
                            </Button>
                        )}
                    </>
                )
            }
        >
            {loading && (
                <p className={css({ color: 'foreground.muted' })}>Ich prüfe deinen Plan …</p>
            )}
            {error && (
                <p role="alert" className={css({ color: 'status.error', fontSize: 'sm' })}>
                    {error}
                </p>
            )}

            {proposal && (
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
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
                                <li key={`${move.title}-${move.from.date}-${move.from.slot}`}>
                                    <strong>{move.title}</strong>: {place(move.from)} →{' '}
                                    {place(move.to)}
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                        Fixierte Gerichte, Gerichte mit eigener Uhrzeit und schon gekochte bleiben
                        an ihrem Platz. Gespeichert wird erst, wenn du übernimmst.
                    </p>
                </div>
            )}
        </Sheet>
    );
}
