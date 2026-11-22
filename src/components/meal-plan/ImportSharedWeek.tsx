'use client';

import { CalendarPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { importSharedPlan, previewSharedPlanImport } from '@app/app/plan/share-actions';
import { button, chip } from '@app/components/atoms/recipes';
import { Sheet } from '@app/components/ui/Sheet';
import { weekNumber, weekParam, weekRangeLabel } from '@app/lib/meal-plan/view';


import { css } from 'styled-system/css';

import { CopyPanel, resultMessage, usePreview } from './CopyPanel';
import { usePlanAction } from './usePlanAction';

/** "In meinen Plan übernehmen" on a shared week (KUC-110). */
export function ImportSharedWeek({
    token,
    signedIn,
    targets,
    slotLabels,
}: {
    token: string;
    signedIn: boolean;
    /** Week starts the viewer can copy into: this and next week */
    targets: string[];
    slotLabels: Record<string, string>;
}) {
    const [open, setOpen] = useState(false);
    if (!signedIn)
        return (
            <Link
                href={`/auth/signin?callbackUrl=${encodeURIComponent(`/plan/shared/${token}`)}`}
                className={button({ variant: 'primary' })}
            >
                <CalendarPlus size={16} aria-hidden /> Anmelden und übernehmen
            </Link>
        );
    return (
        <>
            <button
                type="button"
                className={button({ variant: 'primary' })}
                onClick={() => setOpen(true)}
            >
                <CalendarPlus size={16} aria-hidden /> In meinen Plan übernehmen
            </button>
            <Sheet open={open} onOpenChange={setOpen} title="In meinen Plan übernehmen">
                {open && <ImportBody token={token} targets={targets} slotLabels={slotLabels} />}
            </Sheet>
        </>
    );
}

function ImportBody({
    token,
    targets,
    slotLabels,
}: {
    token: string;
    targets: string[];
    slotLabels: Record<string, string>;
}) {
    const router = useRouter();
    const { call, busy, showToast } = usePlanAction();
    const [target, setTarget] = useState(targets[1] ?? targets[0]);
    const state = usePreview(target, () => previewSharedPlanImport({ token, startDate: target }));

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <div
                role="radiogroup"
                aria-label="In welche Woche?"
                className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}
            >
                {targets.map((start, index) => (
                    <button
                        key={start}
                        type="button"
                        role="radio"
                        aria-checked={target === start}
                        className={chip({ active: target === start })}
                        onClick={() => setTarget(start)}
                    >
                        {index === 0 ? 'Diese Woche' : 'Nächste Woche'} · KW {weekNumber(start)}
                    </button>
                ))}
            </div>
            <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                {weekRangeLabel(target)}. Gerichte kommen in deine passenden Mahlzeiten; Notizen
                werden nicht übernommen.
            </p>
            <CopyPanel
                key={target}
                preview={state?.preview ?? null}
                loading={!state}
                error={state?.error}
                empty="Keines der Gerichte ist verfügbar."
                slotLabel={(key) => slotLabels[key] ?? key}
                confirmLabel="Übernehmen"
                busy={busy}
                onConfirm={async (mode) => {
                    const result = await call(() =>
                        importSharedPlan({ token, startDate: target, mode }),
                    );
                    if (!result) return;
                    showToast({
                        type: 'success',
                        title: 'Übernommen',
                        message: resultMessage(result),
                    });
                    router.push(`/plan?week=${weekParam(target)}`);
                }}
            />
        </div>
    );
}
