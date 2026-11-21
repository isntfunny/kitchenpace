// backfill-ingredient-shelf-life (KUC-94, KUC-114): estimates shelf life, pack
// size and the normalized name for ingredients via the OpenAI Batch API.
//
// One run does one step and re-enqueues itself to poll:
//   no pending batch  → select ingredients, upload JSONL, create batch, save id
//   batch running     → poll again later
//   batch completed   → import with the shared rules; entries without a valid
//                       result are submitted again, one ingredient per request
// Without `write` the result is only reported (dry run) and the batch stays
// saved, so a later run with `write: true` imports it without paying again.

import type { PrismaClient } from '@prisma/client';
import type { Job } from 'bullmq';
import type OpenAI from 'openai';

import { AI_TEXT_MODEL } from '@shared/ai-models';
import {
    extractRawItems,
    importShelfLifeResults,
    validateShelfLifeItems,
    type ShelfLifeImportReport,
} from '@shared/ingredient-shelf-life/import';
import { SHELF_LIFE_PROMPT, SHELF_LIFE_PROMPT_VERSION } from '@shared/ingredient-shelf-life/prompt';
import {
    buildShelfLifeInput,
    getShelfLifeResponseFormat,
} from '@shared/ingredient-shelf-life/schema';
import {
    buildBatchJsonl,
    createOpenAIBatchApi,
    parseBatchOutputJsonl,
    responsesOutputText,
} from '@shared/openai-batch';

import {
    checkBatch,
    redisBatchStore,
    schedulePollIfDue,
    withBatchLock,
    type BatchStateStore,
    type SavedBatch,
} from './batch-job';
import { prisma as workerPrisma } from './prisma';
import { getScheduledQueue } from './queue';
import type { BackfillIngredientShelfLifeJob } from './types';

// Model chosen for this batch in KUC-94 (probe runs with prompt v6e).
const SHELF_LIFE_MODEL = AI_TEXT_MODEL;

export const SHELF_LIFE_JOB_NAME = 'backfill-ingredient-shelf-life';
const STORE_NAME = 'shelf-life';
/** Rounds of single-ingredient retries after the first batch */
const MAX_RETRY_ROUNDS = 2;

// ── State ───────────────────────────────────────────────────────────────

export interface ShelfLifeBatchState extends SavedBatch {
    model: string;
    promptVersion: string;
    /** custom_id → ingredient ids of that request */
    requests: Record<string, string[]>;
    /** Set once a dry run reported this batch */
    dryRunReportedAt?: string;
}

export interface ShelfLifeBatchApi {
    uploadJsonl(content: string, filename: string): Promise<string>;
    createBatch(inputFileId: string, metadata: Record<string, string>): Promise<{ id: string }>;
    retrieveBatch(batchId: string): Promise<{
        status: string;
        output_file_id?: string | null;
        error_file_id?: string | null;
        request_counts?: { total: number; completed: number; failed: number } | null;
    }>;
    fileText(fileId: string): Promise<string>;
}

export type ShelfLifeStateStore = BatchStateStore<ShelfLifeBatchState>;

export interface ShelfLifeDeps {
    prisma: PrismaClient;
    api: ShelfLifeBatchApi;
    store: ShelfLifeStateStore;
    schedulePoll(delayMs: number, data: BackfillIngredientShelfLifeJob): Promise<void>;
    now?: () => Date;
}

// ── Pure helpers ────────────────────────────────────────────────────────

export function buildBatchRequests(
    ingredients: Array<{ id: string; name: string }>,
    chunkSize: number,
    round: number,
): { jsonl: string; requests: Record<string, string[]> } {
    const size = Math.max(1, chunkSize);
    const lines: { customId: string; body: unknown }[] = [];
    const requests: Record<string, string[]> = {};
    for (let offset = 0, index = 0; offset < ingredients.length; offset += size, index += 1) {
        const chunk = ingredients.slice(offset, offset + size);
        const customId = `shelf-life-r${round}-${index}`;
        requests[customId] = chunk.map((ingredient) => ingredient.id);
        lines.push({
            customId,
            body: {
                model: SHELF_LIFE_MODEL,
                instructions: SHELF_LIFE_PROMPT,
                input: buildShelfLifeInput(chunk),
                text: { format: getShelfLifeResponseFormat() },
            },
        });
    }
    return { jsonl: buildBatchJsonl('/v1/responses', lines), requests };
}

/**
 * Collects the result items of all successful requests. Requests that failed,
 * are missing or returned unparseable JSON are listed by custom_id.
 */
export function parseBatchOutput(
    outputJsonl: string,
    requests: Record<string, string[]>,
): { rawItems: unknown[]; failedRequests: string[] } {
    const rawItems: unknown[] = [];
    const succeeded = new Set<string>();

    for (const entry of parseBatchOutputJsonl(outputJsonl)) {
        if (!(entry.customId in requests) || entry.body === undefined) continue;
        try {
            rawItems.push(...extractRawItems(JSON.parse(responsesOutputText(entry.body))));
            succeeded.add(entry.customId);
        } catch {
            // counted as failed below
        }
    }

    return {
        rawItems,
        failedRequests: Object.keys(requests).filter((customId) => !succeeded.has(customId)),
    };
}

/**
 * Requested ingredients that still have no imported result: no valid entry in
 * the output, or the write failed. Deleted ingredients are not retried.
 */
export function missingAfterImport(
    requests: Record<string, string[]>,
    validIds: ReadonlySet<string>,
    report: Pick<ShelfLifeImportReport, 'notFound' | 'failed'>,
): string[] {
    const failed = new Set(report.failed.map((entry) => entry.id));
    const deleted = new Set(report.notFound);
    return Object.values(requests)
        .flat()
        .filter((id) => !deleted.has(id) && (failed.has(id) || !validIds.has(id)));
}

// ── Ingredient selection ────────────────────────────────────────────────

/**
 * Whether shelf life or display name still have to be estimated: not assessed
 * yet, or assessed (also MANUAL) but without a display name.
 */
export function needsShelfLifeEnrichment(row: {
    shelfLifeSource: string | null;
    normalizedName: string | null;
    normalizedNameManual: boolean;
}): boolean {
    const hasName = Boolean(row.normalizedName?.trim()) || row.normalizedNameManual;
    return !row.shelfLifeSource || !hasName;
}

/** Not assessed yet: used in recipes first, then the rest. */
export async function selectIngredientsForShelfLife(
    prisma: PrismaClient,
    limit: number,
): Promise<Array<{ id: string; name: string }>> {
    const rows = await prisma.ingredient.findMany({
        where: { shelfLifeSource: null },
        select: { id: true, name: true, _count: { select: { recipes: true } } },
        orderBy: { name: 'asc' },
    });
    const used = rows.filter((row) => row._count.recipes > 0);
    const unused = rows.filter((row) => row._count.recipes === 0);
    const ordered = [...used, ...unused].map(({ id, name }) => ({ id, name }));
    return limit > 0 ? ordered.slice(0, limit) : ordered;
}

// ── Import of a finished batch ──────────────────────────────────────────

/**
 * Imports the shelf-life answers of a finished batch with the shared rules.
 * `missing` lists requested ingredients that still have no imported result
 * and should be asked again (one per request). Also used by the daily
 * ingredient enrichment batch (enrichment-backfill.ts).
 */
export async function importShelfLifeBatchOutput(
    prisma: PrismaClient,
    outputJsonl: string,
    requests: Record<string, string[]>,
    write: boolean,
) {
    const { rawItems, failedRequests } = parseBatchOutput(outputJsonl, requests);
    const requestedIds = new Set(Object.values(requests).flat());
    // Ignore ids the model invented; the requested ingredient is retried instead.
    const relevantItems = rawItems.filter(
        (item) =>
            item &&
            typeof item === 'object' &&
            requestedIds.has((item as { id?: unknown }).id as string),
    );
    const report = await importShelfLifeResults(prisma, relevantItems, { write });
    const validIds = new Set(validateShelfLifeItems(relevantItems).items.map((item) => item.id));
    const missing = missingAfterImport(requests, validIds, report);
    return {
        missing,
        summary: {
            failedRequests: failedRequests.length,
            unknownIds: rawItems.length - relevantItems.length,
            updated: report.updated,
            unchanged: report.unchanged,
            invalid: report.invalid.length,
            manualKept: report.manualKept.length,
            notApplicable: report.notApplicable,
            lowConfidence: report.lowConfidence.length,
            writeErrors: report.failed.length,
            withoutResult: missing.length,
        },
    };
}

// ── Steps ───────────────────────────────────────────────────────────────

const DEFAULTS = { write: false, limit: 0, chunkSize: 50, pollMinutes: 10, reset: false };

async function submit(
    deps: ShelfLifeDeps,
    ingredients: Array<{ id: string; name: string }>,
    chunkSize: number,
    round: number,
) {
    const { jsonl, requests } = buildBatchRequests(ingredients, chunkSize, round);
    const inputFileId = await deps.api.uploadJsonl(jsonl, `shelf-life-r${round}.jsonl`);
    const batch = await deps.api.createBatch(inputFileId, {
        purpose: 'KUC-94 shelf life',
        round: String(round),
    });
    const state: ShelfLifeBatchState = {
        batchId: batch.id,
        inputFileId,
        model: SHELF_LIFE_MODEL,
        promptVersion: SHELF_LIFE_PROMPT_VERSION,
        createdAt: (deps.now?.() ?? new Date()).toISOString(),
        round,
        requests,
    };
    await deps.store.set(state);
    return state;
}

export async function runShelfLifeBackfill(
    deps: ShelfLifeDeps,
    data: BackfillIngredientShelfLifeJob,
): Promise<Record<string, unknown>> {
    const options = { ...DEFAULTS, ...data };
    const pollDelay = options.pollMinutes * 60_000;
    const schedule = () => deps.schedulePoll(pollDelay, data);
    const scheduleFirstPoll = (created: ShelfLifeBatchState) =>
        schedulePollIfDue(deps.store, created, pollDelay, deps.now?.() ?? new Date(), schedule);

    if (options.reset) {
        await deps.store.clear();
    }

    const state = await deps.store.get();

    if (!state) {
        const ingredients = await selectIngredientsForShelfLife(deps.prisma, options.limit);
        if (ingredients.length === 0) return { step: 'idle', message: 'Alle Zutaten bewertet' };
        const created = await submit(deps, ingredients, options.chunkSize, 0);
        await scheduleFirstPoll(created);
        return {
            step: 'submitted',
            batchId: created.batchId,
            ingredients: ingredients.length,
            requests: Object.keys(created.requests).length,
            model: SHELF_LIFE_MODEL,
        };
    }

    const now = deps.now?.() ?? new Date();
    const check = await checkBatch(deps.api, deps.store, state.batchId);
    const base = { batchId: state.batchId, round: state.round, status: check.status };

    if (check.kind === 'running') {
        await schedulePollIfDue(deps.store, state, pollDelay, now, schedule);
        return { step: 'waiting', ...base, requestCounts: check.requestCounts };
    }

    const { summary: imported, missing } = await importShelfLifeBatchOutput(
        deps.prisma,
        check.outputJsonl,
        state.requests,
        options.write,
    );
    const summary = { ...base, write: options.write, ...imported };

    if (!options.write) {
        await deps.store.set({ ...state, dryRunReportedAt: now.toISOString() });
        return { step: 'dry-run', ...summary, missingIds: missing.slice(0, 50) };
    }

    await deps.store.clear();
    if (missing.length > 0 && state.round < MAX_RETRY_ROUNDS) {
        const rows = await deps.prisma.ingredient.findMany({
            where: { id: { in: missing }, shelfLifeSource: null },
            select: { id: true, name: true },
        });
        if (rows.length > 0) {
            const retry = await submit(deps, rows, 1, state.round + 1);
            await scheduleFirstPoll(retry);
            return {
                step: 'imported',
                ...summary,
                retryBatchId: retry.batchId,
                retried: rows.length,
            };
        }
    }
    return { step: 'imported', ...summary, missingIds: missing.slice(0, 50) };
}

// ── Single ingredient (enrich-ingredient-nutrition) ─────────────────────

export interface ShelfLifeEnrichment {
    status: 'skipped' | 'updated' | 'unchanged' | 'invalid' | 'error';
    detail?: string;
}

/**
 * Same model, prompt, schema and import rules as the batch, as a direct request
 * for one new ingredient. Skips assessed ingredients (any shelfLifeSource,
 * including MANUAL) that already have a display name. If only the name is
 * missing, the request runs and the import rules keep MANUAL shelf life as is.
 * Errors are reported, not thrown, so the caller's other results stay.
 */
export async function enrichIngredientShelfLife(
    prisma: PrismaClient,
    client: OpenAI,
    ingredientId: string,
    name: string,
): Promise<ShelfLifeEnrichment> {
    const current = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
        select: { shelfLifeSource: true, normalizedName: true, normalizedNameManual: true },
    });
    if (!current || !needsShelfLifeEnrichment(current)) return { status: 'skipped' };

    try {
        const response = await client.responses.create({
            model: SHELF_LIFE_MODEL,
            instructions: SHELF_LIFE_PROMPT,
            input: buildShelfLifeInput([{ id: ingredientId, name }]),
            text: { format: getShelfLifeResponseFormat() },
        });
        const items = extractRawItems(JSON.parse(responsesOutputText(response))).filter(
            (item) => (item as { id?: unknown } | null)?.id === ingredientId,
        );
        if (items.length === 0) return { status: 'invalid', detail: 'kein Eintrag für die Zutat' };
        const report = await importShelfLifeResults(prisma, items, { write: true });
        if (report.invalid.length > 0) {
            return { status: 'invalid', detail: report.invalid[0].errors.join('; ') };
        }
        if (report.failed.length > 0) return { status: 'error', detail: report.failed[0].error };
        return { status: report.updated > 0 ? 'updated' : 'unchanged' };
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`[ShelfLife] "${name}" failed: ${detail}`);
        return { status: 'error', detail };
    }
}

// ── Real dependencies ───────────────────────────────────────────────────

function openAiBatchApi(): ShelfLifeBatchApi {
    const api = createOpenAIBatchApi();
    return {
        uploadJsonl: api.uploadJsonl,
        createBatch: (inputFileId, metadata) =>
            api.createBatch(inputFileId, '/v1/responses', metadata),
        retrieveBatch: api.retrieveBatch,
        fileText: api.fileText,
    };
}

export async function processBackfillIngredientShelfLife(
    job: Job<BackfillIngredientShelfLifeJob>,
): Promise<Record<string, unknown>> {
    const store = redisBatchStore<ShelfLifeBatchState>(STORE_NAME);
    return withBatchLock(store, async () => {
        const result = await runShelfLifeBackfill(
            {
                prisma: workerPrisma,
                api: openAiBatchApi(),
                store,
                schedulePoll: async (delay, data) => {
                    // Poll jobs never reset the saved batch
                    await getScheduledQueue().add(
                        SHELF_LIFE_JOB_NAME,
                        { ...data, reset: false },
                        { delay },
                    );
                },
            },
            job.data,
        );
        console.log(`[ShelfLifeBackfill] ${JSON.stringify(result)}`);
        return result;
    });
}
