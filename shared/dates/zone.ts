/**
 * Instants and time zones (KUC-137). Wall-clock times are "HH:mm" on a calendar day in a time
 * zone; conversions go through `Intl`, so daylight saving changes need no special case.
 */
import { DAY_MS, requireIsoDate, type IsoDate } from './iso';

export const BERLIN_TZ = 'Europe/Berlin';

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTE_MS = 60_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
    let formatter = formatters.get(timeZone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
        formatters.set(timeZone, formatter);
    }
    return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
    try {
        formatterFor(timeZone);
        return true;
    } catch {
        return false;
    }
}

export interface LocalParts {
    /** `YYYY-MM-DD` */
    date: IsoDate;
    /** Minutes since local midnight (0..1439) */
    minutes: number;
    /** `HH:mm` */
    time: string;
}

/** Wall-clock date and time of an instant in `timeZone`. */
export function toLocalParts(instant: Date, timeZone: string): LocalParts {
    const parts = formatterFor(timeZone).formatToParts(instant);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
    const hour = Number(get('hour')) % 24;
    const minute = Number(get('minute'));
    return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        minutes: hour * 60 + minute,
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    };
}

/** Today's date (or the date of `now`) in `timeZone`. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
    return toLocalParts(now, timeZone).date;
}

/** The Berlin calendar day of an instant (e.g. "now"). */
export const toBerlinDate = (instant: Date): IsoDate => todayIn(BERLIN_TZ, instant);

/** Offset of `timeZone` from UTC at `instant` in ms (local wall clock minus UTC). */
function offsetAt(instant: Date, timeZone: string): number {
    const parts = formatterFor(timeZone).formatToParts(instant);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const asUtc = Date.UTC(
        get('year'),
        get('month') - 1,
        get('day'),
        get('hour') % 24,
        get('minute'),
        get('second'),
    );
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Minutes since midnight of "HH:mm"; null when malformed. */
export function parseTime(time: string): number | null {
    const match = HH_MM.exec(time);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/**
 * The instant at which the wall clock of `timeZone` shows `date` `time`.
 * - Time that occurs twice (clocks go back): the first occurrence.
 * - Time that does not exist (clocks go forward): the same offset as before the change, i.e.
 *   02:30 becomes 03:30 and a reminder is never earlier than intended.
 */
export function zonedTimeToUtc(date: IsoDate, time: string, timeZone: string): Date {
    const minutes = parseTime(time);
    if (minutes === null) throw new RangeError(`Invalid time: ${time}`);
    const wall = requireIsoDate(date).getTime() + minutes * MINUTE_MS;

    // Offsets a day before and after bracket any single transition around the wall time.
    const before = offsetAt(new Date(wall - DAY_MS), timeZone);
    const after = offsetAt(new Date(wall + DAY_MS), timeZone);
    const candidates = [...new Set([before, after])]
        .map((offset) => new Date(wall - offset))
        .filter((instant) => {
            const local = toLocalParts(instant, timeZone);
            return local.date === date && local.minutes === minutes;
        })
        .sort((a, b) => a.getTime() - b.getTime());
    return candidates[0] ?? new Date(wall - before);
}

export function addMinutes(instant: Date, minutes: number): Date {
    return new Date(instant.getTime() + minutes * MINUTE_MS);
}
