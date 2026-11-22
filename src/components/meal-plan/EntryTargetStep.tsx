'use client';

import { ArrowRightLeft } from 'lucide-react';
import { useState } from 'react';

import {
    cookPlanEntryForTwo,
    movePlanEntry,
    swapPlanCells,
    undoCookForTwo,
} from '@app/app/plan/edit-actions';
import { Button } from '@app/components/atoms/Button';
import { addDays, weekdayShort } from '@shared/dates';

import { css } from 'styled-system/css';

import { leftoverCookServings } from './leftover-servings';
import { dishesIn, TargetPicker, type Cell } from './TargetPicker';
import type { PlanDish, PlanSlot, PlanWeekData } from './types';
import { usePlanAction } from './usePlanAction';

export type TargetMode = 'move' | 'copy' | 'leftover';

const TITLE: Record<TargetMode, string> = {
    move: 'Verschieben nach',
    copy: 'Kopieren nach',
    leftover: 'Rest einplanen für',
};
const SUBMIT: Record<TargetMode, string> = {
    move: 'Verschieben',
    copy: 'Kopieren',
    leftover: 'Einplanen',
};

const column = css({ display: 'flex', flexDirection: 'column', gap: '4' });
const heading = css({ fontWeight: '600' });
const hint = css({ fontSize: 'sm', color: 'foreground.muted' });
const actions = css({ display: 'flex', gap: '2', flexWrap: 'wrap' });
const spacer = css({ flex: 1 });

/** Second step of the entry sheet: pick the target cell to move, copy or plan the leftover. */
export function EntryTargetStep({
    mode,
    dish,
    data,
    slots,
    onBack,
    onDone,
}: {
    mode: TargetMode;
    dish: PlanDish;
    data: PlanWeekData;
    slots: PlanSlot[];
    onBack: () => void;
    onDone: () => void;
}) {
    const { call, busy, showToast } = usePlanAction();
    // The leftover may also go into the first days of next week
    const days =
        mode === 'leftover'
            ? [...data.days, ...[1, 2, 3].map((n) => addDays(data.days[6], n))].filter(
                  (day) => day >= dish.date,
              )
            : data.days;
    const [cell, setCell] = useState<Cell>(() => defaultTarget(mode, dish, slots, days));
    const taken = dishesIn(data.dishes, cell, dish.id);
    const same = cell.date === dish.date && cell.slot === dish.slot;

    const cooked = leftoverCookServings(dish.servings);

    const submit = async (swap = false) => {
        if (mode === 'leftover') {
            const result = await call(() => cookPlanEntryForTwo(dish.id, cell));
            if (!result) return;
            onDone();
            showToast({
                type: 'success',
                title: 'Für 2 Mahlzeiten geplant',
                message: `${cooked} Portionen kochen, Rest am ${weekdayShort(cell.date)}.`,
                duration: 8000,
                action: {
                    label: 'Rückgängig',
                    onClick: () =>
                        void call(() => undoCookForTwo(result.leftoverId, result.originServings)),
                },
            });
            return;
        }
        const done = swap
            ? await call(() => swapPlanCells({ a: { date: dish.date, slot: dish.slot }, b: cell }))
            : await call(() => movePlanEntry(dish.id, { ...cell, copy: mode === 'copy' }));
        if (!done) return;
        onDone();
        showToast({
            type: 'success',
            title: swap ? 'Getauscht' : mode === 'copy' ? 'Kopiert' : 'Verschoben',
        });
    };

    return (
        <div className={column}>
            <p className={heading}>{TITLE[mode]}</p>
            {mode === 'leftover' && (
                <p className={hint}>
                    Du kochst {cooked} statt {dish.servings} Portionen. Der Rest kommt nicht noch
                    einmal auf die Einkaufsliste.
                </p>
            )}
            <TargetPicker
                days={days}
                slots={slots}
                value={cell}
                onChange={setCell}
                dishes={data.dishes}
                ignoreId={dish.id}
            />
            <div className={actions}>
                <Button variant="ghost" type="button" onClick={onBack}>
                    Zurück
                </Button>
                <span className={spacer} />
                {mode === 'move' && taken.length > 0 && (
                    <Button type="button" onClick={() => submit(true)} disabled={busy}>
                        <ArrowRightLeft size={16} aria-hidden /> Tauschen
                    </Button>
                )}
                <Button
                    variant="primary"
                    type="button"
                    onClick={() => submit()}
                    disabled={busy || (same && mode !== 'copy')}
                >
                    {taken.length > 0 && mode !== 'leftover' ? 'Dazulegen' : SUBMIT[mode]}
                </Button>
            </div>
        </div>
    );
}

function defaultTarget(mode: TargetMode, dish: PlanDish, slots: PlanSlot[], days: string[]): Cell {
    if (mode !== 'leftover') return { date: dish.date, slot: dish.slot };
    // "Bolognese vom Vortag": next day, lunch if there is one
    const nextDay = days.find((day) => day > dish.date) ?? dish.date;
    const lunch = slots.find((slot) => slot.key === 'LUNCH' && slot.enabled);
    return { date: nextDay, slot: lunch?.key ?? dish.slot };
}
