'use client';

import type { ReactNode } from 'react';

import { formatKcal, shortDate } from '@app/lib/meal-plan/view';
import { weekdayShort } from '@shared/dates';

import { css, cx } from 'styled-system/css';

import { usePlanEditor } from './PlanEditor';
import { kcalText, slotName, surfaceCard } from './styles';
import type { PlanSlot, PlanWeekData } from './types';

type Kcal = { kcal: number | null; incomplete: boolean };
type RenderCell = (day: string, slot: PlanSlot, compact: boolean) => ReactNode;

const grid = css(surfaceCard, {
    display: { base: 'none', lg: 'grid' },
    gridTemplateColumns: '44px repeat(7, minmax(0, 1fr))',
    overflow: 'hidden',
});
const dayHead = css({
    px: '2',
    pt: '3',
    pb: '2.5',
    borderLeftWidth: '1px',
    borderLeftStyle: 'solid',
    borderColor: 'border.muted',
    minW: 0,
});
const todayHead = css({ bg: 'accent.soft', boxShadow: 'inset 0 3px 0 token(colors.primary)' });
const dayName = css({ fontFamily: 'heading', fontWeight: '700', fontSize: 'md', color: 'text' });
const todayName = css({
    fontFamily: 'heading',
    fontWeight: '700',
    fontSize: 'md',
    color: 'primary',
});
const dayDate = css({ fontSize: 'xs', color: 'foreground.muted' });
const dayKcal = css(kcalText, { fontSize: '11px' });
const slotHead = css(slotName, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderColor: 'border.muted',
    letterSpacing: '0.06em',
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    py: '2',
});
const hiddenSlot = css({ opacity: 0.6 });
const slotCell = css({
    p: '1.5',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderLeftWidth: '1px',
    borderLeftStyle: 'solid',
    borderColor: 'border.muted',
    minW: 0,
    '&[data-drop-over]': {
        outline: '2px dashed',
        outlineColor: 'primary',
        outlineOffset: '-3px',
        bg: 'accent.soft',
    },
});
const todayCell = css({ bg: 'accent.soft' });

/** The plan from lg: days as columns, meals as rows. */
export function DesktopWeekGrid({
    data,
    calories,
    renderCell,
}: {
    data: PlanWeekData;
    calories: Record<string, Kcal>;
    renderCell: RenderCell;
}) {
    return (
        <section aria-label="Wochenplan" className={grid}>
            <div />
            {data.days.map((day) => (
                <div key={day} className={cx(dayHead, day === data.today && todayHead)}>
                    <DayHead
                        day={day}
                        today={data.today}
                        kcal={data.display.showCalories ? calories[day] : undefined}
                    />
                </div>
            ))}
            {data.slots.map((slot) => (
                <SlotRow
                    key={slot.key}
                    slot={slot}
                    days={data.days}
                    today={data.today}
                    renderCell={renderCell}
                />
            ))}
        </section>
    );
}

function DayHead({ day, today, kcal }: { day: string; today: string; kcal?: Kcal }) {
    const isToday = day === today;
    return (
        <>
            <div className={isToday ? todayName : dayName}>
                {isToday ? 'Heute' : weekdayShort(day)}
            </div>
            <div className={dayDate}>{shortDate(day)}</div>
            {kcal && kcal.kcal !== null && (
                <div
                    className={dayKcal}
                    title={
                        kcal.incomplete
                            ? 'Nicht für alle Gerichte gibt es vollständige Nährwerte.'
                            : 'Kalorien pro Person'
                    }
                >
                    ~{formatKcal(kcal.kcal)} kcal{kcal.incomplete ? ' · unvollst.' : ''}
                </div>
            )}
        </>
    );
}

function SlotRow({
    slot,
    days,
    today,
    renderCell,
}: {
    slot: PlanSlot;
    days: string[];
    today: string;
    renderCell: RenderCell;
}) {
    const editor = usePlanEditor();
    return (
        <>
            <div
                className={cx(slotHead, !slot.enabled && hiddenSlot)}
                title={slot.enabled ? undefined : 'Ausgeblendet, enthält aber Gerichte'}
            >
                {slot.label}
            </div>
            {days.map((day) => (
                <div
                    key={day}
                    {...editor?.dropTarget({ date: day, slot: slot.key })}
                    className={cx(slotCell, day === today && todayCell)}
                >
                    {renderCell(day, slot, true)}
                </div>
            ))}
        </>
    );
}
