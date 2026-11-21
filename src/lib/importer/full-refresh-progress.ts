/**
 * Progress of a full re-import apply (KUC-115): one JSON line per recipe in
 * `applied.jsonl`, appended right after its write. A second `apply --write`
 * skips what is listed there; a rollback restores only what was really
 * applied and warns about recipes edited since. Pure; the CLI does the I/O.
 */

import { basename } from 'node:path';

import type { FullBackup, FullBackupEntry } from './full-refresh';

export const APPLIED_LOG = 'applied.jsonl';

export type ProgressLine =
    | { recipeId: string; at: string; backup: string }
    | { recipeId: string; rolledBackAt: string };

export interface AppliedEntry {
    recipeId: string;
    /** When the write (incl. nutrition) finished */
    at: string;
    /** Backup file holding the recipe's state before the write */
    backup: string;
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

/** Recipes changed after their re-import was written (a rollback would undo those edits). */
export function editedSinceApply(
    applied: ReadonlyMap<string, AppliedEntry>,
    updatedAt: ReadonlyMap<string, Date>,
): string[] {
    return [...updatedAt.entries()]
        .filter(([id, date]) => {
            const entry = applied.get(id);
            return entry !== undefined && date.getTime() > new Date(entry.at).getTime();
        })
        .map(([id]) => id);
}
