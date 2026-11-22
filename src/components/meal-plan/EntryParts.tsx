'use client';

import { Check, Undo2 } from 'lucide-react';
import { useId, useState } from 'react';

import {
    markPlanEntryCooked,
    skipPlanEntry,
    unmarkPlanEntryCooked,
    updatePlanEntry,
} from '@app/app/plan/edit-actions';
import { button, fieldLabel, input } from '@app/components/atoms/recipes';
import { ServingsStepper } from '@app/components/ui/ServingsStepper';
import { needsCookedAnswer } from '@app/lib/meal-plan/view';


import { css, cx } from 'styled-system/css';

import { Switch, TimeField } from './FormParts';
import type { PlanDish } from './types';
import { usePlanAction } from './usePlanAction';

// Parts of the slot menu (EntrySheet): "Gekocht" (KUC-103) and the entry fields (KUC-101).

export function CookedSection({ dish, today }: { dish: PlanDish; today: string }) {
    const { call, busy, showToast } = usePlanAction();
    const eaten = dish.isLeftover ? 'Gegessen' : 'Gekocht';

    const cook = async () => {
        const result = await call(() => markPlanEntryCooked(dish.id));
        if (!result || result.alreadyCooked) return;
        showToast({
            type: 'success',
            title: eaten,
            message: result.pantryBooked ? undefined : 'Den Vorrat aktualisieren wir etwas später.',
            duration: 8000,
            action: {
                label: 'Rückgängig',
                onClick: () => void call(() => unmarkPlanEntryCooked(dish.id)),
            },
        });
    };
    const uncook = () => call(() => unmarkPlanEntryCooked(dish.id));
    const skip = () => call(() => skipPlanEntry(dish.id));

    const box = css({
        display: 'flex',
        alignItems: 'center',
        gap: '2',
        flexWrap: 'wrap',
        p: '3',
        borderRadius: 'lg',
        bg: 'surface.muted',
    });
    const text = css({ flex: 1, minW: '140px', fontSize: 'sm', fontWeight: '600' });

    if (dish.status === 'COMPLETED')
        return (
            <div className={box}>
                <span className={text}>
                    <Check
                        size={16}
                        aria-hidden
                        className={css({ display: 'inline', color: 'status.success', mr: '1' })}
                    />
                    {eaten}
                </span>
                <button
                    type="button"
                    className={button({ variant: 'ghost' })}
                    onClick={uncook}
                    disabled={busy}
                >
                    <Undo2 size={16} aria-hidden /> Doch nicht {eaten.toLowerCase()}
                </button>
            </div>
        );
    if (dish.status === 'CANCELLED')
        return (
            <div className={box}>
                <span className={text}>Nicht {eaten.toLowerCase()}</span>
                <button type="button" className={button()} onClick={cook} disabled={busy}>
                    Doch {eaten.toLowerCase()}
                </button>
            </div>
        );
    if (needsCookedAnswer(dish, today))
        return (
            <div className={box}>
                <span className={text}>
                    {dish.isLeftover ? 'Gegessen?' : 'Hast du das gekocht?'}
                </span>
                <button
                    type="button"
                    className={button({ variant: 'primary' })}
                    onClick={cook}
                    disabled={busy}
                >
                    <Check size={16} aria-hidden /> Ja
                </button>
                <button type="button" className={button()} onClick={skip} disabled={busy}>
                    Nein
                </button>
            </div>
        );
    if (!dish.recipeAvailable) return null;
    return (
        <button
            type="button"
            className={button({ variant: 'outline' })}
            onClick={cook}
            disabled={busy}
        >
            <Check size={16} aria-hidden /> {eaten}
        </button>
    );
}

export function EntryFields({
    dish,
    slotTime,
    householdSize,
}: {
    dish: PlanDish;
    slotTime: string;
    householdSize: number | null;
}) {
    const { call, busy, showToast } = usePlanAction();
    const notesId = useId();
    const [servings, setServings] = useState(dish.servings);
    const [ownTime, setOwnTime] = useState(dish.time !== null);
    const [time, setTime] = useState(dish.time ?? slotTime);
    const [notes, setNotes] = useState(dish.notes ?? '');

    const next = {
        servings,
        time: ownTime ? time : null,
        notes: notes.trim() || null,
    };
    const dirty =
        next.servings !== dish.servings ||
        next.time !== dish.time ||
        next.notes !== (dish.notes ?? null);

    const save = async () => {
        if (await call(() => updatePlanEntry(dish.id, next)))
            showToast({ type: 'success', title: 'Gespeichert' });
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
            <ServingsStepper
                value={servings}
                onChange={setServings}
                householdSize={householdSize}
            />
            <Switch
                checked={ownTime}
                onChange={setOwnTime}
                label="Eigene Uhrzeit"
                description={`Sonst gilt die Zeit der Mahlzeit (${slotTime} Uhr).`}
            />
            {ownTime && <TimeField value={time} onChange={setTime} />}
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
                <label htmlFor={notesId} className={fieldLabel}>
                    Notiz
                </label>
                <textarea
                    id={notesId}
                    value={notes}
                    maxLength={500}
                    rows={2}
                    placeholder="z. B. Hähnchen am Vorabend auftauen"
                    onChange={(event) => setNotes(event.target.value)}
                    className={cx(input, css({ py: '2', minH: '64px', resize: 'vertical' }))}
                />
            </div>
            {dirty && (
                <button
                    type="button"
                    className={button({ variant: 'primary' })}
                    onClick={save}
                    disabled={busy || (ownTime && !time)}
                >
                    Speichern
                </button>
            )}
        </div>
    );
}
