'use client';

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

import { IconButton } from '@app/components/atoms/Button';
import { fieldLabel } from '@app/components/atoms/recipes';
import { shortDate } from '@app/lib/meal-plan/view';
import { weekdayShort } from '@shared/dates';
import {
    addMonths,
    calendarMonth,
    monthOf,
    monthTitle,
    type CalendarEntry,
} from '@shared/meal-planning/calendar-days';

import { css, cva, cx } from 'styled-system/css';

const group = css({ display: 'flex', flexDirection: 'column', gap: '2' });
const nav = css({ display: 'flex', alignItems: 'center', gap: '2' });
const navLabel = cx(fieldLabel, css({ flex: 1 }));
const monthText = css({ fontSize: 'sm', fontWeight: '600', minW: '32', textAlign: 'center' });
const grid = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    gap: '1',
});
const weekdayHead = css({
    textAlign: 'center',
    fontSize: 'xs',
    fontWeight: '700',
    color: 'foreground.muted',
});
const dayCell = cva({
    base: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5',
        minH: '44px',
        borderRadius: 'xl',
        border: '1px solid',
        borderColor: 'transparent',
        bg: 'transparent',
        color: 'text',
        fontSize: 'sm',
        cursor: 'pointer',
        _hover: { bg: 'accent.soft' },
        _disabled: { opacity: 0.35, cursor: 'not-allowed', _hover: { bg: 'transparent' } },
        _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
    },
    variants: {
        outside: { true: { color: 'foreground.muted' } },
        today: { true: { borderColor: 'primary', fontWeight: '700' } },
        selected: { true: { bg: 'primary', color: 'white', _hover: { bg: 'primary' } } },
    },
});
const marks = css({ display: 'flex', alignItems: 'center', gap: '0.5', minH: '14px' });
const countBubble = css({
    minW: '14px',
    px: '1',
    borderRadius: 'full',
    bg: 'accent.soft',
    color: 'text',
    fontSize: 'xs',
    fontWeight: '700',
    lineHeight: '14px',
    textAlign: 'center',
});
const recipeMark = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    w: '14px',
    h: '14px',
    borderRadius: 'full',
    bg: 'status.success',
    color: 'white',
});
const legend = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '3',
    fontSize: 'xs',
    color: 'foreground.muted',
});
const legendItem = css({ display: 'inline-flex', alignItems: 'center', gap: '1' });

/**
 * Month view for picking the day to plan on (KUC-130). Marks days with entries (count), days
 * that already hold this recipe, today, and locks days in the past. The caller loads the
 * entries of the visible month (`getPlanMonth`).
 */
export function PlanMonthCalendar({
    month,
    onMonth,
    weekStartDay,
    today,
    value,
    onChange,
    entries,
    recipeId,
    loading,
}: {
    /** "YYYY-MM" */
    month: string;
    onMonth: (month: string) => void;
    weekStartDay: number;
    today: string;
    value: string;
    onChange: (day: string) => void;
    /** Plan entries of the visible weeks, all recipes */
    entries: readonly CalendarEntry[];
    recipeId: string;
    /** Entries of the month are still on their way */
    loading: boolean;
}) {
    const weeks = calendarMonth({ month, weekStartDay, today, entries, recipeId });
    // Everything before the current month is past anyway
    const canGoBack = month > monthOf(today);
    return (
        <div className={group} aria-busy={loading}>
            <div className={nav}>
                <span className={navLabel}>Tag</span>
                <IconButton
                    aria-label="Vorheriger Monat"
                    disabled={!canGoBack}
                    onClick={() => onMonth(addMonths(month, -1))}
                >
                    <ChevronLeft size={16} />
                </IconButton>
                <span className={monthText} aria-live="polite">
                    {monthTitle(month)}
                </span>
                <IconButton
                    aria-label="Nächster Monat"
                    onClick={() => onMonth(addMonths(month, 1))}
                >
                    <ChevronRight size={16} />
                </IconButton>
            </div>
            <div className={grid} aria-hidden>
                {weeks[0].map((day) => (
                    <span key={day.date} className={weekdayHead}>
                        {weekdayShort(day.date)}
                    </span>
                ))}
            </div>
            <div role="group" aria-label="Tag" className={grid}>
                {weeks.flat().map((day) => (
                    <button
                        key={day.date}
                        type="button"
                        aria-pressed={day.date === value}
                        aria-current={day.isToday ? 'date' : undefined}
                        disabled={day.disabled}
                        aria-label={dayLabel(day)}
                        onClick={() => onChange(day.date)}
                        className={dayCell({
                            outside: !day.inMonth,
                            today: day.isToday,
                            selected: day.date === value,
                        })}
                    >
                        <span>{Number(day.date.slice(8))}</span>
                        <span aria-hidden className={marks}>
                            {day.count > 0 && <span className={countBubble}>{day.count}</span>}
                            {day.hasRecipe && (
                                <span className={recipeMark}>
                                    <Check size={10} strokeWidth={3} />
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>
            <p className={legend}>
                <span className={legendItem}>
                    <span className={countBubble}>2</span> Einträge am Tag
                </span>
                <span className={legendItem}>
                    <span className={recipeMark}>
                        <Check size={10} strokeWidth={3} />
                    </span>
                    Rezept schon geplant
                </span>
            </p>
        </div>
    );
}

function dayLabel(day: ReturnType<typeof calendarMonth>[number][number]): string {
    const parts = [`${weekdayShort(day.date)}, ${shortDate(day.date)}`];
    if (day.isToday) parts.push('heute');
    if (day.count > 0) parts.push(day.count === 1 ? '1 Eintrag' : `${day.count} Einträge`);
    if (day.hasRecipe) parts.push('Rezept schon geplant');
    if (day.disabled) parts.push('vergangen');
    return parts.join(', ');
}
