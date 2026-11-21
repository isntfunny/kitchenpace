/**
 * Full re-import mode of scripts/refresh-recipe-flows.ts (KUC-115): every
 * admin import with a source URL is rebuilt from its source as if imported
 * today; only id, slug and what users added stay. See the command help in
 * the main script.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { AI_TEXT_MODEL } from '../../shared/ai-models';
import {
    BATCH_RUNNING_STATUSES,
    buildBatchJsonl,
    createOpenAIBatchApi,
    parseBatchOutputJsonl,
} from '../../shared/openai-batch';
import { prisma } from '../../shared/prisma';
import {
    buildFullRefreshRequest,
    buildFullRepairRequest,
    checkScrapedSource,
    evaluateFullRefreshEntry,
    fullRefreshWhere,
    isFullBackup,
    mergeRepairProposals,
    repairCandidates,
    writableProposals,
    type FullBackup,
    type FullRefreshProposal,
    type FullRefreshRequest,
    type FullRefreshSkip,
} from '../../src/lib/importer/full-refresh';
import { restoreFullBackupEntry, snapshotRecipes } from '../../src/lib/importer/full-refresh-db';
import {
    applySourceCheck,
    buildFullReport,
    renderFullReportMarkdown,
} from '../../src/lib/importer/full-refresh-report';
import type { ChatRequestBody } from '../../src/lib/importer/import-prompt';
import { fetchImportContext, replaceImportedRecipe } from '../../src/lib/importer/pipeline';
import { scrapeRecipe } from '../../src/lib/importer/scraper';
import { setEnrichmentEnqueuer } from '../../src/lib/ingredients/enqueue-enrichment';
import { setNewIngredientNotifications } from '../../src/lib/ingredients/new-ingredient-notifications';

import {
    cachedIngredientResolver,
    currentSummaries,
    matchProposalIngredients,
} from './full-reimport-db';
import { syncSearch } from './sync-search';

const SCRAPE_CONCURRENCY = 3;

export interface FullState {
    mode: 'full';
    batchId: string;
    inputFileId: string;
    model: string;
    createdAt: string;
    /** 1 = first batch, 2 = repair batch */
    attempt: 1 | 2;
    requests: FullRefreshRequest[];
    /** JSONL with the request bodies (needed for the repair round) */
    requestsFile: string;
    skipped: FullRefreshSkip[];
    /** Proposals of the first round (repair batch only) */
    previousProposals?: string;
}

interface ProposalsFile {
    mode: 'full';
    batchId: string;
    createdAt: string;
    proposals: FullRefreshProposal[];
    skipped: FullRefreshSkip[];
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const writeJson = (path: string, value: unknown) =>
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const splitIds = (ids?: string) =>
    ids
        ?.split(',')
        .map((id) => id.trim())
        .filter(Boolean);

async function uploadBatch(
    dir: string,
    items: { customId: string; body: ChatRequestBody }[],
    purpose: string,
) {
    const jsonl = buildBatchJsonl('/v1/chat/completions', items);
    const requestsFile = join(dir, `requests-full-${stamp()}.jsonl`);
    writeFileSync(requestsFile, jsonl);
    const api = createOpenAIBatchApi();
    const inputFileId = await api.uploadJsonl(jsonl, 'refresh-recipe-full.jsonl');
    const batch = await api.createBatch(inputFileId, '/v1/chat/completions', { purpose });
    return { batchId: batch.id, inputFileId, requestsFile };
}

export async function submitFull(
    dir: string,
    statePath: string,
    opts: { ids?: string; limit?: string },
) {
    const ids = splitIds(opts.ids);
    const recipes = await prisma.recipe.findMany({
        where: fullRefreshWhere({ ids }),
        orderBy: { createdAt: 'asc' },
        ...(opts.limit ? { take: Number(opts.limit) } : {}),
        select: { id: true, title: true, sourceUrl: true },
    });
    if (ids?.length) {
        const found = new Set(recipes.map((r) => r.id));
        for (const id of ids)
            if (!found.has(id))
                console.log(
                    `nicht ausgewählt (fehlt, ohne sourceUrl oder kein Admin-Autor): ${id}`,
                );
    }
    if (recipes.length === 0)
        throw new Error('Keine Rezepte mit sourceUrl von Admin-Autoren gefunden');

    const context = await fetchImportContext(prisma);
    const built: ReturnType<typeof buildFullRefreshRequest>[] = [];
    const skipped: FullRefreshSkip[] = [];
    for (let i = 0; i < recipes.length; i += SCRAPE_CONCURRENCY) {
        const chunk = recipes.slice(i, i + SCRAPE_CONCURRENCY);
        await Promise.all(
            chunk.map(async (recipe) => {
                const sourceUrl = recipe.sourceUrl!;
                let reason: string | null;
                try {
                    const scraped = await scrapeRecipe(sourceUrl);
                    reason = checkScrapedSource(scraped.markdown);
                    if (!reason)
                        built.push(
                            buildFullRefreshRequest(
                                { id: recipe.id, title: recipe.title, sourceUrl },
                                scraped,
                                context,
                            ),
                        );
                } catch (error) {
                    reason = error instanceof Error ? error.message : String(error);
                }
                if (reason)
                    skipped.push({ recipeId: recipe.id, title: recipe.title, sourceUrl, reason });
                console.log(
                    `${reason ? 'übersprungen' : 'gescrapt   '} ${recipe.id} ${recipe.title}${reason ? ` — ${reason}` : ''}`,
                );
            }),
        );
    }
    if (built.length === 0) {
        writeJson(join(dir, `skipped-full-${stamp()}.json`), skipped);
        throw new Error('Keine Quelle ließ sich scrapen, kein Batch angelegt');
    }

    const upload = await uploadBatch(
        dir,
        built.map((b) => ({ customId: b.request.customId, body: b.body })),
        'KUC-115 full re-import',
    );
    const state: FullState = {
        mode: 'full',
        ...upload,
        model: AI_TEXT_MODEL,
        createdAt: new Date().toISOString(),
        attempt: 1,
        requests: built.map((b) => b.request),
        skipped,
    };
    writeJson(statePath, state);
    console.log(
        `Batch ${upload.batchId} angelegt (Vollimport): ${built.length} Rezepte, ${skipped.length} übersprungen (Quelle nicht nutzbar). Zustand: ${statePath}`,
    );
}

const proposalsPathOf = (dir: string, batchId: string) => join(dir, `proposals-${batchId}.json`);

/** Second batch, at most once: invalid answers with their problems, failed or missing ones unchanged. */
export async function repairFull(dir: string, statePath: string, state: FullState) {
    if (state.attempt !== 1) throw new Error('Die Korrekturrunde lief schon (nur eine Runde).');
    const proposalsPath = proposalsPathOf(dir, state.batchId);
    if (!existsSync(proposalsPath))
        throw new Error(`Erst fetch ausführen (${proposalsPath} fehlt).`);
    const { proposals } = readJson<ProposalsFile>(proposalsPath);
    const candidates = repairCandidates(proposals);
    if (candidates.length === 0) {
        console.log(
            'Keine ungültigen oder fehlgeschlagenen Antworten, keine Korrekturrunde nötig.',
        );
        return;
    }

    const bodies = new Map<string, ChatRequestBody>();
    for (const line of readFileSync(state.requestsFile, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line) as { custom_id: string; body: ChatRequestBody };
        bodies.set(parsed.custom_id, parsed.body);
    }
    const requests = new Map(state.requests.map((r) => [r.recipeId, r]));
    const built = candidates.map((proposal) => {
        const request = requests.get(proposal.recipeId)!;
        const body = bodies.get(request.customId);
        if (!body)
            throw new Error(`Request-Body für ${request.customId} fehlt in ${state.requestsFile}`);
        return buildFullRepairRequest(request, body, proposal);
    });

    const upload = await uploadBatch(
        dir,
        built.map((b) => ({ customId: b.request.customId, body: b.body })),
        'KUC-115 full re-import (repair)',
    );
    renameSync(statePath, join(dir, `state-${state.batchId}.json`));
    const next: FullState = {
        mode: 'full',
        ...upload,
        model: state.model,
        createdAt: new Date().toISOString(),
        attempt: 2,
        requests: built.map((b) => b.request),
        skipped: state.skipped,
        previousProposals: proposalsPath,
    };
    writeJson(statePath, next);
    console.log(
        `Korrektur-Batch ${upload.batchId} angelegt: ${built.length} Rezepte. Zustand: ${statePath}`,
    );
}

export async function fetchFull(dir: string, state: FullState) {
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
    writeFileSync(join(dir, `output-${state.batchId}.jsonl`), text);
    const entries = new Map(parseBatchOutputJsonl(text).map((e) => [e.customId, e]));
    const evaluated = state.requests.map((request) =>
        evaluateFullRefreshEntry(request, entries.get(request.customId)),
    );
    const merged = state.previousProposals
        ? mergeRepairProposals(
              readJson<ProposalsFile>(state.previousProposals).proposals,
              evaluated,
          )
        : evaluated;

    // Is the source still the same recipe? Old title and catalogue ingredients
    // against the new ones (catalogue lookup only, nothing is created).
    const current = await currentSummaries([
        ...merged.map((p) => p.recipeId),
        ...state.skipped.map((s) => s.recipeId),
    ]);
    const matches = await matchProposalIngredients(
        merged.filter((p) => p.status === 'ready' || p.status === 'mismatch'),
    );
    const proposals = applySourceCheck(merged, current, matches.ids);

    const proposalsPath = proposalsPathOf(dir, state.batchId);
    const file: ProposalsFile = {
        mode: 'full',
        batchId: state.batchId,
        createdAt: new Date().toISOString(),
        proposals,
        skipped: state.skipped,
    };
    writeJson(proposalsPath, file);

    const report = buildFullReport({
        batchId: state.batchId,
        proposals,
        skipped: state.skipped,
        current,
        newIngredients: matches.newNames,
    });
    const markdown = renderFullReportMarkdown(report);
    writeJson(join(dir, `report-${state.batchId}.json`), report);
    writeFileSync(join(dir, `report-${state.batchId}.md`), markdown);
    console.log(markdown.split('\n').slice(0, 5).join('\n'));
    if (report.summary.mismatch > 0)
        console.log(
            `${report.summary.mismatch} Rezepte mit unpassender Quelle: siehe Abschnitt im Bericht; apply schreibt sie nur mit --include-mismatch oder --ids.`,
        );
    console.log(
        `Vorschläge: ${proposalsPath}\nBericht: ${join(dir, `report-${state.batchId}.md`)} (+ .json)`,
    );
    if (state.attempt === 1 && report.summary.repairable > 0)
        console.log(
            `${report.summary.repairable} ungültige oder fehlgeschlagene Antworten: mit "repair" einmal erneut senden.`,
        );
}

export async function applyFull(
    dir: string,
    state: FullState,
    opts: { write?: boolean; proposals?: string; ids?: string; includeMismatch?: boolean },
) {
    const proposalsPath = opts.proposals ?? proposalsPathOf(dir, state.batchId);
    const { proposals } = readJson<ProposalsFile>(proposalsPath);
    const ready = writableProposals(proposals, {
        ids: splitIds(opts.ids),
        includeMismatch: opts.includeMismatch,
    });
    const held = proposals.filter((p) => p.status === 'mismatch' && !ready.includes(p));
    if (held.length)
        console.log(
            `${held.length} Rezepte mit unpassender Quelle zurückgehalten (--include-mismatch oder --ids).`,
        );

    const recipes = await prisma.recipe.findMany({
        where: { id: { in: ready.map((p) => p.recipeId) } },
        select: { id: true, _count: { select: { stepImages: true } } },
    });
    const byId = new Map(recipes.map((r) => [r.id, r]));
    const todo: FullRefreshProposal[] = [];
    for (const p of ready) {
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
    const startedAt = new Date();
    const backup: FullBackup = {
        kind: 'full',
        createdAt: startedAt.toISOString(),
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
    for (const [index, p] of todo.entries()) {
        try {
            const result = await replaceImportedRecipe(prisma, p.recipeId, p.recipe!, {
                resolveIngredient,
            });
            applied.push(p.recipeId);
            if (result.warnings.length)
                warnings.push({ id: p.recipeId, warnings: result.warnings });
            console.log(
                `[${index + 1}/${todo.length}] neu importiert: ${p.recipeId} ${p.recipe!.title}${result.imageAdded ? ' (+ Bild)' : ''}`,
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            failed.push({ id: p.recipeId, error: message });
            console.error(
                `[${index + 1}/${todo.length}] fehlgeschlagen: ${p.recipeId} — ${message}`,
            );
        }
    }
    const createdIngredients = await prisma.ingredient.findMany({
        where: { id: { in: [...created] } },
        select: { id: true, name: true },
    });
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
    if (failed.length > 0) process.exitCode = 1;
}

export async function rollbackFull(file: string, backup: unknown, opts: { write?: boolean }) {
    if (!isFullBackup(backup)) throw new Error(`${file} ist keine Vollsicherung`);
    console.log(
        `${backup.recipes.length} Rezepte in ${file} (Vollsicherung vom ${backup.createdAt}).`,
    );
    if (!opts.write) {
        console.log('Trockenlauf: nichts geschrieben. Mit --write zurückspielen.');
        return;
    }
    const restored: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const entry of backup.recipes) {
        try {
            await restoreFullBackupEntry(prisma, entry);
            restored.push(entry.id);
        } catch (error) {
            failed.push({
                id: entry.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    console.log(`${restored.length} von ${backup.recipes.length} Rezepten zurückgespielt.`);
    for (const f of failed) console.error(`fehlgeschlagen: ${f.id} — ${f.error}`);
    if (restored.length > 0) await syncSearch(restored);
    if (failed.length > 0) process.exitCode = 1;
}
