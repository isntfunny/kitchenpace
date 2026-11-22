'use client';

import { AlertTriangle } from 'lucide-react';
import { useId } from 'react';

import { fieldLabel, input } from '@app/components/atoms/recipes';
import { cellKey, shortDate } from '@app/lib/meal-plan/view';
import { weekdayLong, weekdayShort } from '@shared/dates';

import { css } from 'styled-system/css';

import type { PlanDish, PlanSlot } from './types';

export interface Cell {
    date: string;
    slot: string;
}

/** Day and slot selects for "Verschieben/Kopieren nach …" and the leftover meal. */
export function TargetPicker({
    days,
    slots,
    value,
    onChange,
    dishes,
    ignoreId,
}: {
    days: string[];
    slots: PlanSlot[];
    value: Cell;
    onChange: (cell: Cell) => void;
    /** Dishes known for these days, to show what already lies in the target */
    dishes: PlanDish[];
    /** The dish being moved does not count as taken */
    ignoreId?: string;
}) {
    const dayId = useId();
    const slotId = useId();
    const taken = dishesIn(dishes, value, ignoreId);
    const slotLabel = slots.find((slot) => slot.key === value.slot)?.label ?? value.slot;

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
            <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3' })}>
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
                    <label htmlFor={dayId} className={fieldLabel}>
                        Tag
                    </label>
                    <select
                        id={dayId}
                        className={input}
                        value={value.date}
                        onChange={(event) => onChange({ ...value, date: event.target.value })}
                    >
                        {days.map((day) => (
                            <option key={day} value={day}>
                                {weekdayLong(day)}, {shortDate(day)}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
                    <label htmlFor={slotId} className={fieldLabel}>
                        Mahlzeit
                    </label>
                    <select
                        id={slotId}
                        className={input}
                        value={value.slot}
                        onChange={(event) => onChange({ ...value, slot: event.target.value })}
                    >
                        {slots.map((slot) => (
                            <option key={slot.key} value={slot.key}>
                                {slot.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {taken.length > 0 && (
                <p
                    role="status"
                    className={css({
                        display: 'flex',
                        gap: '2',
                        alignItems: 'flex-start',
                        p: '2.5',
                        borderRadius: 'lg',
                        bg: 'palette.gold/14',
                        fontSize: 'sm',
                    })}
                >
                    <AlertTriangle
                        size={16}
                        aria-hidden
                        className={css({ flexShrink: 0, mt: '0.5', color: 'palette.gold' })}
                    />
                    <span>
                        {weekdayShort(value.date)} {slotLabel} ist schon belegt:{' '}
                        {taken.map((dish) => `„${dish.recipe.title}“`).join(', ')}
                    </span>
                </p>
            )}
        </div>
    );
}

export function dishesIn(dishes: PlanDish[], cell: Cell, ignoreId?: string) {
    const key = cellKey(cell.date, cell.slot);
    return dishes.filter((dish) => dish.id !== ignoreId && cellKey(dish.date, dish.slot) === key);
}
