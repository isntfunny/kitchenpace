/**
 * "Nicht jetzt": hides a suggestion and brings it back later.
 *
 * - 1st and 2nd dismissal: snoozed for half the interval.
 * - From the 3rd dismissal on (`DAMPEN_AFTER`): snoozed for twice the interval, the item is
 *   dampened.
 * - Dismissals that happened before the latest purchase are forgotten (the user did buy it
 *   again, so the item is relevant again); callers pass the stale count as 0.
 */
export const DAMPEN_AFTER = 3;
const DAY_MS = 86_400_000;

export function nextSnooze(input: {
    now: Date;
    intervalDays: number;
    /** Dismissals so far (already 0 when older than the last purchase). */
    previousDismissCount: number;
}): { snoozedUntil: Date; dismissCount: number } {
    const dismissCount = Math.max(0, input.previousDismissCount) + 1;
    const factor = dismissCount >= DAMPEN_AFTER ? 2 : 0.5;
    return {
        snoozedUntil: new Date(input.now.getTime() + input.intervalDays * factor * DAY_MS),
        dismissCount,
    };
}

export function isSnoozed(snooze: { snoozedUntil: Date } | undefined, now: Date): boolean {
    return !!snooze && snooze.snoozedUntil.getTime() > now.getTime();
}

/** Dismissals count only if they happened after the last purchase. */
export function effectiveDismissCount(
    snooze: { dismissCount: number; updatedAt: Date } | undefined,
    lastPurchasedAt: Date,
): number {
    if (!snooze || snooze.updatedAt.getTime() < lastPurchasedAt.getTime()) return 0;
    return snooze.dismissCount;
}
