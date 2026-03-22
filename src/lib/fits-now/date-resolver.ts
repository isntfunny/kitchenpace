import type { DateResolveType } from '@prisma/client';
import { addDays, isWithinInterval, startOfDay } from 'date-fns';
import { getHolidays, type Holiday } from 'feiertagejs';

// ── Anchor Calculations ─────────────────────────────────────────────────────

/** Calculate the 1st Advent Sunday for a given year (4th Sunday before Dec 25). */
export function firstAdvent(year: number): Date {
    const christmas = new Date(year, 11, 25);
    const dayOfWeek = christmas.getDay(); // 0 = Sunday
    const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const fourthAdvent = new Date(year, 11, 25 - daysToLastSunday);
    return new Date(
        fourthAdvent.getFullYear(),
        fourthAdvent.getMonth(),
        fourthAdvent.getDate() - 21,
    );
}

/** Get Easter Sunday date from feiertagejs holidays (memoized per year). */
const easterCache = new Map<number, Date>();
export function easterSunday(year: number): Date {
    const cached = easterCache.get(year);
    if (cached) return cached;
    const holidays = getHolidays(year, 'ALL');
    const easter = holidays.find((h: Holiday) => h.name === 'OSTERSONNTAG');
    const date =
        easter?.date ??
        (holidays.find((h: Holiday) => h.name === 'OSTERMONTAG')
            ? new Date(
                  holidays.find((h: Holiday) => h.name === 'OSTERMONTAG')!.date.getTime() -
                      86400000,
              )
            : new Date(year, 3, 1));
    easterCache.set(year, date);
    return date;
}

// ── Date Resolution from DB Config ──────────────────────────────────────────

export interface PeriodDateConfig {
    resolveType: DateResolveType;
    startMonth: number | null;
    startDay: number | null;
    endMonth: number | null;
    endDay: number | null;
    startOffsetDays: number | null;
    endOffsetDays: number | null;
    leadDays: number;
    trailDays: number;
}

/**
 * Resolve a food period's core date range for a given year.
 * Does NOT apply leadDays/trailDays — call `resolveDisplayWindow` for the full window.
 */
export function resolvePeriodDates(
    config: Pick<
        PeriodDateConfig,
        | 'resolveType'
        | 'startMonth'
        | 'startDay'
        | 'endMonth'
        | 'endDay'
        | 'startOffsetDays'
        | 'endOffsetDays'
    >,
    year: number,
): { start: Date; end: Date } {
    switch (config.resolveType) {
        case 'FIXED':
            return {
                start: new Date(year, config.startMonth!, config.startDay!),
                end: new Date(year, config.endMonth!, config.endDay!),
            };
        case 'RELATIVE_EASTER': {
            const anchor = easterSunday(year);
            return {
                start: addDays(anchor, config.startOffsetDays ?? 0),
                end: addDays(anchor, config.endOffsetDays ?? 0),
            };
        }
        case 'RELATIVE_ADVENT': {
            const anchor = firstAdvent(year);
            return {
                start: addDays(anchor, config.startOffsetDays ?? 0),
                end: addDays(anchor, config.endOffsetDays ?? 0),
            };
        }
    }
}

/**
 * Resolve the full display window (core range expanded by leadDays/trailDays).
 */
export function resolveDisplayWindow(
    config: PeriodDateConfig,
    year: number,
): { start: Date; end: Date } {
    const core = resolvePeriodDates(config, year);
    return {
        start: addDays(core.start, -config.leadDays),
        end: addDays(core.end, config.trailDays),
    };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export { addDays };

export function inRange(now: Date, start: Date, end: Date): boolean {
    return isWithinInterval(startOfDay(now), {
        start: startOfDay(start),
        end: startOfDay(end),
    });
}
