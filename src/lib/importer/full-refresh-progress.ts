/**
 * Progress of a full re-import apply (KUC-115): one JSON line per recipe in
 * `applied.jsonl`, appended right after its write. A second `apply --write`
 * skips what is listed there; a rollback restores only what was really
 * applied and warns about recipes edited since. Pure; the CLI does the I/O.
 *
 * "Edited since" compares a small fingerprint (title, number of ingredient
 * rows, hash of the flow edges) taken right after the write with the recipe
 * now. updatedAt cannot tell: views and counters change it too.
 */

import { createHash } from 'node:crypto';
import { basename } from 'node:path';

import type { FullBackup, FullBackupEntry } from './full-refresh';

export const APPLIED_LOG = 'applied.jsonl';

export interface RecipeFingerprint {
    title: string;
    ingredientCount: number;
    /** Short hash of the flow edges, independent of JSON key order */
    flowEdges: string;
}

/** Key-order independent JSON (Postgres jsonb does not keep the key order). */
function canonicalJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (value !== null && typeof value === 'object')
        return `{${Object.entries(value)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
            .join(',')}}`;
    return JSON.stringify(value ?? null);
}

export function recipeFingerprint(recipe: {
    title: string;
    ingredientCount: number;
    flowEdges: unknown;
}): RecipeFingerprint {
    return {
        title: recipe.title,
        ingredientCount: recipe.ingredientCount,
        flowEdges: createHash('sha256')
            .update(canonicalJson(recipe.flowEdges ?? null))
            .digest('hex')
            .slice(0, 16),
    };
}

const sameFingerprint = (a: RecipeFingerprint, b: RecipeFingerprint) =>
    a.title === b.title && a.ingredientCount === b.ingredientCount && a.flowEdges === b.flowEdges;

export type ProgressLine =
    | { recipeId: string; at: string; backup: string; fingerprint: RecipeFingerprint }
    | { recipeId: string; rolledBackAt: string };

export interface AppliedEntry {
    recipeId: string;
    /** When the transaction of the write committed (image and nutrition follow) */
    at: string;
    /** Backup file holding the recipe's state before the write */
    backup: string;
    /** The recipe right after the write (missing in logs of older runs) */
    fingerprint?: RecipeFingerprint;
}

export const progressLine = (line: ProgressLine) => `${JSON.stringify(line)}\n`;

/** Recipes currently applied: later rollback lines undo earlier apply lines. */
export function parseAppliedLog(text: string): Map<string, AppliedEntry> {
    const applied = new Map<string, AppliedEntry>();
    for (const raw of text.split('\n')) {
        if (!raw.trim()) continue;
        let line: Partial<AppliedEntry & { rolledBackAt: string }>;
        try {
            line = JSON.parse(raw);
        } catch {
            continue; // a line cut off by a crash
        }
        if (!line.recipeId) continue;
        if (line.rolledBackAt) applied.delete(line.recipeId);
        else if (line.at && line.backup)
            applied.set(line.recipeId, {
                recipeId: line.recipeId,
                at: line.at,
                backup: line.backup,
                ...(line.fingerprint ? { fingerprint: line.fingerprint } : {}),
            });
    }
    return applied;
}

/**
 * Backup entries to restore. With a progress log only the recipes applied
 * from this very backup (others were never written or come from another
 * run); without one, all of them.
 */
export function selectRollbackEntries(
    backup: FullBackup,
    backupPath: string,
    applied: ReadonlyMap<string, AppliedEntry> | null,
): { entries: FullBackupEntry[]; notApplied: string[] } {
    if (!applied) return { entries: backup.recipes, notApplied: [] };
    const fromThis = (id: string) => {
        const entry = applied.get(id);
        return entry !== undefined && basename(entry.backup) === basename(backupPath);
    };
    return {
        entries: backup.recipes.filter((r) => fromThis(r.id)),
        notApplied: backup.recipes.filter((r) => !fromThis(r.id)).map((r) => r.id),
    };
}

/**
 * Recipes changed after their re-import was written (a rollback would undo
 * those edits): title, ingredient count or flow edges differ from the
 * fingerprint in the log. `unknown`: log lines without a fingerprint.
 */
export function editedSinceApply(
    applied: ReadonlyMap<string, AppliedEntry>,
    current: ReadonlyMap<string, RecipeFingerprint>,
): { edited: string[]; unknown: string[] } {
    const edited: string[] = [];
    const unknown: string[] = [];
    for (const [id, now] of current) {
        const entry = applied.get(id);
        if (!entry) continue;
        if (!entry.fingerprint) unknown.push(id);
        else if (!sameFingerprint(entry.fingerprint, now)) edited.push(id);
    }
    return { edited, unknown };
}
