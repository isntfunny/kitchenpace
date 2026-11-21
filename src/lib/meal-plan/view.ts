// Pure helpers for the week view (KUC-99): week URL parameter, labels, day
// calories and the built-in status markers of a planned dish.
import { addDays, isoWeekday, isoWeekNumber, parseIsoDate, weekStartFor } from './week';

const WEEK_PARAM = /^(\d{4})-W(\d{2})$/;

/**
 * Week of a URL parameter: "2026-W48" (ISO week) or any date "2026-11-26".
 * Returns the first day of that week for the user's week start, or null when the
 * parameter is malformed (the page answers 404). Missing parameter = today's week.
 */
export function resolveWeekStart(
    param: string | null | undefined,
    weekStartDay: number,
    today: string,
): string | null {
    if (!param) return weekStartFor(today, weekStartDay);
    const week = WEEK_PARAM.exec(param);
    if (week) {
        const year = Number(week[1]);
        const number = Number(week[2]);
        // Thursday of ISO week 1 lies in the first week with 4 days of the year
        const jan4 = `${year}-01-04`;
        const thursday = addDays(jan4, (number - 1) * 7 + 4 - isoWeekday(jan4));
        if (number < 1 || isoWeekNumber(thursday) !== number) return null;
        return weekStartFor(thursday, weekStartDay);
    }
    return parseIsoDate(param) ? weekStartFor(param, weekStartDay) : null;
}

/**
 * ISO week a user week is named after: the week holding most of its days
 * (day 4), so "KW 48" also fits weeks starting on Sunday or Saturday.
 */
export function weekLabelDate(startDate: string): string {
    return addDays(startDate, 3);
}

/** URL parameter for a week, e.g. "2026-W48"; round-trips with resolveWeekStart. */
export function weekParam(startDate: string): string {
    const mid = weekLabelDate(startDate);
    const thursday = addDays(mid, 4 - isoWeekday(mid));
    return `${thursday.slice(0, 4)}-W${String(isoWeekNumber(mid)).padStart(2, '0')}`;
}

export function weekNumber(startDate: string): number {
    return isoWeekNumber(weekLabelDate(startDate));
}

const MONTHS = [
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
];
const MONTHS_SHORT = [
    'Jan',
    'Feb',
    'März',
    'Apr',
    'Mai',
    'Juni',
    'Juli',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dez',
];
const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const parts = (date: string) => ({
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)) - 1,
    day: Number(date.slice(8, 10)),
});

export const weekdayShort = (date: string) => WEEKDAYS_SHORT[isoWeekday(date) - 1];
export const weekdayLong = (date: string) => WEEKDAYS[isoWeekday(date) - 1];
export const weekdayNameShort = (isoDay: number) => WEEKDAYS_SHORT[isoDay - 1];
export const weekdayNameLong = (isoDay: number) => WEEKDAYS[isoDay - 1];

/** "24. Nov" */
export function shortDate(date: string): string {
    const { month, day } = parts(date);
    return `${day}. ${MONTHS_SHORT[month]}`;
}

/** "23.–29. November 2026", "30. November – 6. Dezember 2026", "28. Dez 2026 – 3. Jan 2027" */
export function weekRangeLabel(startDate: string): string {
    const a = parts(startDate);
    const b = parts(addDays(startDate, 6));
    if (a.year !== b.year)
        return `${a.day}. ${MONTHS_SHORT[a.month]} ${a.year} – ${b.day}. ${MONTHS_SHORT[b.month]} ${b.year}`;
    if (a.month !== b.month)
        return `${a.day}. ${MONTHS[a.month]} – ${b.day}. ${MONTHS[b.month]} ${b.year}`;
    return `${a.day}.–${b.day}. ${MONTHS[b.month]} ${b.year}`;
}

export interface CalorieInput {
    servings: number;
    recipe: { caloriesPerServing: number | null; nutritionCompleteness: number | null };
    recipeAvailable?: boolean;
}

/**
 * Calories per person for one day: one serving of every dish. "incomplete" when
 * a dish has no calories or incomplete nutrition data (shown as "unvollst.").
 */
export function dayCalories(entries: CalorieInput[]): { kcal: number | null; incomplete: boolean } {
    let kcal = 0;
    let known = 0;
    let incomplete = false;
    for (const entry of entries) {
        const calories = entry.recipe.caloriesPerServing;
        if (calories === null || calories === undefined) {
            incomplete = true;
            continue;
        }
        if ((entry.recipe.nutritionCompleteness ?? 0) < 1) incomplete = true;
        kcal += calories;
        known++;
    }
    return { kcal: known > 0 ? Math.round(kcal) : null, incomplete };
}

/** German number with thin grouping as in the mockups: "1 840" */
export function formatKcal(kcal: number): string {
    return new Intl.NumberFormat('de-DE').format(kcal).replace(/\./g, ' ');
}

export type MarkerTone = 'ok' | 'warn' | 'rest' | 'start' | 'off';

/** Status marker on a dish. More markers (fresh, leftovers, start time) come via props. */
export interface DishMarker {
    tone: MarkerTone;
    label: string;
    icon?: 'check' | 'clock' | 'cart' | 'refresh' | 'bell';
}

export function builtInMarkers(entry: {
    status: string;
    recipeAvailable: boolean;
    leftoverOfDate?: string | null;
}): DishMarker[] {
    const markers: DishMarker[] = [];
    if (!entry.recipeAvailable) markers.push({ tone: 'off', label: 'nicht mehr verfügbar' });
    if (entry.status === 'COMPLETED') markers.push({ tone: 'ok', label: 'Gekocht', icon: 'check' });
    if (entry.leftoverOfDate)
        markers.push({
            tone: 'rest',
            label: `Rest von ${weekdayShort(entry.leftoverOfDate)}`,
            icon: 'refresh',
        });
    return markers;
}

/** Key of one grid cell; also the key for suggestion slots passed in by later tickets. */
export const cellKey = (date: string, slot: string) => `${date}|${slot}`;
