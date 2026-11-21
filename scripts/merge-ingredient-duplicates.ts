// Merges ingredient duplicate groups from a reviewed plan file (KUC-114), instead of
// confirming each group in /admin/ingredients. Dry run by default; --write applies
// every group in its own transaction (same merge as the admin, with ModerationLog).
// Back up Ingredient, RecipeIngredient, Recipe, ShoppingItem and FilterSetIngredient
// before --write; the report lists every moved row for a rollback.
//
// Plan file: JSON array of groups
//   { keep: { id, name } | null, merge: [{ id, name }], rename: [{ id, name, normalizedName }] }
// "rename" takes an entry out of its group: it gets its own display name, marked as manual
// so the enrichment never overwrites it.
//
//   npx tsx scripts/merge-ingredient-duplicates.ts --plan plan.json [--write --actor <email>]
//       [--report out.json] [--no-sync]
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { prisma } from '../shared/prisma';
import {
    mergeIngredientGroup,
    previewIngredientGroupMerge,
    type MergeGroupResult,
} from '../src/lib/ingredients/merge-group';

/** Same key as WATERMARK_KEY_INGREDIENTS in worker/queues/opensearch-processor.ts */
const INGREDIENT_WATERMARK_KEY = 'opensearch:watermark:ingredients';

interface PlanGroup {
    keep: { id: string; name: string } | null;
    merge: Array<{ id: string; name: string }>;
    rename: Array<{ id: string; name: string; normalizedName: string }>;
}

interface Report {
    write: boolean;
    renamed: Array<{ id: string; name: string; from: string | null; to: string }>;
    merged: MergeGroupResult[];
    failed: Array<{ keep: string; error: string }>;
    affectedRecipeIds: string[];
}

async function applyRenames(plan: PlanGroup[], write: boolean, report: Report) {
    for (const entry of plan.flatMap((group) => group.rename)) {
        const row = await prisma.ingredient.findUnique({
            where: { id: entry.id },
            select: { name: true, normalizedName: true },
        });
        if (!row) {
            report.failed.push({ keep: entry.name, error: 'Zutat existiert nicht mehr' });
            continue;
        }
        if (write) {
            await prisma.ingredient.update({
                where: { id: entry.id },
                data: { normalizedName: entry.normalizedName, normalizedNameManual: true },
            });
        }
        report.renamed.push({
            id: entry.id,
            name: row.name,
            from: row.normalizedName,
            to: entry.normalizedName,
        });
    }
}

async function applyMerges(
    plan: PlanGroup[],
    write: boolean,
    actorId: string | null,
    report: Report,
) {
    for (const group of plan) {
        if (!group.keep || group.merge.length === 0) continue;
        const keepId = group.keep.id;
        const mergeIds = group.merge.map((entry) => entry.id);
        try {
            if (!write) {
                const preview = await prisma.$transaction((tx) =>
                    previewIngredientGroupMerge(tx, keepId, mergeIds),
                );
                report.merged.push({
                    keepId,
                    aliases: [],
                    merged: preview.merge.map((entry) => ({
                        id: entry.id,
                        name: entry.name,
                        slug: '',
                        normalizedName: null,
                        aliases: [],
                        recipeIngredientIds: [],
                        shoppingItemIds: [],
                        filterSetIds: [],
                    })),
                    affectedRecipeIds: preview.affectedRecipeIds,
                });
                continue;
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const merged = await mergeIngredientGroup(tx, keepId, mergeIds);
                    const keep = await tx.ingredient.findUniqueOrThrow({
                        where: { id: keepId },
                        select: { name: true, normalizedName: true },
                    });
                    await tx.moderationLog.create({
                        data: {
                            actorId: actorId!,
                            action: 'merge_ingredients',
                            contentType: 'ingredient',
                            contentId: keepId,
                            reason: `Duplikate von „${keep.normalizedName ?? keep.name}“ zusammengeführt (Sammellauf KUC-114)`,
                            metadata: JSON.parse(JSON.stringify({ keep, ...merged })),
                        },
                    });
                    return merged;
                },
                { timeout: 60_000 },
            );
            report.merged.push(result);
        } catch (error) {
            report.failed.push({
                keep: group.keep.name,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

async function resyncSearch(report: Report) {
    const { OPENSEARCH_INGREDIENTS_INDEX, opensearchClient } =
        await import('../shared/opensearch/client');
    const { addSyncRecipeJob } = await import('../worker/queues');
    const { getQueueForName, closeAllQueues } = await import('../worker/queues/queue');
    const { QueueName } = await import('../worker/queues/types');
    const { getRedis, disconnectRedis } = await import('../worker/queues/connection');
    try {
        const deletedIds = report.merged.flatMap((group) => group.merged.map((entry) => entry.id));
        if (deletedIds.length > 0) {
            await opensearchClient.bulk({
                body: deletedIds.map((id) => ({
                    delete: { _index: OPENSEARCH_INGREDIENTS_INDEX, _id: id },
                })),
            });
        }
        for (const recipeId of report.affectedRecipeIds) await addSyncRecipeJob(recipeId);
        // Aliases and display names changed without a new createdAt: full ingredient sync
        await getRedis().del(INGREDIENT_WATERMARK_KEY);
        await getQueueForName(QueueName.OPENSEARCH).add('sync-ingredients', { batchSize: 500 });
        console.log(
            `OpenSearch: ${deletedIds.length} Zutaten entfernt, ${report.affectedRecipeIds.length} Rezepte und Zutaten-Index eingereiht`,
        );
    } finally {
        await closeAllQueues();
        await disconnectRedis();
    }
}

async function main() {
    const { values } = parseArgs({
        options: {
            plan: { type: 'string' },
            write: { type: 'boolean', default: false },
            actor: { type: 'string' },
            report: { type: 'string' },
            'no-sync': { type: 'boolean', default: false },
        },
    });
    if (!values.plan) throw new Error('--plan <datei> fehlt');
    const plan = JSON.parse(readFileSync(values.plan, 'utf8')) as PlanGroup[];

    let actorId: string | null = null;
    if (values.write) {
        if (!values.actor) throw new Error('--write braucht --actor <E-Mail eines Admins>');
        const actor = await prisma.user.findFirst({
            where: { email: values.actor, role: 'admin' },
            select: { id: true },
        });
        if (!actor) throw new Error(`Kein Admin mit E-Mail ${values.actor}`);
        actorId = actor.id;
    }

    const report: Report = {
        write: values.write,
        renamed: [],
        merged: [],
        failed: [],
        affectedRecipeIds: [],
    };
    // Renames first: they take entries out of their group before the merge checks it
    await applyRenames(plan, values.write, report);
    await applyMerges(plan, values.write, actorId, report);
    report.affectedRecipeIds = [
        ...new Set(report.merged.flatMap((group) => group.affectedRecipeIds)),
    ];

    const removed = report.merged.reduce((sum, group) => sum + group.merged.length, 0);
    console.log(values.write ? 'Geschrieben:' : 'Trockenlauf (nichts geschrieben):');
    console.log(`  ${report.merged.length} Gruppen zusammengeführt, ${removed} Zutaten entfernt`);
    console.log(`  ${report.renamed.length} Zutaten mit eigenem Anzeigenamen`);
    console.log(`  ${report.affectedRecipeIds.length} Rezepte betroffen`);
    console.log(`  ${report.failed.length} Fehler`);
    for (const failure of report.failed) console.log(`    - ${failure.keep}: ${failure.error}`);
    if (values.report) {
        writeFileSync(values.report, JSON.stringify(report, null, 2));
        console.log(`Protokoll: ${values.report}`);
    }
    if (values.write && !values['no-sync']) await resyncSearch(report);
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
