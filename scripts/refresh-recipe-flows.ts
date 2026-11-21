/**
 * Refresh imported recipes with the new import prompt (KUC-115), via the
 * OpenAI Batch API. Two modes:
 *
 * Flow only (default): only the flow is rebuilt; ingredients, metadata and
 * tags stay as they are.
 *
 * Full (`submit --full`): every recipe with a sourceUrl whose author is an
 * admin is rebuilt from its source as if imported by URL today (title,
 * description, ingredients, categories, tags, difficulty, servings, times,
 * flow). Kept: id, slug, image (a missing one is fetched), status, author,
 * moderation, sourceUrl and everything users added. A source that cannot be
 * scraped means: skipped, never rebuilt from the stored recipe.
 *
 *   select   --full [--ids=a,b] [--limit=N]       full mode: write the selection once (selection.json)
 *   submit   [--full] [--ids=a,b | --ids-file=F | --chunk=N/M [--selection=F]] [--limit=N] [--no-scrape]
 *                                                  build JSONL, create batch, save state
 *   status                                         show the batch state
 *   fetch                                          evaluate the result: proposals + dry-run report
 *   repair                                         full mode: invalid/failed answers once more (one round)
 *   apply    [--write] [--ids=a,b] [--include-review] [--include-mismatch]
 *                                                  back up, then write the proposals (dry run without --write)
 *   rollback <backup.json> [--write]                restore a backup (flow-only or full)
 *
 * The mode is kept in state.json; status/fetch/repair/apply follow it.
 *
 * Long runs (full apply): start them so that a closed terminal does not stop
 * them, e.g. in tmux, or in the worker container with
 * `docker exec -d <worker> sh -c 'npx tsx scripts/refresh-recipe-flows.ts apply --write --dir=… > /app/backups/refresh-flows/apply.log 2>&1'`.
 * SIGINT/SIGTERM/SIGHUP stop after the recipe in hand (search sync and the
 * result file still follow); a second signal stops at once. Each written
 * recipe is in applied.jsonl right after its transaction, so `apply --write`
 * again continues where the run stopped.
 *
 * All files go to --dir (default: $BACKUP_DIR/refresh-flows or ./backups/refresh-flows).
 * One --dir per batch: status, fetch, repair, apply and resuming a broken-off
 * apply need the same --dir as its submit (state.json, applied.jsonl).
 * Input per recipe: the source page scraped again (SCRAPLER_URL); if that fails,
 * the stored recipe (ingredient list + previous flow) as text.
 *
 *   npx tsx scripts/refresh-recipe-flows.ts submit --limit=10
 *   npx tsx scripts/refresh-recipe-flows.ts submit --full --ids=<id1>,<id2>
 *   npx tsx scripts/refresh-recipe-flows.ts select --full --dir=backups/refresh-flows
 *   npx tsx scripts/refresh-recipe-flows.ts submit --full --selection=backups/refresh-flows/selection.json --chunk=1/2 --dir=backups/refresh-flows/teil-1
 *   npx tsx scripts/refresh-recipe-flows.ts submit --full --selection=backups/refresh-flows/selection.json --chunk=2/2 --dir=backups/refresh-flows/teil-2
 */
import 'dotenv/config';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Prisma } from '@prisma/client';
import { Command } from 'commander';

import { AI_TEXT_MODEL } from '../shared/ai-models';
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
    restoreFlowBackup,
    type RefreshProposal,
    type RefreshRequest,
    type StoredFlowEdge,
    type StoredFlowNode,
} from '../src/lib/importer/flow-refresh';
import { batchCostUsd } from '../src/lib/importer/full-refresh';

import { applyFlow, type FlowBackup } from './lib/flow-refresh-apply';
import { loadRecipes, markdownFor } from './lib/flow-refresh-input';
import {
    applyFullFromState,
    fetchFull,
    repairFull,
    selectFull,
    submitFull,
    type FullState,
    type SubmitFullOptions,
} from './lib/full-reimport';
import { rollbackFull } from './lib/full-reimport-apply';
import { syncSearch } from './lib/sync-search';

const SCRAPE_CONCURRENCY = 3;

interface RefreshState {
    mode?: 'flow';
    batchId: string;
    inputFileId: string;
    model: string;
    createdAt: string;
    requests: RefreshRequest[];
}

const dirOf = (opts: { dir?: string }) => {
    const dir = opts.dir ?? join(process.env.BACKUP_DIR ?? './backups', 'refresh-flows');
    mkdirSync(dir, { recursive: true });
    return dir;
};
type AnyState = RefreshState | FullState;
const isFull = (state: AnyState): state is FullState => state.mode === 'full';

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const writeJson = (path: string, value: unknown) =>
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function select(opts: {
    dir?: string;
    ids?: string;
    limit?: string;
    force?: boolean;
    full?: boolean;
}) {
    if (!opts.full) throw new Error('select gibt es nur im Vollmodus (select --full).');
    await selectFull(dirOf(opts), opts);
}

async function submit(
    opts: SubmitFullOptions & { dir?: string; scrape: boolean; force?: boolean; full?: boolean },
) {
    if ((opts.chunk || opts.idsFile || opts.selection) && !opts.full)
        throw new Error('--chunk, --ids-file und --selection gibt es nur im Vollmodus (--full).');
    const dir = dirOf(opts);
    const statePath = join(dir, 'state.json');
    if (existsSync(statePath) && !opts.force)
        throw new Error(
            `${statePath} existiert schon (offener Batch?). Erst fetch/apply oder --force.`,
        );
    if (opts.full) {
        if (!opts.scrape)
            throw new Error('--full braucht die Quelle: --no-scrape geht nur im Ablauf-Modus.');
        return submitFull(dir, statePath, opts);
    }

    const recipes = await loadRecipes({
        ids: opts.ids?.split(',').filter(Boolean),
        limit: opts.limit ? Number(opts.limit) : undefined,
    });
    const usable = recipes.filter((r) => r.ingredients.length > 0 && r.flowNodes.length > 0);
    for (const r of recipes) {
        if (r.ingredients.length === 0)
            console.log(`übersprungen (keine Zutaten): ${r.id} ${r.title}`);
        else if (r.flowNodes.length === 0)
            console.log(`übersprungen (kein Ablauf): ${r.id} ${r.title}`);
    }
    if (usable.length === 0)
        throw new Error('Keine Rezepte mit sourceUrl, Zutaten und Ablauf gefunden');

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
        mode: 'flow',
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
    const state = readJson<AnyState>(join(dirOf(opts), 'state.json'));
    const batch = await createOpenAIBatchApi().retrieveBatch(state.batchId);
    console.log(
        JSON.stringify(
            {
                batchId: state.batchId,
                mode: state.mode ?? 'flow',
                ...(isFull(state)
                    ? { attempt: state.attempt, skippedBeforeBatch: state.skipped.length }
                    : {}),
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
    const state = readJson<AnyState>(join(dir, 'state.json'));
    if (isFull(state)) return fetchFull(dir, state);
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
    const cost = batchCostUsd(proposals.map((p) => p.usage));
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

async function apply(opts: {
    dir?: string;
    write?: boolean;
    proposals?: string;
    ids?: string;
    includeReview?: boolean;
    includeMismatch?: boolean;
}) {
    const dir = dirOf(opts);
    const state = readJson<AnyState>(join(dir, 'state.json'));
    if (isFull(state)) return applyFullFromState(dir, state, opts);
    await applyFlow(dir, state, opts);
}

async function repair(opts: { dir?: string }) {
    const dir = dirOf(opts);
    const statePath = join(dir, 'state.json');
    const state = readJson<AnyState>(statePath);
    if (!isFull(state)) throw new Error('repair gibt es nur im Vollmodus (submit --full).');
    await repairFull(dir, statePath, state);
}

async function rollback(file: string, opts: { write?: boolean; applied?: string; all?: boolean }) {
    const raw = readJson<unknown>(file);
    if ((raw as { kind?: unknown }).kind === 'full') return rollbackFull(file, raw, opts);
    const backup = raw as FlowBackup;
    console.log(`${backup.recipes.length} Rezepte in ${file} (Sicherung vom ${backup.createdAt}).`);
    if (!opts.write) {
        console.log('Trockenlauf: nichts geschrieben. Mit --write zurückspielen.');
        return;
    }
    const { restored, failed } = await restoreFlowBackup(backup.recipes, (r) =>
        prisma.recipe.update({
            where: { id: r.id },
            data: {
                flowNodes: r.flowNodes === null ? Prisma.DbNull : (r.flowNodes as object),
                flowEdges: r.flowEdges === null ? Prisma.DbNull : (r.flowEdges as object),
            },
        }),
    );
    console.log(`${restored.length} von ${backup.recipes.length} Abläufen zurückgespielt.`);
    for (const f of failed) console.error(`fehlgeschlagen: ${f.id} — ${f.error}`);
    if (restored.length > 0) await syncSearch(restored);
    if (failed.length > 0) process.exitCode = 1;
}

const program = new Command('refresh-recipe-flows');
const dirOption = [
    '--dir <dir>',
    'Arbeitsverzeichnis für Zustand, Berichte und Sicherungen',
] as const;
program
    .command('select')
    .option(...dirOption)
    .option('--full', 'Vollmodus (nötig): Admin-Importe mit sourceUrl')
    .option('--ids <ids>', 'nur diese Rezept-IDs (Komma-getrennt)')
    .option('--limit <n>', 'höchstens n Rezepte')
    .option('--force', 'vorhandene selection.json überschreiben')
    .action(select);
program
    .command('submit')
    .option(...dirOption)
    .option('--ids <ids>', 'nur diese Rezept-IDs (Komma-getrennt)')
    .option(
        '--ids-file <file>',
        'Vollmodus: IDs aus Datei (selection.json, JSON-Liste oder eine pro Zeile)',
    )
    .option(
        '--chunk <n/m>',
        'Vollmodus: Teil n von m der festgeschriebenen Auswahl (select --full), je Teil ein eigenes --dir',
    )
    .option(
        '--selection <file>',
        'Vollmodus: Auswahl-Datei für --chunk (Standard: selection.json in --dir)',
    )
    .option('--limit <n>', 'höchstens n Rezepte')
    .option('--no-scrape', 'Quelle nicht neu scrapen, nur den gespeicherten Stand verwenden')
    .option('--force', 'vorhandene state.json überschreiben')
    .option(
        '--full',
        'Vollimport: Rezept komplett aus der Quelle neu (Admin-Importe mit sourceUrl)',
    )
    .addHelpText(
        'after',
        `
Jeder Batch hat sein eigenes --dir. status, fetch, repair, apply und das
Fortsetzen eines abgebrochenen apply brauchen dasselbe --dir wie sein submit.`,
    )
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
    .command('repair')
    .option(...dirOption)
    .action(repair);
program
    .command('apply')
    .option(...dirOption)
    .option('--proposals <file>', 'Vorschlagsdatei (Standard: die des Batches aus state.json)')
    .option('--ids <ids>', 'nur diese Rezept-IDs aus den Vorschlägen (Komma-getrennt)')
    .option(
        '--include-review',
        'Vollmodus: auch Rezepte schreiben, deren Titel stark abweicht, die Zutaten aber passen',
    )
    .option(
        '--include-mismatch',
        'Vollmodus: auch Rezepte schreiben, deren Quelle nicht mehr passt',
    )
    .option('--write', 'wirklich schreiben (sonst Trockenlauf)')
    .addHelpText(
        'after',
        `
Lange Läufe in tmux oder im Container mit "docker exec -d" starten, damit ein
geschlossenes Terminal sie nicht beendet. Strg+C, SIGTERM oder SIGHUP beenden
nach dem laufenden Rezept sauber (Suche und Ergebnisdatei folgen noch); ein
zweites Signal bricht sofort ab. Erneut "apply --write" mit demselben --dir
setzt fort.`,
    )
    .action(apply);
program
    .command('rollback <backup>')
    .option(
        '--applied <file>',
        'Vollmodus: Fortschrittsdatei (Standard: applied.jsonl neben der Sicherung)',
    )
    .option('--all', 'Vollmodus: alle Rezepte der Sicherung, auch nicht angewandte')
    .option('--write', 'wirklich zurückspielen (sonst Trockenlauf)')
    .action(rollback);

program
    .parseAsync(process.argv)
    .then(() => process.exit(process.exitCode ?? 0))
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    });
