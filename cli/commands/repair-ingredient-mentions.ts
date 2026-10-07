import { open, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { Command } from 'commander';
import { z } from 'zod';

import {
    decisionsSchema,
    extractImportEvidence,
    planRecipeRepair,
    snapshotSchema,
    type RecipeMentionSnapshot,
} from '@app/lib/ingredients/mention-migration';

import { db } from '../lib/db';
import { readMentionSnapshot, replaceMentionSnapshot } from '../lib/mention-repair-store';

const entrySchema = z.object({ before: snapshotSchema, after: snapshotSchema });
const fileSchema = z.object({
    version: z.literal(1),
    kind: z.enum(['plan', 'journal']),
    entries: z.array(entrySchema),
});
const decisionFileSchema = z.record(z.string(), decisionsSchema);

async function writeExclusive(path: string, data: unknown) {
    const file = await open(path, 'wx', 0o600);
    try {
        await file.writeFile(JSON.stringify(data, null, 2) + '\n');
        await file.sync();
    } finally {
        await file.close();
    }
    const directory = await open(dirname(path), 'r');
    try {
        await directory.sync();
    } finally {
        await directory.close();
    }
}

interface RepairOptions {
    report: string;
    recipe?: string;
    decisions?: string;
    apply?: string;
    rollback?: string;
    resume?: string;
    journal?: string;
}

export function registerMentionRepairCommand(program: Command) {
    program
        .command('repair-ingredient-mentions')
        .description('Dry-run legacy ingredient mention repair; write a reviewable JSON plan')
        .option(
            '--report <file>',
            'New report/plan file (never overwrite)',
            'ingredient-mentions-plan.json',
        )
        .option('--recipe <id-or-slug>', 'Limit the scan to one recipe')
        .option('--decisions <file>', 'Reviewed mappings/restored rows keyed by recipe ID')
        .option('--apply <plan>', 'Apply a previously reviewed plan; requires --journal')
        .option('--journal <file>', 'New durable undo journal written before any DB mutation')
        .option('--rollback <journal>', 'Revert a journal only if recipes have not changed')
        .option('--resume <journal>', 'Resume applying an existing durable journal')
        .action(async (options: RepairOptions) => {
            if ([options.apply, options.rollback, options.resume].filter(Boolean).length > 1)
                throw new Error('Choose apply, resume or rollback');
            if (
                (options.apply || options.rollback || options.resume) &&
                (options.recipe || options.decisions)
            )
                throw new Error('Scan options cannot be combined with apply/rollback');
            if (options.apply && !options.journal) throw new Error('--apply requires --journal');
            if ((options.rollback || options.resume) && options.journal)
                throw new Error('--journal is only used with --apply');
            if (!process.env.DATABASE_URL)
                throw new Error('DATABASE_URL must be injected for the intended environment');
            try {
                if (options.apply || options.rollback || options.resume) {
                    const file = fileSchema.parse(
                        JSON.parse(
                            await readFile(
                                (options.apply ?? options.rollback ?? options.resume)!,
                                'utf8',
                            ),
                        ),
                    );
                    if (file.kind !== (options.apply ? 'plan' : 'journal'))
                        throw new Error('Wrong file kind');
                    if (
                        new Set(file.entries.map((entry) => entry.before.id)).size !==
                        file.entries.length
                    )
                        throw new Error('Duplicate recipe IDs in plan/journal');
                    const entries = options.apply
                        ? file.entries.map((entry) => ({
                              ...entry,
                              after: { ...entry.after, updatedAt: new Date().toISOString() },
                          }))
                        : file.entries;
                    if (options.apply)
                        await writeExclusive(options.journal!, {
                            version: 1,
                            kind: 'journal',
                            createdAt: new Date().toISOString(),
                            entries,
                        });
                    let changed = 0,
                        unchanged = 0,
                        conflicts = 0;
                    for (const entry of options.rollback ? [...entries].reverse() : entries) {
                        try {
                            const expected = options.rollback ? entry.after : entry.before;
                            // A rollback retains the original optimistic timestamp, making it
                            // recognizable on resume; it does not overwrite any newer edit.
                            const desired = options.rollback ? entry.before : entry.after;
                            const status = await replaceMentionSnapshot(db, expected, desired);
                            if (status === 'changed') changed++;
                            else unchanged++;
                        } catch (error) {
                            conflicts++;
                            console.error(
                                `${entry.before.slug}: ${error instanceof Error ? error.message : String(error)}`,
                            );
                        }
                    }
                    console.log(
                        `${options.rollback ? 'Rolled back' : 'Applied'}: ${changed}; already at target: ${unchanged}; conflicts/errors: ${conflicts}`,
                    );
                    if (conflicts) process.exitCode = 1;
                    return;
                }

                const decisions = options.decisions
                    ? decisionFileSchema.parse(
                          JSON.parse(await readFile(options.decisions, 'utf8')),
                      )
                    : {};
                const entries: ReturnType<typeof planRecipeRepair>[] = [];
                const review: {
                    id: string;
                    slug: string;
                    issues: unknown;
                    evidence: unknown;
                    decisions?: unknown;
                }[] = [];
                const invalid: { id: string; slug: string; reason: string }[] = [];
                let cursor: string | undefined,
                    scanned = 0;
                const seenDecisions = new Set<string>();
                do {
                    const batch = await db.recipe.findMany({
                        where: options.recipe
                            ? { OR: [{ id: options.recipe }, { slug: options.recipe }] }
                            : {},
                        select: { id: true, slug: true, sourceUrl: true, authorId: true },
                        orderBy: { id: 'asc' },
                        take: 100,
                        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                    });
                    if (!batch.length) break;
                    for (const recipe of batch) {
                        scanned++;
                        let snapshot: RecipeMentionSnapshot;
                        try {
                            snapshot = await readMentionSnapshot(db, recipe.id);
                        } catch (error) {
                            invalid.push({
                                id: recipe.id,
                                slug: recipe.slug,
                                reason: String(error),
                            });
                            continue;
                        }
                        const decision = decisions[recipe.id];
                        if (decision) {
                            for (const row of decision.restoreRows) {
                                const catalogue = await db.ingredient.findUniqueOrThrow({
                                    where: { id: row.ingredientId },
                                });
                                const unit = await db.unit.findUniqueOrThrow({
                                    where: { id: row.unitId },
                                });
                                if (row.name !== catalogue.name || row.unit !== unit.shortName)
                                    throw new Error(
                                        'Restoration name/unit do not match the catalogue',
                                    );
                                row.aliases = [
                                    ...catalogue.aliases,
                                    ...(catalogue.pluralName ? [catalogue.pluralName] : []),
                                ].sort();
                            }
                        }
                        if (decision) seenDecisions.add(recipe.id);
                        const plan = planRecipeRepair(snapshot, decision);
                        if (plan.changed) entries.push(plan);
                        if (plan.issues.length || decision) {
                            const imports = await db.importRun.findMany({
                                where: {
                                    status: 'SUCCESS',
                                    OR: [
                                        { recipeId: recipe.id },
                                        ...(recipe.sourceUrl
                                            ? [
                                                  {
                                                      recipeId: null,
                                                      sourceUrl: recipe.sourceUrl,
                                                      userId: recipe.authorId,
                                                  },
                                              ]
                                            : []),
                                    ],
                                },
                                select: {
                                    id: true,
                                    recipeId: true,
                                    createdAt: true,
                                    rawApiResponse: true,
                                },
                                orderBy: { createdAt: 'desc' },
                                take: 10,
                            });
                            review.push({
                                id: recipe.id,
                                slug: recipe.slug,
                                issues: plan.issues,
                                decisions: decision,
                                evidence: imports
                                    .map((run) => ({
                                        importRunId: run.id,
                                        linkedToRecipe: run.recipeId === recipe.id,
                                        createdAt: run.createdAt.toISOString(),
                                        ingredients: extractImportEvidence(run.rawApiResponse),
                                    }))
                                    .filter((run) => run.ingredients),
                            });
                        }
                    }
                    cursor = batch.at(-1)!.id;
                } while (true);
                const unused = Object.keys(decisions).filter((id) => !seenDecisions.has(id));
                if (unused.length)
                    throw new Error(`Decisions for unscanned recipes: ${unused.join(', ')}`);
                if (options.recipe && scanned === 0) throw new Error('Recipe not found');
                await writeExclusive(options.report, {
                    version: 1,
                    kind: 'plan',
                    createdAt: new Date().toISOString(),
                    scanned,
                    entries,
                    review,
                    invalid,
                });
                console.log(
                    `Dry run: ${scanned} recipes scanned; ${entries.length} with safe changes; ${review.filter((r) => (r.issues as unknown[]).length).length} need review; ${invalid.length} invalid flows. Report: ${options.report}`,
                );
            } finally {
                await db.$disconnect();
            }
        });
}
