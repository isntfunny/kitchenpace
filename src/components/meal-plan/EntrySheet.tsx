'use client';

import { ArrowRightLeft, BookOpen, ChefHat, Copy, CopyPlus, MoveRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import {
    cookPlanEntryForTwo,
    deletePlanEntry,
    movePlanEntry,
    restorePlanEntry,
    swapPlanCells,
    undoCookForTwo,
} from '@app/app/plan/edit-actions';
import { Button } from '@app/components/atoms/Button';
import { button } from '@app/components/atoms/recipes';
import { Sheet } from '@app/components/ui/Sheet';
import { builtInMarkers } from '@app/lib/meal-plan/view';
import { weekdayShort } from '@shared/dates';
import { addDays } from '@shared/dates';

import { css } from 'styled-system/css';

import { DishMarkers } from './DishCard';
import { CookedSection, EntryFields } from './EntryParts';
import { dishesIn, TargetPicker, type Cell } from './TargetPicker';
import type { PlanDish, PlanSlot, PlanWeekData } from './types';
import { usePlanAction } from './usePlanAction';

type Mode = 'menu' | 'move' | 'copy' | 'leftover';

interface EntrySheetProps {
    dish: PlanDish | null;
    data: PlanWeekData;
    onClose: () => void;
    returnFocus?: () => HTMLElement | null;
}

/** Slot menu of one planned dish (KUC-101) with "Gekocht" (KUC-103). */
export function EntrySheet({ dish, data, onClose, returnFocus }: EntrySheetProps) {
    return (
        <Sheet
            open={!!dish}
            onOpenChange={(open) => !open && onClose()}
            title={dish?.recipe.title ?? ''}
            subtitle={dish ? subtitleOf(dish, data) : undefined}
            onCloseAutoFocus={(event) => {
                const target = returnFocus?.();
                if (target?.isConnected) {
                    event.preventDefault();
                    target.focus();
                }
            }}
        >
            {dish && <EntryBody key={dish.id} dish={dish} data={data} onClose={onClose} />}
        </Sheet>
    );
}

function subtitleOf(dish: PlanDish, data: PlanWeekData) {
    const slot =
        data.allSlots.find((s) => s.key === dish.slot) ??
        data.slots.find((s) => s.key === dish.slot);
    return `${weekdayShort(dish.date)}, ${dish.date.slice(8)}.${dish.date.slice(5, 7)}. · ${slot?.label ?? dish.slot}`;
}

/** Slots offered as targets: the visible ones plus the dish's own */
function targetSlots(data: PlanWeekData): PlanSlot[] {
    const keys = new Set(data.slots.map((slot) => slot.key));
    return [...data.slots, ...data.allSlots.filter((s) => s.enabled && !keys.has(s.key))];
}

function EntryBody({
    dish,
    data,
    onClose,
}: {
    dish: PlanDish;
    data: PlanWeekData;
    onClose: () => void;
}) {
    const { call, busy, showToast } = usePlanAction();
    const [mode, setMode] = useState<Mode>('menu');
    const slots = targetSlots(data);
    const slotTime = slots.find((slot) => slot.key === dish.slot)?.time ?? '12:00';

    const remove = async () => {
        const snapshot = await call(() => deletePlanEntry(dish.id));
        if (!snapshot) return;
        onClose();
        showToast({
            type: 'info',
            title: 'Entfernt',
            message: `„${dish.recipe.title}“ ist nicht mehr geplant.`,
            duration: 8000,
            action: {
                label: 'Rückgängig',
                onClick: () => void call(() => restorePlanEntry(snapshot)),
            },
        });
    };

    if (mode !== 'menu')
        return (
            <TargetStep
                mode={mode}
                dish={dish}
                data={data}
                slots={slots}
                onBack={() => setMode('menu')}
                onDone={onClose}
            />
        );

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '5' })}>
            <DishMarkers markers={builtInMarkers(dish, data.today)} />
            <div className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}>
                <Link
                    href={`/recipe/${dish.recipe.slug}?portionen=${dish.servings}`}
                    className={button()}
                >
                    <BookOpen size={16} aria-hidden /> Rezept öffnen
                </Link>
                {dish.recipeAvailable && (
                    <Link
                        href={`/recipe/${dish.recipe.slug}/mobile?servings=${dish.servings}`}
                        className={button({ variant: 'primary' })}
                    >
                        <ChefHat size={16} aria-hidden /> Kochen starten
                    </Link>
                )}
            </div>

            <CookedSection dish={dish} today={data.today} />

            <EntryFields dish={dish} slotTime={slotTime} householdSize={data.householdSize} />

            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: { base: '1fr', sm: '1fr 1fr' },
                    gap: '2',
                    pt: '4',
                    borderTopWidth: '1px',
                    borderTopStyle: 'solid',
                    borderColor: 'border.muted',
                })}
            >
                <Button type="button" onClick={() => setMode('move')}>
                    <MoveRight size={16} aria-hidden /> Verschieben …
                </Button>
                <Button type="button" onClick={() => setMode('copy')}>
                    <Copy size={16} aria-hidden /> Kopieren …
                </Button>
                {!dish.isLeftover && dish.recipeAvailable && (
                    <Button type="button" onClick={() => setMode('leftover')}>
                        <CopyPlus size={16} aria-hidden /> Für 2 Mahlzeiten kochen …
                    </Button>
                )}
                <Button variant="ghost" type="button" onClick={remove} disabled={busy}>
                    <Trash2 size={16} aria-hidden className={css({ color: 'status.error' })} />{' '}
                    Entfernen
                </Button>
            </div>
        </div>
    );
}

function TargetStep({
    mode,
    dish,
    data,
    slots,
    onBack,
    onDone,
}: {
    mode: Exclude<Mode, 'menu'>;
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

    const title = {
        move: 'Verschieben nach',
        copy: 'Kopieren nach',
        leftover: 'Rest einplanen für',
    }[mode];

    const submit = async (swap = false) => {
        if (mode === 'leftover') {
            const result = await call(() => cookPlanEntryForTwo(dish.id, cell));
            if (!result) return;
            onDone();
            showToast({
                type: 'success',
                title: 'Für 2 Mahlzeiten geplant',
                message: `${dish.servings * 2} Portionen kochen, Rest am ${weekdayShort(cell.date)}.`,
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
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <p className={css({ fontWeight: '600' })}>{title}</p>
            {mode === 'leftover' && (
                <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                    Du kochst {dish.servings * 2} statt {dish.servings} Portionen. Der Rest kommt
                    nicht noch einmal auf die Einkaufsliste.
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
            <div className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}>
                <Button variant="ghost" type="button" onClick={onBack}>
                    Zurück
                </Button>
                <span className={css({ flex: 1 })} />
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
                    {taken.length > 0 && mode !== 'leftover'
                        ? 'Dazulegen'
                        : { move: 'Verschieben', copy: 'Kopieren', leftover: 'Einplanen' }[mode]}
                </Button>
            </div>
        </div>
    );
}

function defaultTarget(mode: Mode, dish: PlanDish, slots: PlanSlot[], days: string[]): Cell {
    if (mode !== 'leftover') return { date: dish.date, slot: dish.slot };
    // "Bolognese vom Vortag": next day, lunch if there is one
    const nextDay = days.find((day) => day > dish.date) ?? dish.date;
    const lunch = slots.find((slot) => slot.key === 'LUNCH' && slot.enabled);
    return { date: nextDay, slot: lunch?.key ?? dish.slot };
}
