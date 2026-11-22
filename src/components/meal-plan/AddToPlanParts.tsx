'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { IconButton } from '@app/components/atoms/Button';
import { chip, fieldLabel } from '@app/components/atoms/recipes';
import { slotLabel, type SlotConfig } from '@app/lib/meal-plan/slots';
import { shortDate, weekNumber } from '@app/lib/meal-plan/view';
import { weekdayShort } from '@shared/dates';

import { css, cx } from 'styled-system/css';

const group = css({ display: 'flex', flexDirection: 'column', gap: '2' });
const weekNav = css({ display: 'flex', alignItems: 'center', gap: '2' });
const navLabel = cx(fieldLabel, css({ flex: 1 }));
const weekText = css({ fontSize: 'sm', fontWeight: '600', minW: '14', textAlign: 'center' });
const dayGrid = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    gap: '1',
});
const dayBase = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minH: '56px',
    py: '1.5',
    borderRadius: 'xl',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: 'xs',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
} as const;
const dayTile = css(dayBase, { borderColor: 'border.muted', bg: 'surface', color: 'text' });
const activeDay = css(dayBase, { borderColor: 'primary', bg: 'primary', color: 'white' });
const pastDay = css({ opacity: 0.45 });
const dayName = css({ fontWeight: '700' });
const dayNumber = css({ fontSize: 'md' });
const dotBase = { w: '1.5', h: '1.5', borderRadius: 'full' } as const;
const dot = {
    none: css(dotBase, { bg: 'transparent' }),
    planned: css(dotBase, { bg: 'primary' }),
    active: css(dotBase, { bg: 'white' }),
};
const placedText = css({ fontSize: 'sm', color: 'primary', fontWeight: '500' });
const chips = css({ display: 'flex', flexWrap: 'wrap', gap: '2' });

type Placement = { date: string; slot: string };

/** Week switcher and the seven days as radio tiles; marks days the recipe is planned on. */
export function PlanDayPicker({
    weekStart,
    days,
    today,
    value,
    onChange,
    onWeek,
    placements,
    slots,
}: {
    weekStart: string;
    days: string[];
    today: string;
    value: string;
    onChange: (day: string) => void;
    /** Moves the week by `delta` days (-7 or 7) */
    onWeek: (delta: number) => void;
    placements: Placement[];
    slots: SlotConfig[];
}) {
    return (
        <div className={group}>
            <div className={weekNav}>
                <span className={navLabel}>Tag</span>
                <IconButton aria-label="Vorherige Woche" onClick={() => onWeek(-7)}>
                    <ChevronLeft size={16} />
                </IconButton>
                <span className={weekText}>KW {weekNumber(weekStart)}</span>
                <IconButton aria-label="Nächste Woche" onClick={() => onWeek(7)}>
                    <ChevronRight size={16} />
                </IconButton>
            </div>
            <div role="radiogroup" aria-label="Tag" className={dayGrid}>
                {days.map((day) => {
                    const active = day === value;
                    const planned = placements.some((item) => item.date === day);
                    const look = active ? activeDay : dayTile;
                    return (
                        <button
                            key={day}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            aria-label={`${weekdayShort(day)}, ${shortDate(day)}${planned ? ', schon geplant' : ''}`}
                            onClick={() => onChange(day)}
                            className={day < today && !active ? `${look} ${pastDay}` : look}
                        >
                            <span className={dayName}>{weekdayShort(day)}</span>
                            <span className={dayNumber}>{Number(day.slice(8))}</span>
                            <span
                                aria-hidden
                                className={dot[planned ? (active ? 'active' : 'planned') : 'none']}
                            />
                        </button>
                    );
                })}
            </div>
            {placements.length > 0 && (
                <p className={placedText}>
                    Liegt schon am{' '}
                    {placements
                        .map((item) => {
                            const config = slots.find((s) => s.key === item.slot);
                            return `${weekdayShort(item.date)} (${config ? slotLabel(config) : 'Mahlzeit'})`;
                        })
                        .join(', ')}
                </p>
            )}
        </div>
    );
}

/** The meals of the plan as radio chips. */
export function SlotChoice({
    slots,
    value,
    onChange,
}: {
    slots: SlotConfig[];
    value: string | null;
    onChange: (key: string) => void;
}) {
    return (
        <div className={group}>
            <span className={fieldLabel}>Mahlzeit</span>
            <div role="radiogroup" aria-label="Mahlzeit" className={chips}>
                {slots.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        role="radio"
                        aria-checked={item.key === value}
                        className={chip({ active: item.key === value })}
                        onClick={() => onChange(item.key)}
                    >
                        {slotLabel(item)}
                    </button>
                ))}
            </div>
        </div>
    );
}
