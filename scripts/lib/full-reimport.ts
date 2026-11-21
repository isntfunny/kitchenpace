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
    buildBatchJsonl,
    createOpenAIBatchApi,
    parseBatchOutputJsonl,
} from '../../shared/openai-batch';
import { prisma } from '../../shared/prisma';
import {
    batchNotEvaluable,
    buildFullRefreshRequest,
    buildFullRepairRequest,
    checkScrapedSource,
    evaluateFullRefreshEntry,
    fullRefreshWhere,
    mergeRepairProposals,
    repairCandidates,
    type FullRefreshProposal,
    type FullRefreshRequest,
    type FullRefreshSkip,
} from '../../src/lib/importer/full-refresh';
import {
    applySourceCheck,
    buildFullReport,
    renderFullReportMarkdown,
} from '../../src/lib/importer/full-refresh-report';
import {
    chunkIds,
    isFullSelection,
    parseChunk,
    parseIdsFile,
    type FullSelection,
} from '../../src/lib/importer/full-refresh-selection';
import type { ChatRequestBody } from '../../src/lib/importer/import-prompt';
import { fetchImportContext } from '../../src/lib/importer/pipeline';
import { scrapeRecipe } from '../../src/lib/importer/scraper';

import { applyFull } from './full-reimport-apply';
import { currentSummaries, matchProposalIngredients } from './full-reimport-db';

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

export interface SubmitFullOptions {
    ids?: string;
    limit?: string;
    chunk?: string;
    idsFile?: string;
    selection?: string;
}

// stable order, so a selection reads the same every time
const SELECTION_ORDER = [{ createdAt: 'asc' as const }, { id: 'asc' as const }];

/** `select --full`: writes the selection once, so submit --chunk parts cannot shift. */
export async function selectFull(
    dir: string,
    opts: { ids?: string; limit?: string; force?: boolean },
) {
    const path = join(dir, 'selection.json');
    if (existsSync(path) && !opts.force)
        throw new Error(`${path} existiert schon. Mit --force neu festschreiben.`);
    const recipes = await prisma.recipe.findMany({
        where: fullRefreshWhere({ ids: splitIds(opts.ids) }),
        orderBy: SELECTION_ORDER,
        ...(opts.limit ? { take: Number(opts.limit) } : {}),
        select: { id: true, title: true, sourceUrl: true },
    });
    if (recipes.length === 0)
        throw new Error('Keine Rezepte mit sourceUrl von Admin-Autoren gefunden');
    const selection: FullSelection = {
        kind: 'full-selection',
        createdAt: new Date().toISOString(),
        ids: recipes.map((r) => r.id),
        recipes: recipes.map((r) => ({ id: r.id, title: r.title, sourceUrl: r.sourceUrl! })),
    };
    writeJson(path, selection);
    console.log(
        `Auswahl festgeschrieben: ${recipes.length} Rezepte in ${path}.\nAufteilen z. B.: submit --full --selection=${path} --chunk=1/3 --dir=${join(dir, 'teil-1')}`,
    );
}

/** The ids submit works on: a part of the fixed selection, an ids file, --ids, or none (all). */
function chosenIds(dir: string, opts: SubmitFullOptions): string[] | undefined {
    const given = [opts.ids, opts.idsFile, opts.chunk].filter(Boolean).length;
    if (given > 1) throw new Error('--ids, --ids-file und --chunk schließen sich gegenseitig aus.');
    if (opts.chunk) {
        const path = opts.selection ?? join(dir, 'selection.json');
        if (!existsSync(path))
            throw new Error(
                `--chunk braucht die festgeschriebene Auswahl: ${path} fehlt (erst "select --full", sonst --selection=<datei>).`,
            );
        const selection = readJson<unknown>(path);
        if (!isFullSelection(selection)) throw new Error(`${path} ist keine Auswahl-Datei.`);
        const chunk = parseChunk(opts.chunk);
        const ids = chunkIds(selection.ids, chunk);
        console.log(
            `Teil ${chunk.index}/${chunk.total} der Auswahl ${path}: ${ids.length} von ${selection.ids.length} Rezepten.`,
        );
        return ids;
    }
    if (opts.idsFile) return parseIdsFile(readFileSync(opts.idsFile, 'utf8'));
    return splitIds(opts.ids);
}

export async function submitFull(dir: string, statePath: string, opts: SubmitFullOptions) {
    const ids = chosenIds(dir, opts);
    if (ids && ids.length === 0) throw new Error('Keine Rezept-IDs ausgewählt.');
    const found = await prisma.recipe.findMany({
        where: fullRefreshWhere({ ids }),
        orderBy: SELECTION_ORDER,
        select: { id: true, title: true, sourceUrl: true },
    });
    // given ids keep their order (the selection's), --limit cuts after that
    const byId = new Map(found.map((r) => [r.id, r]));
    const ordered = ids ? ids.flatMap((id) => byId.get(id) ?? []) : found;
    const recipes = opts.limit ? ordered.slice(0, Number(opts.limit)) : ordered;
    if (ids?.length) {
        for (const id of ids)
            if (!byId.has(id))
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
    const problem = batchNotEvaluable(batch);
    if (problem) throw new Error(`Batch ${state.batchId}: ${problem}`);
    if (batch.status !== 'completed')
        console.log(
            `Batch ${state.batchId} endete mit ${batch.status}: vorhandene Antworten werden ausgewertet, fehlende gelten als fehlgeschlagen ("repair" sendet sie erneut).`,
        );

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
    // (without basic ones) against the new ones (catalogue lookup only,
    // nothing is created).
    const current = await currentSummaries([
        ...merged.map((p) => p.recipeId),
        ...state.skipped.map((s) => s.recipeId),
    ]);
    const matches = await matchProposalIngredients(merged.filter((p) => p.recipe !== undefined));
    const proposals = applySourceCheck(merged, current, matches.refs);

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
    if (report.summary.review + report.summary.mismatch > 0)
        console.log(
            `${report.summary.review} zu prüfen, ${report.summary.mismatch} mit unpassender Quelle: siehe Abschnitt "Quelle prüfen" im Bericht; apply schreibt sie nur mit --include-review / --include-mismatch oder --ids.`,
        );
    console.log(
        `Vorschläge: ${proposalsPath}\nBericht: ${join(dir, `report-${state.batchId}.md`)} (+ .json)`,
    );
    if (state.attempt === 1 && report.summary.repairable > 0)
        console.log(
            `${report.summary.repairable} ungültige oder fehlgeschlagene Antworten: mit "repair" einmal erneut senden.`,
        );
}

export async function applyFullFromState(
    dir: string,
    state: FullState,
    opts: {
        write?: boolean;
        proposals?: string;
        ids?: string;
        includeReview?: boolean;
        includeMismatch?: boolean;
    },
) {
    const proposalsPath = opts.proposals ?? proposalsPathOf(dir, state.batchId);
    const { proposals } = readJson<ProposalsFile>(proposalsPath);
    await applyFull(dir, proposals, {
        write: opts.write,
        ids: splitIds(opts.ids),
        includeReview: opts.includeReview,
        includeMismatch: opts.includeMismatch,
    });
}
