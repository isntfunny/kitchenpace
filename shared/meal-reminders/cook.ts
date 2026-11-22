import { START_BUFFER_MIN } from './duration';
import { cookFingerprint } from './fingerprint';
import { applyQuietHours } from './quiet';
import { addMinutes, parseTime, zonedTimeToUtc } from './time';
import type { CookCell, DesiredReminder, QuietHours, ReminderEntry } from './types';

/** Reminders whose send time passed at most this long ago are still sent (cron interval). */
export const DEFAULT_GRACE_MINUTES = 15;
export const DEFAULT_HORIZON_HOURS = 36;

/**
 * Groups the cookable entries into cells (day + slot). Cooked, cancelled, started and leftover
 * entries are left out; so are entries without any time. The meal time of a cell is the earliest
 * time of its dishes (own time, else the slot's default).
 */
export function groupCookCells(
    entries: readonly ReminderEntry[],
    slotTimes: Readonly<Record<string, string>>,
): CookCell[] {
    const cells = new Map<string, CookCell>();
    for (const entry of entries) {
        if (entry.status !== 'PLANNED' || entry.cookedAt || entry.leftoverOfId) continue;
        const time = entry.time ?? slotTimes[entry.slotKey] ?? null;
        if (!time || parseTime(time) === null) continue;
        const key = `${entry.date}|${entry.slotKey}`;
        const cell = cells.get(key) ?? {
            date: entry.date,
            slotKey: entry.slotKey,
            time,
            dishes: [],
        };
        if (parseTime(time)! < parseTime(cell.time)!) cell.time = time;
        cell.dishes.push({
            entryId: entry.id,
            recipeId: entry.recipeId,
            title: entry.title,
            durationMin: Math.max(0, Math.round(entry.durationMin)),
        });
        cells.set(key, cell);
    }
    return [...cells.values()].sort(
        (a, b) =>
            a.date.localeCompare(b.date) ||
            a.time.localeCompare(b.time) ||
            a.slotKey.localeCompare(b.slotKey),
    );
}

/** "A", "A und B", "A, B und C" */
export function joinDishes(titles: readonly string[]): string {
    if (titles.length <= 1) return titles[0] ?? '';
    return `${titles.slice(0, -1).join(', ')} und ${titles[titles.length - 1]}`;
}

export function cookMessage(cell: CookCell): { title: string; body: string } {
    const dishes = joinDishes(cell.dishes.map((dish) => dish.title));
    const longest = Math.max(0, ...cell.dishes.map((dish) => dish.durationMin));
    const effort = longest > 0 ? ` Das dauert etwa ${longest} Min.` : '';
    return {
        title: 'Zeit anzufangen',
        body: `Um ${cell.time} Uhr gibt es ${dishes}.${effort}`.slice(0, 300),
    };
}

export interface CookPlanOptions {
    timeZone: string;
    quiet: QuietHours | null;
    now: Date;
    horizonHours?: number;
    graceMinutes?: number;
}

/**
 * The reminder for one cell, or null when it is not due in the window: start = meal time minus
 * the longest dish minus the buffer, moved out of quiet hours, and still before the meal.
 */
export function cookReminderFor(cell: CookCell, options: CookPlanOptions): DesiredReminder | null {
    const longest = Math.max(0, ...cell.dishes.map((dish) => dish.durationMin));
    const leadMinutes = longest + START_BUFFER_MIN;
    const mealAt = zonedTimeToUtc(cell.date, cell.time, options.timeZone);
    const startAt = addMinutes(mealAt, -leadMinutes);
    const sendAt = applyQuietHours(startAt, mealAt, options.quiet, options.timeZone);
    if (!sendAt) return null;

    const grace = (options.graceMinutes ?? DEFAULT_GRACE_MINUTES) * 60_000;
    const horizon = (options.horizonHours ?? DEFAULT_HORIZON_HOURS) * 3_600_000;
    const delta = sendAt.getTime() - options.now.getTime();
    if (delta < -grace || delta > horizon) return null;

    const message = cookMessage(cell);
    return {
        kind: 'COOK_START',
        date: cell.date,
        slotKey: cell.slotKey,
        sendAt,
        fingerprint: cookFingerprint(cell, leadMinutes, options.timeZone),
        ...message,
        href: '/plan',
        recipeId: cell.dishes[0]?.recipeId,
    };
}

export function planCookReminders(
    entries: readonly ReminderEntry[],
    slotTimes: Readonly<Record<string, string>>,
    options: CookPlanOptions,
): DesiredReminder[] {
    return groupCookCells(entries, slotTimes)
        .map((cell) => cookReminderFor(cell, options))
        .filter((reminder): reminder is DesiredReminder => reminder !== null);
}
