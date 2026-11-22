/**
 * Pure rhythm suggestions from plain data (no DB): see `estimate.ts`, `due.ts`, `snooze.ts`.
 *
 * Exclusions: item still open on the list, enough in the pantry, active snooze.
 * Pantry assumption: an AVAILABLE pantry entry counts as "enough" when it has a positive
 * amount or no amount at all ("vorhanden"); only an entry with amount 0 or a passed
 * `expiresAt` does not. There is no comparison with typical purchase sizes.
 * An entry only blocks while it is younger than one interval (`acquiredAt` = purchase or
 * creation time): a post nobody ever used up must not hide the suggestion for good.
 */
import { normalizeItemName } from '../../src/lib/shopping/item-key';
import { toBerlinDate } from '../dates';

import { checkDue } from './due';
import { estimateRhythm } from './estimate';
import { rhythmReason } from './reason';
import { isSnoozed } from './snooze';
import type { RhythmConfig, RhythmSuggestion } from './types';

export interface RhythmHistoryRow {
    itemKey: string;
    ingredientId: string | null;
    name: string;
    occurredAt: Date;
}

export interface RhythmPantryEntry {
    ingredientId: string | null;
    name: string;
    quantity: number | null;
    expiresAt: Date | null;
    /** `purchasedAt ?? createdAt`; unknown = always blocks */
    acquiredAt?: Date | null;
}

export interface RhythmInput {
    /** PURCHASED events of the user (any origin), any order. */
    history: readonly RhythmHistoryRow[];
    /** itemKeys currently OPEN on the shopping list. */
    openItemKeys: ReadonlySet<string>;
    /** AVAILABLE pantry entries. */
    pantry: readonly RhythmPantryEntry[];
    snoozes: ReadonlyMap<string, { snoozedUntil: Date }>;
    now: Date;
    shoppingDay?: number | null;
    config?: Partial<RhythmConfig>;
}

export function pantryHasEnough(
    itemKey: string,
    name: string,
    pantry: readonly RhythmPantryEntry[],
    now: Date,
    intervalDays?: number,
): boolean {
    const ingredientId = itemKey.startsWith('i:') ? itemKey.slice(2) : null;
    const normalized = normalizeItemName(name);
    return pantry.some((entry) => {
        const matches = ingredientId
            ? entry.ingredientId === ingredientId
            : !entry.ingredientId && normalizeItemName(entry.name) === normalized;
        if (!matches) return false;
        if (entry.expiresAt && entry.expiresAt.getTime() <= now.getTime()) return false;
        if (
            intervalDays !== undefined &&
            entry.acquiredAt &&
            now.getTime() - entry.acquiredAt.getTime() >= intervalDays * 86_400_000
        )
            return false;
        return entry.quantity === null || entry.quantity > 0;
    });
}

/** Groups history rows by itemKey, newest row first per group (for the display name). */
export function groupByItem(history: readonly RhythmHistoryRow[]): Map<string, RhythmHistoryRow[]> {
    const groups = new Map<string, RhythmHistoryRow[]>();
    for (const row of history) {
        const list = groups.get(row.itemKey);
        if (list) list.push(row);
        else groups.set(row.itemKey, [row]);
    }
    for (const list of groups.values()) {
        list.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    }
    return groups;
}

/** Most overdue first (share of the interval passed, descending), then by name. */
export function suggestRhythmItems(input: RhythmInput): RhythmSuggestion[] {
    const today = toBerlinDate(input.now);
    const found: { suggestion: RhythmSuggestion; progress: number }[] = [];

    for (const [itemKey, rows] of groupByItem(input.history)) {
        const estimate = estimateRhythm(rows, input.config);
        if (estimate.kind !== 'regular') continue;
        if (input.openItemKeys.has(itemKey)) continue;
        if (isSnoozed(input.snoozes.get(itemKey), input.now)) continue;

        const due = checkDue(
            {
                lastPurchaseDate: estimate.lastPurchaseDate,
                intervalDays: estimate.intervalDays,
                today,
                shoppingDay: input.shoppingDay,
            },
            input.config,
        );
        if (!due.due) continue;

        const latest = rows[0];
        if (pantryHasEnough(itemKey, latest.name, input.pantry, input.now, estimate.intervalDays))
            continue;

        found.push({
            progress: due.daysSince / estimate.intervalDays,
            suggestion: {
                itemKey,
                ...(latest.ingredientId ? { ingredientId: latest.ingredientId } : {}),
                name: latest.name,
                reason: rhythmReason(estimate.intervalDays, due.daysSince),
                intervalDays: estimate.intervalDays,
                lastPurchasedAt: latest.occurredAt,
            },
        });
    }

    return found
        .sort(
            (a, b) =>
                b.progress - a.progress || a.suggestion.name.localeCompare(b.suggestion.name, 'de'),
        )
        .map((entry) => entry.suggestion);
}
