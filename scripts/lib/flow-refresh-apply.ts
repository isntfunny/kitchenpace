/**
 * apply of the flow-only refresh (KUC-115): back up the flows, then write
 * the changed ones. Recipes with step photos or a changed ingredient list
 * are skipped.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { prisma } from '../../shared/prisma';
import {
    staleIngredientRefs,
    type FlowBackupEntry,
    type RefreshProposal,
} from '../../src/lib/importer/flow-refresh';

import { syncSearch } from './sync-search';

export interface FlowBackup {
    createdAt: string;
    recipes: FlowBackupEntry[];
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const writeJson = (path: string, value: unknown) =>
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

export async function applyFlow(
    dir: string,
    state: { batchId: string },
    opts: { write?: boolean; proposals?: string; ids?: string },
) {
    const only = opts.ids
        ?.split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    const proposalsPath = opts.proposals ?? join(dir, `proposals-${state.batchId}.json`);
    const { proposals } = readJson<{ proposals: RefreshProposal[] }>(proposalsPath);
    const changed = proposals.filter(
        (p) => p.status === 'changed' && (!only?.length || only.includes(p.recipeId)),
    );

    const recipes = await prisma.recipe.findMany({
        where: { id: { in: changed.map((p) => p.recipeId) } },
        select: {
            id: true,
            flowNodes: true,
            flowEdges: true,
            recipeIngredients: { select: { id: true } },
            _count: { select: { stepImages: true } },
        },
    });
    const byId = new Map(recipes.map((r) => [r.id, r]));
    const ready: RefreshProposal[] = [];
    for (const p of changed) {
        const recipe = byId.get(p.recipeId);
        if (!recipe) {
            console.log(`übersprungen (gelöscht): ${p.recipeId}`);
            continue;
        }
        // Step photos hang on node ids, which the new flow does not keep
        if (recipe._count.stepImages > 0) {
            console.log(`übersprungen (hat Schrittfotos): ${p.recipeId} ${p.title}`);
            continue;
        }
        const stale = staleIngredientRefs(p, new Set(recipe.recipeIngredients.map((ri) => ri.id)));
        if (stale.length > 0) {
            console.log(
                `übersprungen (veraltet, Zutatenliste seit dem Batch geändert): ${p.recipeId} ${p.title}`,
            );
            continue;
        }
        ready.push(p);
    }
    console.log(
        `${ready.length} von ${proposals.length} Rezepten bereit (${changed.length} geändert).`,
    );
    if (!opts.write) {
        console.log('Trockenlauf: nichts geschrieben. Mit --write anwenden.');
        return;
    }
    if (ready.length === 0) return;

    const backup: FlowBackup = {
        createdAt: new Date().toISOString(),
        recipes: ready.map((p) => {
            const r = byId.get(p.recipeId)!;
            return { id: r.id, flowNodes: r.flowNodes, flowEdges: r.flowEdges };
        }),
    };
    const backupPath = join(dir, `backup-${stamp()}.json`);
    writeJson(backupPath, backup);
    console.log(`Sicherung: ${backupPath}`);

    for (const p of ready) {
        await prisma.recipe.update({
            where: { id: p.recipeId },
            data: { flowNodes: p.flowNodes as object, flowEdges: p.flowEdges as object },
        });
    }
    console.log(`${ready.length} Abläufe geschrieben.`);
    await syncSearch(ready.map((p) => p.recipeId));
}
