// Pure planning of "Letzte Woche übernehmen", "Tag kopieren" and templates (KUC-101):
// which entries are created where, which target cells already hold dishes, and how
// "Rest von" links are carried over. The data access in edit.ts only executes the plan.
import { cellKey } from './view';
import { addDays } from './week';

/** What to do with target cells that already hold dishes */
export type ConflictMode = 'add' | 'skip' | 'replace';

export interface CopySource {
    /** Source entry id; template entries use their own id */
    id: string;
    recipeId: string;
    /** Days after the first source day */
    dayOffset: number;
    slot: string;
    position: number;
    time: string | null;
    servings: number;
    notes: string | null;
    /** Id of the source this one is the leftover of */
    leftoverOfId: string | null;
}

export interface CopyTarget {
    id: string;
    date: string;
    slot: string;
    position: number;
}

export interface PlannedCreate {
    sourceId: string;
    recipeId: string;
    date: string;
    slot: string;
    position: number;
    time: string | null;
    servings: number;
    notes: string | null;
    /** Source id of the origin; resolved to the new id when the entries are written */
    leftoverOfSourceId: string | null;
}

export interface CopyPlan {
    /** Origins first, so leftovers can point to the new origin ids */
    creates: PlannedCreate[];
    /** Target entries removed by mode "replace" */
    deleteIds: string[];
    /** Target cells (`date|slot`) that already hold dishes */
    conflicts: string[];
    /** Sources not copied: their cell was taken ("skip") or their origin is not copied */
    skipped: number;
}

/**
 * Copies `sources` to the days from `targetStart`. A leftover whose origin is not
 * copied is dropped: on its own it would be a second dish to cook and to buy for.
 */
export function planCopy(
    sources: CopySource[],
    targetStart: string,
    targets: CopyTarget[],
    mode: ConflictMode,
): CopyPlan {
    const dateOf = (source: CopySource) => addDays(targetStart, source.dayOffset);
    const occupied = new Map<string, CopyTarget[]>();
    for (const target of targets) {
        const key = cellKey(target.date, target.slot);
        occupied.set(key, [...(occupied.get(key) ?? []), target]);
    }

    const sourceCells = new Set(sources.map((source) => cellKey(dateOf(source), source.slot)));
    const conflicts = [...sourceCells].filter((key) => occupied.has(key)).sort();

    let kept = sources.filter(
        (source) => !(mode === 'skip' && occupied.has(cellKey(dateOf(source), source.slot))),
    );
    // Drop leftovers whose origin is not copied (repeat: a chain may lose its head)
    for (;;) {
        const ids = new Set(kept.map((source) => source.id));
        const next = kept.filter((source) => !source.leftoverOfId || ids.has(source.leftoverOfId));
        if (next.length === kept.length) break;
        kept = next;
    }

    const nextPosition = new Map<string, number>();
    for (const key of sourceCells) {
        const existing = occupied.get(key) ?? [];
        nextPosition.set(
            key,
            mode === 'add' && existing.length
                ? Math.max(...existing.map((t) => t.position)) + 1
                : 0,
        );
    }

    const ordered = [...kept].sort(
        (a, b) =>
            a.dayOffset - b.dayOffset || a.slot.localeCompare(b.slot) || a.position - b.position,
    );
    const placed: PlannedCreate[] = ordered.map((source) => {
        const date = dateOf(source);
        const key = cellKey(date, source.slot);
        const position = nextPosition.get(key) ?? 0;
        nextPosition.set(key, position + 1);
        return {
            sourceId: source.id,
            recipeId: source.recipeId,
            date,
            slot: source.slot,
            position,
            time: source.time,
            servings: source.servings,
            notes: source.notes,
            leftoverOfSourceId: source.leftoverOfId,
        };
    });

    return {
        creates: originsFirst(placed),
        deleteIds:
            mode === 'replace'
                ? conflicts.flatMap((key) => (occupied.get(key) ?? []).map((t) => t.id))
                : [],
        conflicts,
        skipped: sources.length - kept.length,
    };
}

/** Orders creates so that every origin comes before its leftovers. */
function originsFirst(creates: PlannedCreate[]): PlannedCreate[] {
    const result: PlannedCreate[] = [];
    const done = new Set<string>();
    let rest = creates;
    while (rest.length) {
        const ready = rest.filter((c) => !c.leftoverOfSourceId || done.has(c.leftoverOfSourceId));
        // A cycle cannot come from valid data; keep the remainder unlinked
        const batch = ready.length ? ready : rest.map((c) => ({ ...c, leftoverOfSourceId: null }));
        for (const c of batch) {
            result.push(c);
            done.add(c.sourceId);
        }
        rest = ready.length ? rest.filter((c) => !done.has(c.sourceId)) : [];
    }
    return result;
}
