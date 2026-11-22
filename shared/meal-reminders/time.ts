/**
 * Time zone helpers for reminders. Slot times are wall-clock times ("HH:mm") on a calendar day in
 * the user's time zone; everything else is a real instant. Conversions go through `Intl`, so
 * daylight saving changes (Europe/Berlin: last Sunday of March and October) need no special case.
 */

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

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

export interface LocalParts {
    /** `YYYY-MM-DD` */
    date: string;
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

export function parseTime(time: string): number | null {
    const match = HH_MM.exec(time);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function addIsoDays(date: string, days: number): string {
    const match = ISO_DATE.exec(date);
    if (!match) throw new RangeError(`Invalid date: ${date}`);
    const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return new Date(ms + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The instant at which the wall clock of `timeZone` shows `date` `time`.
 * - Time that occurs twice (clocks go back): the first occurrence.
 * - Time that does not exist (clocks go forward): the same offset as before the change, i.e.
 *   02:30 becomes 03:30 and the reminder is never earlier than intended.
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
    const match = ISO_DATE.exec(date);
    const minutes = parseTime(time);
    if (!match || minutes === null) throw new RangeError(`Invalid date/time: ${date} ${time}`);
    const wall =
        Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + minutes * MINUTE_MS;

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

export function isValidTimeZone(timeZone: string): boolean {
    try {
        formatterFor(timeZone);
        return true;
    } catch {
        return false;
    }
}
