// Source of the "Vorschläge" row on the shopping list (KUC-105): the purchase
// rhythm suggestions of KUC-124. Nothing else in the UI knows where the
// suggestions come from.
import type { Db } from '@app/lib/meal-plan/db';

import { getRhythmSuggestions, snoozeRhythmSuggestion } from './rhythm';

/** Same shape as the DTO of getRhythmSuggestions (KUC-124). */
export interface RhythmSuggestionView {
    itemKey: string;
    ingredientId?: string | null;
    name: string;
    /** Why it is suggested, e.g. "alle 2 Wochen" or "alle ~12 Tage · zuletzt vor 11 T." */
    reason: string;
    intervalDays: number;
    lastPurchasedAt: string | Date | null;
}

export async function loadSuggestions(
    db: Db,
    userId: string,
    now: Date,
): Promise<RhythmSuggestionView[]> {
    return getRhythmSuggestions(db, userId, now);
}

/** "Nicht jetzt": half an interval, longer after repeated dismissals (KUC-124). */
export async function snoozeSuggestion(db: Db, userId: string, itemKey: string, now: Date) {
    await snoozeRhythmSuggestion(db, userId, itemKey, now);
}
