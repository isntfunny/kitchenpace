// Day markers for the month calendar of "Hinzufügen zu …" (KUC-130). Pure: the caller passes
// the plan entries of the visible range, no database and no clock involved.
import { addDays, diffDays, isoWeekday, type IsoDate } from '../dates';

/** The part of a plan entry the calendar needs. */
export interface CalendarEntry {
    date: IsoDate;
    slot: string;
    recipeId: string;
}

export interface CalendarDay {
    date: IsoDate;
    /** False for the leading and trailing days of the neighbouring months */
    inMonth: boolean;
    /** Plan entries on this day, all recipes */
    count: number;
    /** The recipe being added is already planned on this day */
    hasRecipe: boolean;
    isToday: boolean;
    /** Days before today cannot be planned */
    disabled: boolean;
}

/** "YYYY-MM" */
export type IsoMonth = string;

const ISO_MONTH = /^(\d{4})-(\d{2})$/;

export const MONTH_NAMES = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
] as const;

export const monthOf = (date: IsoDate): IsoMonth => date.slice(0, 7);

/** The month `delta` months from `month`, across year boundaries. */
export function addMonths(month: IsoMonth, delta: number): IsoMonth {
    const match = ISO_MONTH.exec(month);
    if (!match) throw new RangeError(`Invalid month: ${month}`);
    const index = Number(match[1]) * 12 + (Number(match[2]) - 1) + delta;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** "November 2026" */
export function monthTitle(month: IsoMonth): string {
    return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/**
 * First day of the first and last visible week of the month, for the user's week start.
 * `to` is the last day of the last week, so the range can be loaded in one query.
 */
export function monthGridRange(
    month: IsoMonth,
    weekStartDay: number,
): { from: IsoDate; to: IsoDate } {
    const first = `${month}-01`;
    const from = addDays(first, -((isoWeekday(first) - weekStartDay + 7) % 7));
    const last = addDays(`${addMonths(month, 1)}-01`, -1);
    const to = addDays(last, 6 - ((isoWeekday(last) - weekStartDay + 7) % 7));
    return { from, to };
}

/** The month as rows of 7 days, each marked with counts, "this recipe", today and past. */
export function calendarMonth({
    month,
    weekStartDay,
    today,
    entries,
    recipeId,
}: {
    month: IsoMonth;
    weekStartDay: number;
    today: IsoDate;
    entries: readonly CalendarEntry[];
    recipeId: string;
}): CalendarDay[][] {
    const { from, to } = monthGridRange(month, weekStartDay);
    const counts = new Map<IsoDate, number>();
    const withRecipe = new Set<IsoDate>();
    for (const entry of entries) {
        counts.set(entry.date, (counts.get(entry.date) ?? 0) + 1);
        if (entry.recipeId === recipeId) withRecipe.add(entry.date);
    }
    const weeks: CalendarDay[][] = [];
    for (let offset = 0; offset <= diffDays(from, to); offset += 7) {
        weeks.push(
            Array.from({ length: 7 }, (_, index) => {
                const date = addDays(from, offset + index);
                return {
                    date,
                    inMonth: monthOf(date) === month,
                    count: counts.get(date) ?? 0,
                    hasRecipe: withRecipe.has(date),
                    isToday: date === today,
                    disabled: date < today,
                };
            }),
        );
    }
    return weeks;
}

/**
 * The meal to suggest on a day: the wanted one if it is enabled and free, else the first free
 * enabled meal; when every meal is taken the wanted one (or the first enabled) stays, since a
 * day may hold several dishes. A switched-off meal is never suggested.
 */
export function suggestSlot(
    slots: readonly { key: string; enabled: boolean }[],
    takenKeys: Iterable<string>,
    wanted: string | null,
): string | null {
    const taken = new Set(takenKeys);
    const enabled = slots.filter((slot) => slot.enabled);
    const wantedSlot = enabled.find((slot) => slot.key === wanted);
    if (wantedSlot && !taken.has(wantedSlot.key)) return wantedSlot.key;
    const free = enabled.find((slot) => !taken.has(slot.key));
    return (free ?? wantedSlot ?? enabled[0])?.key ?? null;
}
