'use client';

import { CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { weekdayShort } from '@shared/dates';

import { css, cx } from 'styled-system/css';

import { chip } from '../styles';

import { slotSummary } from './selection-state';
import type { WeekSelection } from './useWeekSelection';

type SlotPickerProps = {
    selection: WeekSelection;
    days: string[];
    slots: { key: string; label: string; time: string }[];
};

const label = css({
    fontSize: 'xs',
    fontWeight: '600',
    color: 'text.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    mr: '1',
});

/**
 * Head of the week selection: meal and day chips, pre-set with the free slots. Fully
 * occupied meals or days are disabled. On phones a one-line summary that opens the chips.
 */
export function SlotPicker({ selection, days, slots }: SlotPickerProps) {
    const [open, setOpen] = useState(false);
    const { meals, days: chosenDays, toggleMeal, toggleDay, hasFree, state, free } = selection;
    const labels = Object.fromEntries(slots.map((slot) => [slot.key, slot.label]));
    const summary = slotSummary(state.chosenSlots, free, labels);

    const chips = (
        <div
            className={css({
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                columnGap: '5',
                rowGap: '2',
            })}
        >
            <div
                role="group"
                aria-label="Mahlzeiten"
                className={css({
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '1.5',
                })}
            >
                <span className={label}>Mahlzeiten</span>
                {slots.map((slot) => (
                    <button
                        key={slot.key}
                        type="button"
                        aria-pressed={meals.includes(slot.key)}
                        disabled={!hasFree('meal', slot.key)}
                        title={hasFree('meal', slot.key) ? undefined : 'Diese Woche schon belegt'}
                        onClick={() => toggleMeal(slot.key)}
                        className={chip({ active: meals.includes(slot.key) })}
                    >
                        {slot.label}
                    </button>
                ))}
            </div>
            <div
                role="group"
                aria-label="Tage"
                className={css({
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '1.5',
                })}
            >
                <span className={label}>Tage</span>
                {days.map((day) => (
                    <button
                        key={day}
                        type="button"
                        aria-pressed={chosenDays.includes(day)}
                        disabled={!hasFree('day', day)}
                        title={hasFree('day', day) ? undefined : 'Dieser Tag ist schon belegt'}
                        onClick={() => toggleDay(day)}
                        className={chip({ active: chosenDays.includes(day) })}
                    >
                        {weekdayShort(day)}
                    </button>
                ))}
            </div>
            <span
                className={css({
                    fontSize: 'sm',
                    color: 'text.muted',
                    display: { base: 'none', md: 'inline' },
                })}
            >
                {summary}
            </span>
        </div>
    );

    return (
        <div
            className={css({
                px: { base: '4', md: '6' },
                py: '3',
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: 'border',
            })}
        >
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className={css({
                    display: { base: 'flex', md: 'none' },
                    alignItems: 'center',
                    gap: '2',
                    width: 'full',
                    bg: 'transparent',
                    border: 'none',
                    p: 0,
                    color: 'text',
                    fontSize: 'sm',
                    textAlign: 'left',
                    cursor: 'pointer',
                })}
            >
                <CalendarDays size={16} />
                <span className={css({ flex: 1, minW: 0 })}>{summary}</span>
                <ChevronDown
                    size={16}
                    className={css({ transition: 'transform 150ms ease' })}
                    style={{ transform: open ? 'rotate(180deg)' : undefined }}
                />
            </button>
            <div
                className={cx(
                    css({
                        display: { base: open ? 'block' : 'none', md: 'block' },
                        mt: { base: open ? '3' : 0, md: 0 },
                    }),
                )}
            >
                {chips}
            </div>
        </div>
    );
}
