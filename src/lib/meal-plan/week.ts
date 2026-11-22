// Week helpers for the meal plan (KUC-98). Entries hang on calendar dates
// ("YYYY-MM-DD"), never on a calendar week; a week is 7 days from the user's
// week start. General date and time zone helpers live in `@shared/dates`.
import { addDays, assertWeekday, isoWeekday, requireIsoDate } from '@shared/dates';

/** Value for a Prisma `@db.Date` column. */
export function toDbDate(isoDate: string): Date {
    return requireIsoDate(isoDate);
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
