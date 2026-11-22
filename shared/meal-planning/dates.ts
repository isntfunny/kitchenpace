/**
 * Calendar-date helpers on `YYYY-MM-DD` strings. All arithmetic runs in UTC on the date
 * parts only, so DST and the server time zone never matter. Only `toBerlinDate` looks at a
 * real instant and converts it to the Berlin calendar day.
 */
import { detectSeason } from '../../src/lib/fits-now/season';

import type { IsoDate, Season } from './types';

export const BERLIN_TZ = 'Europe/Berlin';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcMs(date: IsoDate): number {
    const match = ISO_DATE.exec(date);
    if (!match) throw new Error(`Invalid date "${date}", expected YYYY-MM-DD`);
    const [, y, m, d] = match.map(Number) as [number, number, number, number];
    const ms = Date.UTC(y, m - 1, d);
    const check = new Date(ms);
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
        throw new Error(`Invalid date "${date}"`);
    }
    return ms;
}

function fromUtcMs(ms: number): IsoDate {
    return new Date(ms).toISOString().slice(0, 10);
}

/** The Berlin calendar day of an instant (e.g. "now"). */
export function toBerlinDate(instant: Date): IsoDate {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: BERLIN_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(instant);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
    return fromUtcMs(toUtcMs(date) + days * 86_400_000);
}

/** Whole days from `b` to `a` (a - b). */
export function diffDays(a: IsoDate, b: IsoDate): number {
    return Math.round((toUtcMs(a) - toUtcMs(b)) / 86_400_000);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: IsoDate): number {
    const day = new Date(toUtcMs(date)).getUTCDay();
    return day === 0 ? 7 : day;
}

export const isWeekend = (date: IsoDate) => isoWeekday(date) >= 6;

const WEEKDAYS_DE = [
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
    'Sonntag',
];

export const weekdayNameDe = (date: IsoDate) => WEEKDAYS_DE[isoWeekday(date) - 1];

export function seasonOf(date: IsoDate): Season {
    return detectSeason(new Date(toUtcMs(date)).getUTCMonth());
}

export const SEASON_NAMES_DE: Record<Season, string> = {
    fruehling: 'Frühling',
    sommer: 'Sommer',
    herbst: 'Herbst',
    winter: 'Winter',
};
