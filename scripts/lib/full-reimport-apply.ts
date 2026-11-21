/**
 * apply and rollback of the full re-import (KUC-115). apply is resumable:
 * every written recipe is appended to `applied.jsonl` right after its
 * transaction commits (before image and nutrition), so a run that breaks off
 * can be started again and skips what is done (its backup is the first
 * run's). SIGINT/SIGTERM/SIGHUP stop after the recipe in hand; the search
 * sync and the result file still follow. rollback restores only what the log lists as applied
 * from that backup and warns about recipes edited since.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { prisma } from '../../shared/prisma';
import {
    isFullBackup,
    writableProposals,
    type FullBackup,
    type FullRefreshProposal,
} from '../../src/lib/importer/full-refresh';
import { restoreFullBackupEntry, snapshotRecipes } from '../../src/lib/importer/full-refresh-db';
import {
    APPLIED_LOG,
    editedSinceApply,
    parseAppliedLog,
    progressLine,
    selectRollbackEntries,
    type AppliedEntry,
} from '../../src/lib/importer/full-refresh-progress';
import { replaceImportedRecipe } from '../../src/lib/importer/pipeline';
import { stopOnSignal } from '../../src/lib/importer/stop-on-signal';
import { setEnrichmentEnqueuer } from '../../src/lib/ingredients/enqueue-enrichment';
import { setNewIngredientNotifications } from '../../src/lib/ingredients/new-ingredient-notifications';

import { cachedIngredientResolver } from './full-reimport-db';
import { syncSearch } from './sync-search';

const writeJson = (path: string, value: unknown) =>
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const readAppliedLog = (path: string) =>
    existsSync(path)
        ? parseAppliedLog(readFileSync(path, 'utf8'))
        : new Map<string, AppliedEntry>();

export async function applyFull(
    dir: string,
    proposals: FullRefreshProposal[],
    opts: { write?: boolean; ids?: string[]; includeReview?: boolean; includeMismatch?: boolean },
) {
    const ready = writableProposals(proposals, opts);
    const held = (status: FullRefreshProposal['status']) =>
        proposals.filter((p) => p.status === status && !ready.includes(p)).length;
    if (held('review'))
        console.log(
            `${held('review')} Rezepte mit abweichendem Titel zurückgehalten (--include-review oder --ids).`,
        );
    if (held('mismatch'))
        console.log(
            `${held('mismatch')} Rezepte mit unpassender Quelle zurückgehalten (--include-mismatch oder --ids).`,
        );

    const logPath = join(dir, APPLIED_LOG);
    const done = readAppliedLog(logPath);
    const already = ready.filter((p) => done.has(p.recipeId));
    if (already.length) {
        const backups = [...new Set(already.map((p) => done.get(p.recipeId)!.backup))];
        console.log(
            `${already.length} schon angewandt (${logPath}), werden übersprungen; ihre Sicherung: ${backups.join(', ')}`,
        );
    }

    const pending = ready.filter((p) => !done.has(p.recipeId));
    const recipes = await prisma.recipe.findMany({
        where: { id: { in: pending.map((p) => p.recipeId) } },
        select: { id: true, _count: { select: { stepImages: true } } },
    });
    const byId = new Map(recipes.map((r) => [r.id, r]));
    const todo: FullRefreshProposal[] = [];
    for (const p of pending) {
        const recipe = byId.get(p.recipeId);
        if (!recipe) console.log(`übersprungen (gelöscht): ${p.recipeId}`);
        // Step photos hang on node ids, which the new flow does not keep
        else if (recipe._count.stepImages > 0)
            console.log(`übersprungen (hat Schrittfotos): ${p.recipeId} ${p.title}`);
        else todo.push(p);
    }
    console.log(`${todo.length} von ${proposals.length} Rezepten bereit zum Vollimport.`);
    if (!opts.write) {
        console.log('Trockenlauf: nichts geschrieben. Mit --write anwenden.');
        return;
    }
    if (todo.length === 0) return;

    // Bulk run: no moderator notification per new ingredient (the report lists
    // them), enrichment collected and enqueued once at the end, catalogue
    // lookups cached over the whole run.
    setNewIngredientNotifications(false);
    const created = new Set<string>();
    setEnrichmentEnqueuer(async (id) => {
        created.add(id);
    });
    const resolveIngredient = cachedIngredientResolver();

    const backup: FullBackup = {
        kind: 'full',
        createdAt: new Date().toISOString(),
        recipes: await snapshotRecipes(
            prisma,
            todo.map((p) => p.recipeId),
        ),
    };
    const backupPath = join(dir, `backup-full-${stamp()}.json`);
    writeJson(backupPath, backup);
    console.log(`Vollständige Sicherung: ${backupPath}`);

    const applied: string[] = [];
    const failed: { id: string; error: string }[] = [];
    const warnings: { id: string; warnings: string[] }[] = [];
    const stop = stopOnSignal((signal) =>
        console.warn(
            `${signal}: höre nach dem laufenden Rezept auf (Suche und Ergebnisdatei folgen noch). Erneut senden bricht sofort ab.`,
        ),
    );
    try {
        for (const [index, p] of todo.entries()) {
            if (stop.requested) {
                console.warn(
                    `Abgebrochen nach ${applied.length} Rezepten; ${todo.length - index} offen. Erneut "apply --write" mit demselben --dir setzt fort.`,
                );
                break;
            }
            try {
                const result = await replaceImportedRecipe(prisma, p.recipeId, p.recipe!, {
                    resolveIngredient,
                    // recorded before image and nutrition: a stop after this
                    // point must not leave a written recipe out of the log
                    onCommitted: () => {
                        appendFileSync(
                            logPath,
                            progressLine({
                                recipeId: p.recipeId,
                                at: new Date().toISOString(),
                                backup: backupPath,
                            }),
                        );
                        applied.push(p.recipeId);
                    },
                });
                if (result.warnings.length)
                    warnings.push({ id: p.recipeId, warnings: result.warnings });
                console.log(
                    `[${index + 1}/${todo.length}] neu importiert: ${p.recipeId} ${p.recipe!.title}${result.imageAdded ? ' (+ Bild)' : ''}`,
                );
            } catch (error) {
                failed.push({ id: p.recipeId, error: message(error) });
                console.error(
                    `[${index + 1}/${todo.length}] fehlgeschlagen: ${p.recipeId} — ${message(error)}`,
                );
            }
        }
    } finally {
        stop.dispose();
        // Also after a crash or a stop: what was written gets its search sync and enrichment
        const createdIngredients = await prisma.ingredient
            .findMany({ where: { id: { in: [...created] } }, select: { id: true, name: true } })
            .catch(() => [...created].map((id) => ({ id, name: null })));
        writeJson(join(dir, `apply-full-${stamp()}.json`), {
            backup: backupPath,
            applied,
            failed,
            warnings,
            createdIngredients,
        });
        console.log(
            `${applied.length} Rezepte neu importiert, ${failed.length} fehlgeschlagen, ${created.size} Zutaten neu angelegt.`,
        );
        await syncSearch(applied, { enrichIngredientIds: [...created] });
    }
    if (failed.length > 0) process.exitCode = 1;
}

export async function rollbackFull(
    file: string,
    backup: unknown,
    opts: { write?: boolean; applied?: string; all?: boolean },
) {
    if (!isFullBackup(backup)) throw new Error(`${file} ist keine Vollsicherung`);
    const logPath = opts.applied ?? join(dirname(file), APPLIED_LOG);
    const log = opts.all || !existsSync(logPath) ? null : readAppliedLog(logPath);
    const { entries, notApplied } = selectRollbackEntries(backup, file, log);
    console.log(
        `${backup.recipes.length} Rezepte in ${file} (Vollsicherung vom ${backup.createdAt}); zurückzuspielen: ${entries.length}${log ? ` laut ${logPath}` : ' (alle, ohne Fortschrittsdatei)'}.`,
    );
    if (notApplied.length)
        console.log(
            `${notApplied.length} nicht angewandt oder schon zurückgespielt, bleiben unberührt (--all spielt alle zurück).`,
        );
    if (log) {
        const current = await prisma.recipe.findMany({
            where: { id: { in: entries.map((e) => e.id) } },
            select: { id: true, updatedAt: true },
        });
        const edited = editedSinceApply(log, new Map(current.map((r) => [r.id, r.updatedAt])));
        for (const id of edited)
            console.warn(
                `Achtung: ${id} wurde nach dem Neuimport bearbeitet; der Rollback überschreibt diese Änderungen.`,
            );
    }
    if (!opts.write) {
        console.log('Trockenlauf: nichts geschrieben. Mit --write zurückspielen.');
        return;
    }
    const restored: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const entry of entries) {
        try {
            await restoreFullBackupEntry(prisma, entry);
            restored.push(entry.id);
            if (log)
                appendFileSync(
                    logPath,
                    progressLine({ recipeId: entry.id, rolledBackAt: new Date().toISOString() }),
                );
        } catch (error) {
            failed.push({ id: entry.id, error: message(error) });
        }
    }
    console.log(`${restored.length} von ${entries.length} Rezepten zurückgespielt.`);
    for (const f of failed) console.error(`fehlgeschlagen: ${f.id} — ${f.error}`);
    if (restored.length > 0) await syncSearch(restored);
    if (failed.length > 0) process.exitCode = 1;
}
