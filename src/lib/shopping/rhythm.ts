// Purchase rhythm suggestions for the shopping list (KUC-124). Computed when the list is
// loaded, no job. Every function checks ownership via userId; pass `prisma` from
// '@shared/prisma' as `db`. The statistics live in `shared/shopping-rhythm` (pure).
import { type Db, notFound } from '@app/lib/meal-plan/db';
import { userIdSchema } from '@app/lib/meal-plan/schemas';
import {
    effectiveDismissCount,
    estimateRhythm,
    nextSnooze,
    suggestRhythmItems,
    type RhythmSuggestion,
} from '@shared/shopping-rhythm';

import { itemKeySchema } from './schemas';

export type { RhythmSuggestion } from '@shared/shopping-rhythm';

/** Older purchases are ignored: a rhythm that needs more than a year is no rhythm. */
const HISTORY_WINDOW_DAYS = 365;
const DAY_MS = 86_400_000;

const purchaseSelect = {
    itemKey: true,
    ingredientId: true,
    name: true,
    occurredAt: true,
} as const;

function purchaseWhere(owner: string, now: Date) {
    return {
        userId: owner,
        event: 'PURCHASED' as const,
        occurredAt: { gte: new Date(now.getTime() - HISTORY_WINDOW_DAYS * DAY_MS), lte: now },
    };
}

/**
 * Items that are due again, most overdue first. Purchases from Bring! (origin BRING) count
 * like any other. Never writes to the list: suggestions only.
 */
export async function getRhythmSuggestions(
    db: Db,
    userId: string,
    now: Date = new Date(),
): Promise<RhythmSuggestion[]> {
    const owner = userIdSchema.parse(userId);

    const history = await db.shoppingHistory.findMany({
        where: purchaseWhere(owner, now),
        select: purchaseSelect,
        orderBy: { occurredAt: 'asc' },
    });
    if (history.length === 0) return [];

    const [openItems, pantry, snoozes, profile] = await Promise.all([
        db.shoppingItem.findMany({
            where: { shoppingList: { userId: owner }, status: 'OPEN' },
            select: { itemKey: true },
        }),
        db.pantryItem.findMany({
            where: { userId: owner, status: 'AVAILABLE' },
            select: { ingredientId: true, name: true, quantity: true, expiresAt: true },
        }),
        db.shoppingSuggestionSnooze.findMany({
            where: { userId: owner },
            select: { itemKey: true, snoozedUntil: true },
        }),
        db.profile.findFirst({ where: { userId: owner }, select: { shoppingDay: true } }),
    ]);

    return suggestRhythmItems({
        history,
        openItemKeys: new Set(openItems.map((item) => item.itemKey)),
        pantry,
        snoozes: new Map(snoozes.map((snooze) => [snooze.itemKey, snooze])),
        now,
        shoppingDay: profile?.shoppingDay ?? null,
    });
}

/**
 * "Nicht jetzt": hides the suggestion for half the interval; from the 3rd dismissal on for
 * twice the interval (see `shared/shopping-rhythm/snooze.ts`). Only items with a rhythm can
 * be snoozed, anything else is reported as not found.
 */
export async function snoozeRhythmSuggestion(
    db: Db,
    userId: string,
    itemKey: string,
    now: Date = new Date(),
): Promise<{ itemKey: string; snoozedUntil: Date; dismissCount: number }> {
    const owner = userIdSchema.parse(userId);
    const key = itemKeySchema.parse(itemKey);

    const [history, existing] = await Promise.all([
        db.shoppingHistory.findMany({
            where: { ...purchaseWhere(owner, now), itemKey: key },
            select: purchaseSelect,
            orderBy: { occurredAt: 'asc' },
        }),
        db.shoppingSuggestionSnooze.findUnique({
            where: { userId_itemKey: { userId: owner, itemKey: key } },
        }),
    ]);

    const estimate = estimateRhythm(history);
    if (estimate.kind !== 'regular') throw notFound('Vorschlag');

    const lastPurchasedAt = new Date(Math.max(...history.map((row) => row.occurredAt.getTime())));
    const { snoozedUntil, dismissCount } = nextSnooze({
        now,
        intervalDays: estimate.intervalDays,
        previousDismissCount: effectiveDismissCount(existing ?? undefined, lastPurchasedAt),
    });

    await db.shoppingSuggestionSnooze.upsert({
        where: { userId_itemKey: { userId: owner, itemKey: key } },
        create: { userId: owner, itemKey: key, snoozedUntil, dismissCount },
        update: { snoozedUntil, dismissCount },
    });
    return { itemKey: key, snoozedUntil, dismissCount };
}
