import { parseTime, toLocalParts, zonedTimeToUtc } from './time';
import type { QuietHours } from './types';

/** Parses profile fields; both must be valid and different, else there are no quiet hours. */
export function parseQuietHours(
    start: string | null | undefined,
    end: string | null | undefined,
): QuietHours | null {
    if (!start || !end) return null;
    const from = parseTime(start);
    const to = parseTime(end);
    if (from === null || to === null || from === to) return null;
    return { start, end };
}

/** `minutes` = minutes since local midnight. The end is exclusive; windows may wrap midnight. */
export function isQuietMinute(minutes: number, quiet: QuietHours | null): boolean {
    if (!quiet) return false;
    const from = parseTime(quiet.start)!;
    const to = parseTime(quiet.end)!;
    return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

/**
 * Moves a send time out of the quiet hours to the end of the window. Returns null when that is
 * not before `latest` (the meal itself): a reminder that would come too late is skipped.
 */
export function applyQuietHours(
    sendAt: Date,
    latest: Date,
    quiet: QuietHours | null,
    timeZone: string,
): Date | null {
    if (!quiet) return sendAt;
    const local = toLocalParts(sendAt, timeZone);
    if (!isQuietMinute(local.minutes, quiet)) return sendAt;

    const from = parseTime(quiet.start)!;
    const to = parseTime(quiet.end)!;
    // Wrapping window and we are in the evening part: the window ends tomorrow
    const endsTomorrow = from > to && local.minutes >= from;
    const endDate = endsTomorrow ? addDay(local.date) : local.date;
    const end = zonedTimeToUtc(endDate, quiet.end, timeZone);
    return end.getTime() < latest.getTime() ? end : null;
}

function addDay(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
