// Pure date helpers for the meal plan (KUC-98). Entries hang on calendar dates
// ("YYYY-MM-DD"), never on a calendar week; a week is 7 days from the user's
// week start. Dates are handled as UTC midnight so no local offset can shift them.

/** ISO weekday: 1 = Monday … 7 = Sunday */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 86_400_000;

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

function requireDate(value: string): Date {
    const date = parseIsoDate(value);
    if (!date) throw new RangeError(`Invalid date: ${value}`);
    return date;
}

/** Formats the UTC calendar day of a Date (e.g. a Prisma @db.Date value). */
export function formatIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

/** Value for a Prisma `@db.Date` column. */
export function toDbDate(isoDate: string): Date {
    return requireDate(isoDate);
}

export function addDays(isoDate: string, days: number): string {
    return formatIsoDate(new Date(requireDate(isoDate).getTime() + days * DAY_MS));
}

export function diffDays(from: string, to: string): number {
    return Math.round((requireDate(to).getTime() - requireDate(from).getTime()) / DAY_MS);
}

export function isoWeekday(isoDate: string): IsoWeekday {
    const day = requireDate(isoDate).getUTCDay();
    return (day === 0 ? 7 : day) as IsoWeekday;
}

/** First day of the week containing `isoDate` for the given week start. */
export function weekStartFor(isoDate: string, weekStartDay: number): string {
    assertWeekday(weekStartDay);
    const offset = (isoWeekday(isoDate) - weekStartDay + 7) % 7;
    return addDays(isoDate, -offset);
}

/** The 7 dates of the week beginning at `startDate` (any date may start a week). */
export function weekDays(startDate: string): string[] {
    return Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
}

/** Inclusive date range of the week beginning at `startDate`. */
export function weekRange(startDate: string): { from: string; to: string } {
    return { from: startDate, to: addDays(startDate, 6) };
}

/** ISO 8601 week number ("KW") of a date. */
export function isoWeekNumber(isoDate: string): number {
    const thursday = addDays(isoDate, 4 - isoWeekday(isoDate));
    const yearStart = `${thursday.slice(0, 4)}-01-01`;
    return Math.floor(diffDays(yearStart, thursday) / 7) + 1;
}

export function assertWeekday(value: number): asserts value is IsoWeekday {
    if (!Number.isInteger(value) || value < 1 || value > 7)
        throw new RangeError(`Invalid ISO weekday: ${value}`);
}

export function isValidTimezone(timezone: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone });
        return true;
    } catch {
        return false;
    }
}

function zonedParts(instant: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(instant);
    const get = (type: string) => Number(parts.find((part) => part.type === type)!.value);
    return {
        year: get('year'),
        month: get('month'),
        day: get('day'),
        hour: get('hour'),
        minute: get('minute'),
        second: get('second'),
    };
}

/** Today's date in the user's timezone. */
export function todayIn(timezone: string, now: Date = new Date()): string {
    const { year, month, day } = zonedParts(now, timezone);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function offsetMs(instant: Date, timezone: string): number {
    const p = zonedParts(instant, timezone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The instant at which the local wall time `date time` occurs in `timezone`.
 * DST-safe: a time skipped by the spring change resolves to the instant after the
 * gap (02:30 → 03:30 CEST); an ambiguous autumn time resolves to its first occurrence.
 */
export function zonedTimeToUtc(isoDate: string, time: string, timezone: string): Date {
    const date = requireDate(isoDate);
    const match = HH_MM.exec(time);
    if (!match) throw new RangeError(`Invalid time: ${time}`);
    const wall = date.getTime() + (Number(match[1]) * 60 + Number(match[2])) * 60_000;
    // Try both offsets around the wall time; prefer the earlier valid instant
    const candidates = [
        wall - offsetMs(new Date(wall - DAY_MS / 2), timezone),
        wall - offsetMs(new Date(wall + DAY_MS / 2), timezone),
    ].sort((a, b) => a - b);
    for (const candidate of candidates) {
        if (candidate + offsetMs(new Date(candidate), timezone) === wall)
            return new Date(candidate);
    }
    // Wall time falls into a DST gap: shift by the offset before the gap
    return new Date(candidates[1]);
}
