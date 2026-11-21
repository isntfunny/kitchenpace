// Source of the "Vorschläge" row on the shopping list (KUC-105). The rhythm
// suggestions of KUC-124 (src/lib/shopping/rhythm.ts: getRhythmSuggestions,
// snoozeRhythmSuggestion) are plugged in here after both branches are merged;
// until then the source is empty. Nothing else in the UI knows where the
// suggestions come from.
import type { Db } from '@app/lib/meal-plan/db';

import { snoozeShoppingSuggestion } from './repository';

/** Same shape as the DTO of getRhythmSuggestions (KUC-124). */
export interface RhythmSuggestionView {
    itemKey: string;
    ingredientId?: string | null;
    name: string;
    /** Why it is suggested, e.g. "alle 2 Wochen" or "vor 9 Tagen" */
    reason: string;
    intervalDays: number;
    lastPurchasedAt: string | Date | null;
}

const SNOOZE_DAYS = 7;

export async function loadSuggestions(
    _db: Db,
    _userId: string,
    _now: Date,
): Promise<RhythmSuggestionView[]> {
    return [];
}

/** "Nicht jetzt": hides the suggestion for a week. */
export async function snoozeSuggestion(db: Db, userId: string, itemKey: string, now: Date) {
    await snoozeShoppingSuggestion(db, userId, {
        itemKey,
        until: new Date(now.getTime() + SNOOZE_DAYS * 86_400_000),
    });
}
