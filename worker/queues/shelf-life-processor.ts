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
import OpenAI, { toFile } from 'openai';

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

import { getRedis } from './connection';
import { prisma as workerPrisma } from './prisma';
import { getScheduledQueue } from './queue';
import type { BackfillIngredientShelfLifeJob } from './types';

// Model chosen for this batch in KUC-94 (probe runs with prompt v6e).
const SHELF_LIFE_MODEL = 'gpt-6.2-sol';

export const SHELF_LIFE_JOB_NAME = 'backfill-ingredient-shelf-life';
const STATE_KEY = 'shelf-life:batch';
const LOCK_KEY = 'shelf-life:lock';
const LOCK_SECONDS = 600;
/** Rounds of single-ingredient retries after the first batch */
const MAX_RETRY_ROUNDS = 2;

// ── State ───────────────────────────────────────────────────────────────

export interface ShelfLifeBatchState {
    batchId: string;
    inputFileId: string;
    model: string;
    promptVersion: string;
    createdAt: string;
    /** 0 = first batch, 1.. = single-ingredient retry rounds */
    round: number;
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

export interface ShelfLifeStateStore {
    get(): Promise<ShelfLifeBatchState | null>;
    set(state: ShelfLifeBatchState): Promise<void>;
    clear(): Promise<void>;
    lock(): Promise<boolean>;
    unlock(): Promise<void>;
}

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
    const lines: string[] = [];
    const requests: Record<string, string[]> = {};
    for (let offset = 0, index = 0; offset < ingredients.length; offset += size, index += 1) {
        const chunk = ingredients.slice(offset, offset + size);
        const customId = `shelf-life-r${round}-${index}`;
        requests[customId] = chunk.map((ingredient) => ingredient.id);
        lines.push(
            JSON.stringify({
                custom_id: customId,
                method: 'POST',
                url: '/v1/responses',
                body: {
                    model: SHELF_LIFE_MODEL,
                    instructions: SHELF_LIFE_PROMPT,
                    input: buildShelfLifeInput(chunk),
                    text: { format: getShelfLifeResponseFormat() },
                },
            }),
        );
    }
    return { jsonl: lines.length > 0 ? `${lines.join('\n')}\n` : '', requests };
}

interface ResponseBody {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}

const outputText = (body: ResponseBody) =>
    (body.output ?? [])
        .flatMap((entry) => entry.content ?? [])
        .filter((content) => content.type === 'output_text')
        .map((content) => content.text ?? '')
        .join('');

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

    for (const line of outputJsonl.split('\n')) {
        if (!line.trim()) continue;
        let entry: {
            custom_id?: string;
            error?: unknown;
            response?: { status_code?: number; body?: ResponseBody };
        };
        try {
            entry = JSON.parse(line);
        } catch {
            continue;
        }
        const customId = entry.custom_id;
        if (!customId || !(customId in requests)) continue;
        if (entry.error || entry.response?.status_code !== 200 || !entry.response.body) continue;
        try {
            rawItems.push(...extractRawItems(JSON.parse(outputText(entry.response.body))));
            succeeded.add(customId);
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
    const schedule = async () => {
        if (options.pollMinutes > 0) await deps.schedulePoll(pollDelay, data);
    };

    if (options.reset) {
        await deps.store.clear();
    }

    const state = await deps.store.get();

    if (!state) {
        const ingredients = await selectIngredientsForShelfLife(deps.prisma, options.limit);
        if (ingredients.length === 0) return { step: 'idle', message: 'Alle Zutaten bewertet' };
        const created = await submit(deps, ingredients, options.chunkSize, 0);
        await schedule();
        return {
            step: 'submitted',
            batchId: created.batchId,
            ingredients: ingredients.length,
            requests: Object.keys(created.requests).length,
            model: SHELF_LIFE_MODEL,
        };
    }

    const batch = await deps.api.retrieveBatch(state.batchId);
    const base = { batchId: state.batchId, round: state.round, status: batch.status };

    if (['validating', 'in_progress', 'finalizing', 'cancelling'].includes(batch.status)) {
        await schedule();
        return { step: 'waiting', ...base, requestCounts: batch.request_counts ?? null };
    }
    if (batch.status !== 'completed') {
        // failed, expired or cancelled: forget it so the next run starts over
        await deps.store.clear();
        throw new Error(`Batch ${state.batchId} endete mit Status ${batch.status}`);
    }

    const outputJsonl = batch.output_file_id ? await deps.api.fileText(batch.output_file_id) : '';
    const { rawItems, failedRequests } = parseBatchOutput(outputJsonl, state.requests);
    const requestedIds = new Set(Object.values(state.requests).flat());
    // Ignore ids the model invented; the requested ingredient is retried instead.
    const relevantItems = rawItems.filter(
        (item) =>
            item &&
            typeof item === 'object' &&
            requestedIds.has((item as { id?: unknown }).id as string),
    );
    const unknownIds = rawItems.length - relevantItems.length;

    const report = await importShelfLifeResults(deps.prisma, relevantItems, {
        write: options.write,
    });
    const validIds = new Set(validateShelfLifeItems(relevantItems).items.map((item) => item.id));
    const missing = missingAfterImport(state.requests, validIds, report);
    const summary = {
        ...base,
        write: options.write,
        failedRequests: failedRequests.length,
        unknownIds,
        updated: report.updated,
        unchanged: report.unchanged,
        invalid: report.invalid.length,
        manualKept: report.manualKept.length,
        notApplicable: report.notApplicable,
        lowConfidence: report.lowConfidence.length,
        writeErrors: report.failed.length,
        withoutResult: missing.length,
    };

    if (!options.write) {
        await deps.store.set({
            ...state,
            dryRunReportedAt: (deps.now?.() ?? new Date()).toISOString(),
        });
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
            await schedule();
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
 * Same prompt, schema and import rules as the batch, as a direct request for
 * one new ingredient. Only runs while the ingredient is not assessed yet;
 * errors are reported, not thrown, so the caller's other results stay.
 */
export async function enrichIngredientShelfLife(
    prisma: PrismaClient,
    client: OpenAI,
    model: string,
    ingredientId: string,
    name: string,
): Promise<ShelfLifeEnrichment> {
    const current = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
        select: { shelfLifeSource: true },
    });
    if (!current || current.shelfLifeSource) return { status: 'skipped' };

    try {
        const response = await client.responses.create({
            model,
            instructions: SHELF_LIFE_PROMPT,
            input: buildShelfLifeInput([{ id: ingredientId, name }]),
            text: { format: getShelfLifeResponseFormat() },
        });
        const items = extractRawItems(JSON.parse(outputText(response as ResponseBody))).filter(
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    const client = new OpenAI({ apiKey, organization: process.env.OPENAI_ORG_ID });
    return {
        async uploadJsonl(content, filename) {
            const file = await client.files.create({
                file: await toFile(Buffer.from(content, 'utf8'), filename),
                purpose: 'batch',
            });
            return file.id;
        },
        createBatch: (inputFileId, metadata) =>
            client.batches.create({
                input_file_id: inputFileId,
                endpoint: '/v1/responses',
                completion_window: '24h',
                metadata,
            }),
        retrieveBatch: (batchId) => client.batches.retrieve(batchId),
        async fileText(fileId) {
            const response = await client.files.content(fileId);
            return response.text();
        },
    };
}

function redisStateStore(): ShelfLifeStateStore {
    const redis = getRedis();
    return {
        async get() {
            const raw = await redis.get(STATE_KEY);
            return raw ? (JSON.parse(raw) as ShelfLifeBatchState) : null;
        },
        async set(state) {
            await redis.set(STATE_KEY, JSON.stringify(state));
        },
        async clear() {
            await redis.del(STATE_KEY);
        },
        async lock() {
            return (await redis.set(LOCK_KEY, '1', 'EX', LOCK_SECONDS, 'NX')) === 'OK';
        },
        async unlock() {
            await redis.del(LOCK_KEY);
        },
    };
}

export async function processBackfillIngredientShelfLife(
    job: Job<BackfillIngredientShelfLifeJob>,
): Promise<Record<string, unknown>> {
    const store = redisStateStore();
    if (!(await store.lock())) {
        return { step: 'skipped', message: 'Ein anderer Lauf ist aktiv' };
    }
    try {
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
    } finally {
        await store.unlock();
    }
}
