import { createHash } from 'node:crypto';

import type { CookCell } from './types';

/**
 * Hash of everything that decides whether a cook reminder is still valid: time zone, day, slot,
 * meal time, lead time and the dishes (entry, recipe, duration). A changed entry, time or recipe
 * gives a different value, so a job scheduled earlier recognises that it is stale.
 */
export function cookFingerprint(cell: CookCell, leadMinutes: number, timeZone: string): string {
    const dishes = [...cell.dishes]
        .sort((a, b) => a.entryId.localeCompare(b.entryId))
        .map((dish) => [dish.entryId, dish.recipeId, dish.durationMin]);
    return createHash('sha256')
        .update(
            JSON.stringify([
                'cook',
                1,
                timeZone,
                cell.date,
                cell.slotKey,
                cell.time,
                leadMinutes,
                dishes,
            ]),
        )
        .digest('hex');
}

export function weeklyFingerprint(weekStart: string, timeZone: string): string {
    return createHash('sha256')
        .update(JSON.stringify(['weekly', 1, timeZone, weekStart]))
        .digest('hex');
}
