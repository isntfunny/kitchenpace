/**
 * Refresh the flow of imported recipes with the new import prompt (KUC-115),
 * via the OpenAI Batch API. Only the flow is rebuilt; ingredients, metadata
 * and tags stay as they are.
 *
 *   submit   [--ids=a,b] [--limit=N] [--no-scrape]   build JSONL, create batch, save state
 *   status                                         show the batch state
 *   fetch                                          evaluate the result: proposals + dry-run report
 *   apply    [--write]                             back up, then write the proposals (dry run without --write)
 *   rollback <backup.json> [--write]                restore flowNodes/flowEdges from a backup
 *
 * All files go to --dir (default: $BACKUP_DIR/refresh-flows or ./backups/refresh-flows).
 * Input per recipe: the source page scraped again (SCRAPLER_URL); if that fails,
 * the stored recipe (ingredient list + previous flow) as text.
 *
 *   npx tsx scripts/refresh-recipe-flows.ts submit --limit=10
 */
import 'dotenv/config';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Command } from 'commander';

import { AI_TEXT_MODEL, AI_TEXT_PRICING } from '../shared/ai-models';
import {
    BATCH_RUNNING_STATUSES,
    buildBatchJsonl,
    createOpenAIBatchApi,
    parseBatchOutputJsonl,
} from '../shared/openai-batch';
import { prisma } from '../shared/prisma';
import {
    buildRefreshRequest,
    evaluateRefreshEntry,
    fallbackMarkdown,
    staleIngredientRefs,
    type RefreshProposal,
    type RefreshRecipe,
    type RefreshRequest,
    type StoredFlowEdge,
    type StoredFlowNode,
} from '../src/lib/importer/flow-refresh';
import { scrapeRecipe } from '../src/lib/importer/scraper';

/** Below this the scraped page is treated as failed (blocked, cookie wall, …). */
const MIN_MARKDOWN = 300;
const SCRAPE_CONCURRENCY = 3;

interface RefreshState {
    batchId: string;
    inputFileId: string;
    model: string;
    createdAt: string;
    requests: RefreshRequest[];
}

interface FlowBackup {
    createdAt: string;
    recipes: { id: string; flowNodes: unknown; flowEdges: unknown }[];
}

const dirOf = (opts: { dir?: string }) => {
    const dir = opts.dir ?? join(process.env.BACKUP_DIR ?? './backups', 'refresh-flows');
    mkdirSync(dir, { recursive: true });
    return dir;
};
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const writeJson = (path: string, value: unknown) =>
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function loadRecipes(where: { ids?: string[]; limit?: number }): Promise<RefreshRecipe[]> {
    const rows = await prisma.recipe.findMany({
        where: {
            sourceUrl: { not: null },
            NOT: { sourceUrl: '' },
            ...(where.ids?.length ? { id: { in: where.ids } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        ...(where.limit ? { take: where.limit } : {}),
        select: {
            id: true,
            title: true,
            description: true,
            sourceUrl: true,
            flowNodes: true,
            recipeIngredients: {
                orderBy: { position: 'asc' },
                select: {
                    id: true,
                    amount: true,
                    notes: true,
                    ingredient: { select: { name: true } },
                    unit: { select: { shortName: true } },
                },
            },
        },
    });
    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        sourceUrl: row.sourceUrl,
        flowNodes: (row.flowNodes as StoredFlowNode[] | null) ?? [],
        ingredients: row.recipeIngredients.map((ri) => ({
            id: ri.id,
            name: ri.ingredient.name,
            amount: ri.amount,
            unit: ri.unit?.shortName ?? null,
            notes: ri.notes,
        })),
    }));
}

async function markdownFor(
    recipe: RefreshRecipe,
    scrape: boolean,
): Promise<{ markdown: string; source: 'scrape' | 'fallback'; note?: string }> {
    if (scrape && recipe.sourceUrl) {
        try {
            const scraped = await scrapeRecipe(recipe.sourceUrl);
            if (scraped.markdown.trim().length >= MIN_MARKDOWN)
                return { markdown: scraped.markdown, source: 'scrape' };
            return {
                markdown: fallbackMarkdown(recipe),
                source: 'fallback',
                note: `Seite zu kurz (${scraped.markdown.trim().length} Zeichen)`,
            };
        } catch (error) {
            return {
                markdown: fallbackMarkdown(recipe),
                source: 'fallback',
                note: error instanceof Error ? error.message : String(error),
            };
        }
    }
    return { markdown: fallbackMarkdown(recipe), source: 'fallback', note: 'ohne Scraping' };
}

async function submit(opts: {
    dir?: string;
    ids?: string;
    limit?: string;
    scrape: boolean;
    force?: boolean;
}) {
    const dir = dirOf(opts);
    const statePath = join(dir, 'state.json');
    if (existsSync(statePath) && !opts.force)
        throw new Error(
            `${statePath} existiert schon (offener Batch?). Erst fetch/apply oder --force.`,
        );

    const recipes = await loadRecipes({
        ids: opts.ids?.split(',').filter(Boolean),
        limit: opts.limit ? Number(opts.limit) : undefined,
    });
    const usable = recipes.filter((r) => r.ingredients.length > 0);
    for (const r of recipes)
        if (r.ingredients.length === 0)
            console.log(`übersprungen (keine Zutaten): ${r.id} ${r.title}`);
    if (usable.length === 0) throw new Error('Keine Rezepte mit sourceUrl und Zutaten gefunden');

    const built: ReturnType<typeof buildRefreshRequest>[] = [];
    for (let i = 0; i < usable.length; i += SCRAPE_CONCURRENCY) {
        const chunk = usable.slice(i, i + SCRAPE_CONCURRENCY);
        const results = await Promise.all(
            chunk.map(async (recipe) => {
                const input = await markdownFor(recipe, opts.scrape);
                console.log(
                    `${input.source.padEnd(8)} ${recipe.id} ${recipe.title}${input.note ? ` — ${input.note}` : ''}`,
                );
                return buildRefreshRequest(recipe, input.markdown, input.source, input.note);
            }),
        );
        built.push(...results);
    }

    const jsonl = buildBatchJsonl(
        '/v1/chat/completions',
        built.map((b) => ({ customId: b.request.customId, body: b.body })),
    );
    writeFileSync(join(dir, `requests-${stamp()}.jsonl`), jsonl);
    const api = createOpenAIBatchApi();
    const inputFileId = await api.uploadJsonl(jsonl, 'refresh-recipe-flows.jsonl');
    const batch = await api.createBatch(inputFileId, '/v1/chat/completions', {
        purpose: 'KUC-115 flow refresh',
    });
    const state: RefreshState = {
        batchId: batch.id,
        inputFileId,
        model: AI_TEXT_MODEL,
        createdAt: new Date().toISOString(),
        requests: built.map((b) => b.request),
    };
    writeJson(statePath, state);
    console.log(
        `Batch ${batch.id} angelegt: ${built.length} Rezepte (${built.filter((b) => b.request.source === 'fallback').length} mit Ersatztext). Zustand: ${statePath}`,
    );
}

async function status(opts: { dir?: string }) {
    const state = readJson<RefreshState>(join(dirOf(opts), 'state.json'));
    const batch = await createOpenAIBatchApi().retrieveBatch(state.batchId);
    console.log(
        JSON.stringify(
            {
                batchId: state.batchId,
                status: batch.status,
                requestCounts: batch.request_counts ?? null,
                recipes: state.requests.length,
            },
            null,
            2,
        ),
    );
}

async function fetchResults(opts: { dir?: string }) {
    const dir = dirOf(opts);
    const state = readJson<RefreshState>(join(dir, 'state.json'));
    const api = createOpenAIBatchApi();
    const batch = await api.retrieveBatch(state.batchId);
    if (BATCH_RUNNING_STATUSES.includes(batch.status))
        throw new Error(`Batch ${state.batchId} läuft noch (${batch.status})`);
    if (batch.status !== 'completed')
        throw new Error(`Batch ${state.batchId} endete mit ${batch.status}`);

    const text = [
        batch.output_file_id ? await api.fileText(batch.output_file_id) : '',
        batch.error_file_id ? await api.fileText(batch.error_file_id) : '',
    ].join('\n');
    const entries = new Map(parseBatchOutputJsonl(text).map((e) => [e.customId, e]));
    const current = new Map(
        (
            await prisma.recipe.findMany({
                where: { id: { in: state.requests.map((r) => r.recipeId) } },
                select: { id: true, flowNodes: true, flowEdges: true },
            })
        ).map((r) => [
            r.id,
            {
                flowNodes: (r.flowNodes as StoredFlowNode[] | null) ?? [],
                flowEdges: (r.flowEdges as StoredFlowEdge[] | null) ?? [],
            },
        ]),
    );

    const proposals: RefreshProposal[] = state.requests.map((request) =>
        evaluateRefreshEntry(
            request,
            entries.get(request.customId),
            current.get(request.recipeId) ?? null,
        ),
    );
    // Batch price: half the direct price
    const cost = proposals.reduce((sum, p) => {
        if (!p.usage) return sum;
        const { input, cached, output } = p.usage;
        return (
            sum +
            ((input - cached) * AI_TEXT_PRICING.input +
                cached * AI_TEXT_PRICING.cachedInput +
                output * AI_TEXT_PRICING.output) /
                2 /
                1e6
        );
    }, 0);
    const proposalsPath = join(dir, `proposals-${state.batchId}.json`);
    writeJson(proposalsPath, {
        batchId: state.batchId,
        createdAt: new Date().toISOString(),
        proposals,
    });

    const count = (s: string) => proposals.filter((p) => p.status === s).length;
    const lines = [
        `# Flow-Refresh Trockenlauf (Batch ${state.batchId})`,
        '',
        `Rezepte: ${proposals.length} · geändert: ${count('changed')} · unverändert: ${count('unchanged')} · ungültig: ${count('invalid')} · fehlgeschlagen: ${count('failed')} · Kosten ca. $${cost.toFixed(3)}`,
        '',
        '| Rezept | Status | Quelle | Knoten alt → neu | Hinweise |',
        '|---|---|---|---|---|',
        ...proposals.map((p) => {
            const before = current.get(p.recipeId)?.flowNodes.length ?? 0;
            const notes = [...p.errors, ...p.warnings].join('; ').replace(/\|/g, '/').slice(0, 300);
            return `| ${p.title.replace(/\|/g, '/')} (${p.recipeId}) | ${p.status} | ${p.source} | ${before} → ${p.flowNodes?.length ?? '–'} | ${notes} |`;
        }),
    ];
    const reportPath = join(dir, `report-${state.batchId}.md`);
    writeFileSync(reportPath, `${lines.join('\n')}\n`);
    console.log(lines.slice(0, 3).join('\n'));
    console.log(`Vorschläge: ${proposalsPath}\nBericht: ${reportPath}`);
}

async function apply(opts: { dir?: string; write?: boolean; proposals?: string }) {
    const dir = dirOf(opts);
    const state = readJson<RefreshState>(join(dir, 'state.json'));
    const proposalsPath = opts.proposals ?? join(dir, `proposals-${state.batchId}.json`);
    const { proposals } = readJson<{ proposals: RefreshProposal[] }>(proposalsPath);
    const changed = proposals.filter((p) => p.status === 'changed');

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
            console.log(`übersprungen (Zutatenliste geändert): ${p.recipeId} ${p.title}`);
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

async function rollback(file: string, opts: { write?: boolean }) {
    const backup = readJson<FlowBackup>(file);
    console.log(`${backup.recipes.length} Rezepte in ${file} (Sicherung vom ${backup.createdAt}).`);
    if (!opts.write) {
        console.log('Trockenlauf: nichts geschrieben. Mit --write zurückspielen.');
        return;
    }
    for (const r of backup.recipes) {
        await prisma.recipe.update({
            where: { id: r.id },
            data: { flowNodes: r.flowNodes as object, flowEdges: r.flowEdges as object },
        });
    }
    console.log(`${backup.recipes.length} Abläufe zurückgespielt.`);
    await syncSearch(backup.recipes.map((r) => r.id));
}

/** Search index update through the worker queue (sync-recipe job). */
async function syncSearch(recipeIds: string[]) {
    try {
        const { addSyncRecipeJob } = await import('../worker/queues');
        for (const id of recipeIds) await addSyncRecipeJob(id);
        console.log(`${recipeIds.length} Suchindex-Jobs eingereiht.`);
    } catch (error) {
        console.warn(
            `Suchindex-Sync nicht eingereiht (${error instanceof Error ? error.message : error}); der 15-Minuten-Sync holt es nach.`,
        );
    }
}

const program = new Command('refresh-recipe-flows');
const dirOption = [
    '--dir <dir>',
    'Arbeitsverzeichnis für Zustand, Berichte und Sicherungen',
] as const;
program
    .command('submit')
    .option(...dirOption)
    .option('--ids <ids>', 'nur diese Rezept-IDs (Komma-getrennt)')
    .option('--limit <n>', 'höchstens n Rezepte')
    .option('--no-scrape', 'Quelle nicht neu scrapen, nur den gespeicherten Stand verwenden')
    .option('--force', 'vorhandene state.json überschreiben')
    .action(submit);
program
    .command('status')
    .option(...dirOption)
    .action(status);
program
    .command('fetch')
    .option(...dirOption)
    .action(fetchResults);
program
    .command('apply')
    .option(...dirOption)
    .option('--proposals <file>', 'Vorschlagsdatei (Standard: die des Batches aus state.json)')
    .option('--write', 'wirklich schreiben (sonst Trockenlauf)')
    .action(apply);
program
    .command('rollback <backup>')
    .option('--write', 'wirklich zurückspielen (sonst Trockenlauf)')
    .action(rollback);

program
    .parseAsync(process.argv)
    .then(() => process.exit(0))
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    });
