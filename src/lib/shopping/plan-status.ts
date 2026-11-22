// What the plan still needs on the shopping list (KUC-105): per planned dish
// "auf der Liste ✓" or "+ n fehlen". An ingredient counts as covered when the
// list has an entry with a source from that very plan entry (bought entries
// keep their sources, so they stay covered). Optional ingredients are not
// counted as missing. Pure; the server loads entries, lines and sources.
import { weekdayShort } from './list-view';

export interface PlanEntryInput {
    id: string;
    /** yyyy-mm-dd */
    date: string;
    recipeId: string;
    title: string;
    imageKey: string | null;
    servings: number;
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    /** false for unpublished / archived recipes */
    recipeAvailable: boolean;
}

export interface PlanLineInput {
    ingredientId: string;
    name: string;
    isOptional: boolean;
}

export type PlanEntryState = 'ok' | 'missing' | 'unavailable' | 'empty';

export interface PlanEntryStatus {
    entryId: string;
    date: string;
    weekday: string;
    day: number;
    isToday: boolean;
    recipeId: string;
    title: string;
    imageKey: string | null;
    servings: number;
    state: PlanEntryState;
    missing: string[];
}

export interface PlanStatus {
    entries: PlanEntryStatus[];
    /** Entries that would get something from "Fehlende hinzufügen" */
    missingEntryIds: string[];
    missingCount: number;
}

/**
 * @param covered ingredient ids that already have a source from the entry,
 *                by plan entry id
 */
export function computePlanStatus(
    entries: readonly PlanEntryInput[],
    linesByRecipe: ReadonlyMap<string, readonly PlanLineInput[]>,
    covered: ReadonlyMap<string, ReadonlySet<string>>,
    today: string,
): PlanStatus {
    const result: PlanEntryStatus[] = [];
    for (const entry of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
        // Cooked or cancelled dishes need no shopping any more
        if (entry.status === 'COMPLETED' || entry.status === 'CANCELLED') continue;

        const lines = (linesByRecipe.get(entry.recipeId) ?? []).filter((line) => !line.isOptional);
        const have = covered.get(entry.id) ?? new Set<string>();
        const missing = entry.recipeAvailable
            ? [
                  ...new Set(
                      lines.filter((line) => !have.has(line.ingredientId)).map((line) => line.name),
                  ),
              ]
            : [];
        const state: PlanEntryState = !entry.recipeAvailable
            ? 'unavailable'
            : lines.length === 0
              ? 'empty'
              : missing.length > 0
                ? 'missing'
                : 'ok';
        result.push({
            entryId: entry.id,
            date: entry.date,
            weekday: weekdayShort(entry.date),
            day: Number(entry.date.slice(8, 10)),
            isToday: entry.date === today,
            recipeId: entry.recipeId,
            title: entry.title,
            imageKey: entry.imageKey,
            servings: entry.servings,
            state,
            missing,
        });
    }
    const needing = result.filter((entry) => entry.state === 'missing');
    return {
        entries: result,
        missingEntryIds: needing.map((entry) => entry.entryId),
        missingCount: needing.reduce((sum, entry) => sum + entry.missing.length, 0),
    };
}

/** "✓ alles auf der Liste", "+ 2 Zutaten fehlen", "+ Crème fraîche fehlt" … */
export function planStateLabel(status: Pick<PlanEntryStatus, 'state' | 'missing'>): string {
    switch (status.state) {
        case 'ok':
            return '✓ alles auf der Liste';
        case 'unavailable':
            return 'Rezept nicht mehr verfügbar';
        case 'empty':
            return 'Keine Zutaten im Rezept';
        case 'missing':
            return status.missing.length === 1
                ? `+ ${status.missing[0]} fehlt`
                : `+ ${status.missing.length} Zutaten fehlen`;
    }
}

/** Short form for the week strip: "✓ auf der Liste", "+ 2 fehlen". */
export function planStateShortLabel(status: Pick<PlanEntryStatus, 'state' | 'missing'>): string {
    switch (status.state) {
        case 'ok':
            return '✓ auf der Liste';
        case 'missing':
            return status.missing.length === 1 ? '+ 1 fehlt' : `+ ${status.missing.length} fehlen`;
        case 'unavailable':
            return 'nicht verfügbar';
        case 'empty':
            return 'keine Zutaten';
    }
}

/** Label of the main button: "Fehlende 3 Zutaten hinzufügen" (null when nothing is missing). */
export function addMissingLabel(status: Pick<PlanStatus, 'missingCount'>): string | null {
    if (status.missingCount === 0) return null;
    return status.missingCount === 1
        ? 'Fehlende Zutat hinzufügen'
        : `Fehlende ${status.missingCount} Zutaten hinzufügen`;
}
