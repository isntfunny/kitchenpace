'use client';

import { BookOpen, ChefHat, Copy, CopyPlus, MoveRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { deletePlanEntry, restorePlanEntry } from '@app/app/plan/edit-actions';
import { Button } from '@app/components/atoms/Button';
import { button } from '@app/components/atoms/recipes';
import { Sheet } from '@app/components/ui/Sheet';
import { builtInMarkers } from '@app/lib/meal-plan/view';
import { weekdayShort } from '@shared/dates';

import { css } from 'styled-system/css';

import { DishMarkers } from './DishCard';
import { CookedSection, EntryFields } from './EntryParts';
import { EntryTargetStep, type TargetMode } from './EntryTargetStep';
import type { PlanDish, PlanSlot, PlanWeekData } from './types';
import { usePlanAction } from './usePlanAction';

type Mode = 'menu' | TargetMode;

const column = css({ display: 'flex', flexDirection: 'column', gap: '5' });
const links = css({ display: 'flex', gap: '2', flexWrap: 'wrap' });
const menu = css({
    display: 'grid',
    gridTemplateColumns: { base: '1fr', sm: '1fr 1fr' },
    gap: '2',
    pt: '4',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderColor: 'border.muted',
});
const danger = css({ color: 'status.error' });

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
            <EntryTargetStep
                mode={mode}
                dish={dish}
                data={data}
                slots={slots}
                onBack={() => setMode('menu')}
                onDone={onClose}
            />
        );

    return (
        <div className={column}>
            <DishMarkers markers={builtInMarkers(dish, data.today)} />
            <div className={links}>
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

            <div className={menu}>
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
                    <Trash2 size={16} aria-hidden className={danger} /> Entfernen
                </Button>
            </div>
        </div>
    );
}
