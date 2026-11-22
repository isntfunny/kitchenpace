/**
 * Calendar dates as `YYYY-MM-DD` strings (KUC-137). All arithmetic runs on UTC midnight of
 * the date parts, so neither DST nor the server time zone can shift a day. Real instants and
 * time zones live in `zone.ts`.
 */

/** Calendar date `YYYY-MM-DD`. */
export type IsoDate = string;

/** ISO weekday: 1 = Monday … 7 = Sunday */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const DAY_MS = 86_400_000;

/** Parses "YYYY-MM-DD" to a UTC-midnight Date; null for malformed or impossible dates. */
export function parseIsoDate(value: string): Date | null {
    const match = ISO_DATE.exec(value);
    if (!match) return null;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    )
        return null;
    return date;
}

export function isIsoDate(value: string): boolean {
    return parseIsoDate(value) !== null;
}

/** Like `parseIsoDate`, but throws a RangeError ("Invalid date: …") for bad input. */
export function requireIsoDate(value: string): Date {
    const date = parseIsoDate(value);
    if (!date) throw new RangeError(`Invalid date: ${value}`);
    return date;
}

/** Formats the UTC calendar day of a Date (e.g. a Prisma @db.Date value). */
export function formatIsoDate(date: Date): IsoDate {
    return date.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
    return formatIsoDate(new Date(requireIsoDate(date).getTime() + days * DAY_MS));
}

/** Whole days from `from` to `to` (to − from). */
export function diffDays(from: IsoDate, to: IsoDate): number {
    return Math.round((requireIsoDate(to).getTime() - requireIsoDate(from).getTime()) / DAY_MS);
}

export function isoWeekday(date: IsoDate): IsoWeekday {
    const day = requireIsoDate(date).getUTCDay();
    return (day === 0 ? 7 : day) as IsoWeekday;
}

export const isWeekend = (date: IsoDate) => isoWeekday(date) >= 6;

export function assertWeekday(value: number): asserts value is IsoWeekday {
    if (!Number.isInteger(value) || value < 1 || value > 7)
        throw new RangeError(`Invalid ISO weekday: ${value}`);
}

/** ISO 8601 week ("KW") of a date; the week belongs to the year of its Thursday. */
export function isoWeek(date: IsoDate): { year: number; week: number } {
    const thursday = addDays(date, 4 - isoWeekday(date));
    const year = Number(thursday.slice(0, 4));
    return { year, week: Math.floor(diffDays(`${thursday.slice(0, 4)}-01-01`, thursday) / 7) + 1 };
}

export const isoWeekNumber = (date: IsoDate) => isoWeek(date).week;

// ── German weekday names (Monday first, index = ISO weekday − 1) ────────

export const WEEKDAY_NAMES_LONG = [
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
    'Sonntag',
] as const;

export const WEEKDAY_NAMES_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

/** "Montag" for an ISO weekday number. */
export const weekdayNameLong = (isoDay: number) => WEEKDAY_NAMES_LONG[isoDay - 1];
/** "Mo" for an ISO weekday number. */
export const weekdayNameShort = (isoDay: number) => WEEKDAY_NAMES_SHORT[isoDay - 1];
/** "Montag" for a date. */
export const weekdayLong = (date: IsoDate) => weekdayNameLong(isoWeekday(date));
/** "Mo" for a date. */
export const weekdayShort = (date: IsoDate) => weekdayNameShort(isoWeekday(date));
