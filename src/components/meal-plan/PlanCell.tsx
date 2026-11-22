'use client';

import { Plus } from 'lucide-react';

import type { DishMarker } from '@app/lib/meal-plan/view';
import { weekdayLong } from '@shared/dates';

import { css } from 'styled-system/css';

import { EditableDish } from './PlanEditor';
import { emptySlot } from './styles';
import type { PlanDish, PlanDisplay, PlanSlot } from './types';

const cell = css({ display: 'flex', flexDirection: 'column', minW: 0 });
const addSide = css({
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    mt: '1',
    minH: '32px',
    px: '1.5',
    borderRadius: 'md',
    bg: 'transparent',
    border: 0,
    fontSize: 'xs',
    color: 'foreground.muted',
    cursor: 'pointer',
    _hover: { color: 'primary' },
    _focusVisible: { outline: '2px solid', outlineColor: 'primary' },
});

/** One day and meal of the plan: its dishes and "+ hinzufügen" or "Beilage". */
export function PlanCell({
    day,
    slot,
    dishes,
    compact,
    display,
    today,
    markers,
    onAdd,
}: {
    day: string;
    slot: PlanSlot;
    dishes: PlanDish[];
    compact: boolean;
    display: PlanDisplay;
    today: string;
    markers: Record<string, DishMarker[]>;
    onAdd: () => void;
}) {
    const label = `${weekdayLong(day)}, ${slot.label}: Gericht hinzufügen`;
    return (
        <div className={cell}>
            {dishes.map((dish, index) => (
                <EditableDish
                    key={dish.id}
                    dish={dish}
                    slotTime={slot.time}
                    display={display}
                    side={index > 0}
                    compact={compact}
                    extraMarkers={markers[dish.id]}
                    today={today}
                />
            ))}
            {dishes.length === 0 ? (
                <button type="button" className={emptySlot} onClick={onAdd} aria-label={label}>
                    + hinzufügen
                </button>
            ) : (
                <button type="button" onClick={onAdd} aria-label={label} className={addSide}>
                    <Plus size={13} aria-hidden /> Beilage
                </button>
            )}
        </div>
    );
}
