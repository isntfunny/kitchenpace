'use client';

import type { ReactNode } from 'react';

import { formatKcal, shortDate } from '@app/lib/meal-plan/view';
import { weekdayLong, weekdayShort } from '@shared/dates';

import { css } from 'styled-system/css';

import { DayCard, DaySlotRow } from './DayCard';
import { kcalText } from './styles';
import type { PlanSlot, PlanWeekData } from './types';

type Kcal = { kcal: number | null; incomplete: boolean };

const section = css({ display: { base: 'block', lg: 'none' } });
const tabList = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    gap: '1',
    mb: '3',
});
const tabBase = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minH: '52px',
    borderRadius: 'xl',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: 'xs',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
} as const;
const tab = css(tabBase, { borderColor: 'border.muted', bg: 'surface', color: 'text' });
const todayTab = css(tabBase, { borderColor: 'primary', bg: 'surface', color: 'text' });
const activeTab = css(tabBase, { borderColor: 'primary', bg: 'primary', color: 'white' });
const pastTab = css({ opacity: 0.6 });
const tabDay = css({ fontWeight: '700' });
const dotBase = { w: '1', h: '1', borderRadius: 'full' } as const;
const dot = {
    none: css(dotBase, { bg: 'transparent' }),
    planned: css(dotBase, { bg: 'primary' }),
    active: css(dotBase, { bg: 'white' }),
};
const kcalLabel = css(kcalText, { ml: 'auto', fontSize: 'xs' });

/** The plan on phones: day tabs and the picked day as a card. */
export function MobileWeek({
    data,
    day,
    onDay,
    kcal,
    renderCell,
}: {
    data: PlanWeekData;
    day: string;
    onDay: (day: string) => void;
    kcal: Kcal | undefined;
    renderCell: (day: string, slot: PlanSlot, compact: boolean) => ReactNode;
}) {
    const isToday = day === data.today;
    return (
        <section aria-label="Wochenplan" className={section}>
            <DayTabs data={data} active={day} onDay={onDay} />
            <DayCard
                id="plan-day-panel"
                role="tabpanel"
                highlighted={isToday}
                title={isToday ? 'Heute' : weekdayLong(day)}
                date={shortDate(day)}
                extra={
                    data.display.showCalories &&
                    kcal?.kcal != null && (
                        <span className={kcalLabel}>
                            ~{formatKcal(kcal.kcal)} kcal
                            {kcal.incomplete ? ' · unvollst.' : ''}
                        </span>
                    )
                }
            >
                {data.slots.map((slot) => (
                    <DaySlotRow key={slot.key} label={slot.label}>
                        {renderCell(day, slot, false)}
                    </DaySlotRow>
                ))}
            </DayCard>
        </section>
    );
}

function DayTabs({
    data,
    active,
    onDay,
}: {
    data: PlanWeekData;
    active: string;
    onDay: (day: string) => void;
}) {
    return (
        <div role="tablist" aria-label="Tag" className={tabList}>
            {data.days.map((day) => {
                const selected = day === active;
                const planned = data.dishes.some((dish) => dish.date === day);
                const look = selected ? activeTab : day === data.today ? todayTab : tab;
                return (
                    <button
                        key={day}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls="plan-day-panel"
                        onClick={() => onDay(day)}
                        className={!selected && day < data.today ? `${look} ${pastTab}` : look}
                    >
                        <span className={tabDay}>{weekdayShort(day)}</span>
                        <span>{Number(day.slice(8))}</span>
                        <span
                            aria-hidden
                            className={dot[planned ? (selected ? 'active' : 'planned') : 'none']}
                        />
                    </button>
                );
            })}
        </div>
    );
}
