/**
 * When a regular item is due.
 *
 * Due when
 *  (a) 80 % of the interval have passed since the last purchase, or
 *  (b) a shopping day is set and the item falls due before the next shopping day.
 *      "Next shopping day" is the first such weekday strictly after today: when today is the
 *      shopping day, the trip is happening now, so what runs out before the following trip
 *      has to be bought now. Due date = last purchase + interval, and "before" is strict
 *      (an item due exactly on the next trip is bought on that trip, not earlier).
 * Not suggested any more after `staleFactor` (3) intervals without a purchase: the habit has
 * probably ended.
 */
import { addDays, diffDays, isoWeekday } from '../meal-planning/dates';

import { DEFAULT_RHYTHM_CONFIG, type IsoDate, type RhythmConfig } from './types';

/** First date after `today` that falls on ISO weekday `shoppingDay` (1 = Monday … 7). */
export function nextShoppingDate(today: IsoDate, shoppingDay: number): IsoDate {
    const ahead = ((shoppingDay - isoWeekday(today) + 6) % 7) + 1; // 1..7
    return addDays(today, ahead);
}

export interface DueCheck {
    lastPurchaseDate: IsoDate;
    intervalDays: number;
    today: IsoDate;
    /** ISO weekday 1-7; null/undefined = not set */
    shoppingDay?: number | null;
}

export interface DueResult {
    due: boolean;
    /** Whole days since the last purchase. */
    daysSince: number;
}

export function checkDue(input: DueCheck, config: Partial<RhythmConfig> = {}): DueResult {
    const cfg = { ...DEFAULT_RHYTHM_CONFIG, ...config };
    const daysSince = diffDays(input.today, input.lastPurchaseDate);
    const { intervalDays } = input;

    if (daysSince < 0 || daysSince > intervalDays * cfg.staleFactor) {
        return { due: false, daysSince };
    }
    if (daysSince >= intervalDays * cfg.dueFraction) return { due: true, daysSince };

    const day = input.shoppingDay;
    if (day != null && Number.isInteger(day) && day >= 1 && day <= 7) {
        const dueDate = addDays(input.lastPurchaseDate, Math.round(intervalDays));
        if (dueDate < nextShoppingDate(input.today, day)) return { due: true, daysSince };
    }
    return { due: false, daysSince };
}
