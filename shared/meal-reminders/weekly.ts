import { addDays, isoWeekday, todayIn, zonedTimeToUtc } from '../dates';

import { weeklyFingerprint } from './fingerprint';
import { applyQuietHours } from './quiet';
import type { DesiredReminder, QuietHours } from './types';

/** Default time of the weekly reminder: the day before the week starts, 17:00 local. */
export const WEEKLY_REMINDER_TIME = '17:00';
/** A planner is "active" when they planned something in the last 4 weeks. */
export const ACTIVE_PLANNER_DAYS = 28;

/** First day after "today" (local) that is a week start. */
export function nextWeekStart(now: Date, weekStartDay: number, timeZone: string): string {
    const today = todayIn(timeZone, now);
    for (let offset = 1; offset <= 7; offset++) {
        const date = addDays(today, offset);
        if (isoWeekday(date) === weekStartDay) return date;
    }
    return addDays(today, 7);
}

export interface WeeklyPlanOptions {
    timeZone: string;
    weekStartDay: number;
    quiet: QuietHours | null;
    now: Date;
    graceMinutes?: number;
    horizonHours?: number;
}

/** When and for which week the weekly reminder is due; ignores whether it is still needed. */
export function weeklyReminderSlot(
    options: WeeklyPlanOptions,
): { weekStart: string; sendAt: Date } | null {
    const weekStart = nextWeekStart(options.now, options.weekStartDay, options.timeZone);
    const planned = zonedTimeToUtc(addDays(weekStart, -1), WEEKLY_REMINDER_TIME, options.timeZone);
    // Latest useful moment: noon of the first day of the week
    const latest = zonedTimeToUtc(weekStart, '12:00', options.timeZone);
    const sendAt = applyQuietHours(planned, latest, options.quiet, options.timeZone);
    if (!sendAt) return null;

    const grace = (options.graceMinutes ?? 15) * 60_000;
    const horizon = (options.horizonHours ?? 36) * 3_600_000;
    const delta = sendAt.getTime() - options.now.getTime();
    if (delta < -grace || delta > horizon) return null;
    return { weekStart, sendAt };
}

/** Needed only for an active planner whose coming week is still empty. */
export function weeklyReminderNeeded(counts: {
    recentEntries: number;
    nextWeekEntries: number;
}): boolean {
    return counts.recentEntries > 0 && counts.nextWeekEntries === 0;
}

export function weeklyReminder(
    slot: { weekStart: string; sendAt: Date },
    timeZone: string,
): DesiredReminder {
    const [, month, day] = slot.weekStart.split('-');
    return {
        kind: 'WEEKLY_PLAN',
        date: slot.weekStart,
        slotKey: '',
        sendAt: slot.sendAt,
        fingerprint: weeklyFingerprint(slot.weekStart, timeZone),
        title: 'Plane deine Woche',
        body: `Deine Woche ab dem ${day}.${month}. ist noch leer. Jetzt Gerichte einplanen?`,
        href: '/plan',
    };
}
