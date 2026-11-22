// backfill-ingredient-icons (KUC-125): one-off icon assignment for existing
// ingredients via the OpenAI Batch API. No web search; the model only picks a
// name from the allowed list (shared/ingredient-icons).
//
// One run does one step and re-enqueues itself to poll (same pattern as
// backfill-ingredient-shelf-life):
//   no pending batch  → select ingredients without icon, upload JSONL, create batch
//   batch running     → poll again later
//   batch completed   → import; entries without any answer are asked again,
//                       one ingredient per request, in up to two rounds
// Without `write` the result is only reported (dry run) and the batch stays
// saved, so a later run with `write: true` imports it without paying again.
//
// An icon is only ever written where the ingredient has none (`icon: null` in
// the update), so icons chosen by an admin or by the enrichment are kept. A
// "no icon fits" answer (null) is final for that run; such ingredients show
// their category icon and are asked again only by a later backfill run.

import type { PrismaClient } from '@prisma/client';
import type { Job } from 'bullmq';

import { AI_TEXT_MODEL } from '@shared/ai-models';
import {
    buildIconBackfillInput,
    extractIconAnswers,
    getIconBackfillResponseFormat,
    ICON_BACKFILL_PROMPT,
    ICON_PROMPT_VERSION,
    type IconAnswer,
} from '@shared/ingredient-icons/backfill';
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
    LOCKED_REQUEUE_DELAY_MS,
    type BatchStateStore,
    type SavedBatch,
} from './batch-job';
import { prisma as workerPrisma } from './prisma';
import { getScheduledQueue } from './queue';
import type { BackfillIngredientIconsJob } from './types';

const ICON_MODEL = AI_TEXT_MODEL;

export const ICON_JOB_NAME = 'backfill-ingredient-icons';
export const ICON_STORE_NAME = 'ingredient-icons';
/** Rounds of single-ingredient retries after the first batch */
const MAX_RETRY_ROUNDS = 2;
const SAMPLE_SIZE = 30;

// ── State ───────────────────────────────────────────────────────────────

export interface IconBatchState extends SavedBatch {
    model: string;
    promptVersion: string;
    /** custom_id → ingredient ids of that request */
    requests: Record<string, string[]>;
    /** Set once a dry run reported this batch */
    dryRunReportedAt?: string;
}

export interface IconBatchApi {
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

export type IconStateStore = BatchStateStore<IconBatchState>;

export interface IconBackfillDeps {
    prisma: PrismaClient;
    api: IconBatchApi;
    store: IconStateStore;
    schedulePoll(delayMs: number, data: BackfillIngredientIconsJob): Promise<void>;
    now?: () => Date;
}

// ── Pure helpers ────────────────────────────────────────────────────────

export function buildIconBatchRequests(
    ingredients: Array<{ id: string; name: string }>,
    chunkSize: number,
    round: number,
): { jsonl: string; requests: Record<string, string[]> } {
    const size = Math.max(1, chunkSize);
    const lines: { customId: string; body: unknown }[] = [];
    const requests: Record<string, string[]> = {};
    for (let offset = 0, index = 0; offset < ingredients.length; offset += size, index += 1) {
        const chunk = ingredients.slice(offset, offset + size);
        const customId = `icons-r${round}-${index}`;
        requests[customId] = chunk.map((ingredient) => ingredient.id);
        lines.push({
            customId,
            body: {
                model: ICON_MODEL,
                instructions: ICON_BACKFILL_PROMPT,
                input: buildIconBackfillInput(chunk),
                text: { format: getIconBackfillResponseFormat() },
            },
        });
    }
    return { jsonl: buildBatchJsonl('/v1/responses', lines), requests };
}

/**
 * Answers of all successful requests, limited to the requested ids (an id the
 * model invented is ignored). Requests that failed, are missing or returned
 * unparseable JSON are listed by custom_id.
 */
export function parseIconBatchOutput(
    outputJsonl: string,
    requests: Record<string, string[]>,
): { answers: IconAnswer[]; failedRequests: string[]; unknownIds: number } {
    const requestedIds = new Set(Object.values(requests).flat());
    const answers = new Map<string, IconAnswer>();
    const succeeded = new Set<string>();
    let unknownIds = 0;

    for (const entry of parseBatchOutputJsonl(outputJsonl)) {
        if (!(entry.customId in requests) || entry.body === undefined) continue;
        try {
            const parsed = extractIconAnswers(JSON.parse(responsesOutputText(entry.body)));
            for (const answer of parsed) {
                if (!requestedIds.has(answer.id)) unknownIds += 1;
                // The first answer of an id wins; a repeated id is ignored
                else if (!answers.has(answer.id)) answers.set(answer.id, answer);
            }
            succeeded.add(entry.customId);
        } catch {
            // counted as failed below
        }
    }

    return {
        answers: [...answers.values()],
        failedRequests: Object.keys(requests).filter((customId) => !succeeded.has(customId)),
        unknownIds,
    };
}

/** Requested ids without any answer (an answer of null counts as answered). */
export function unansweredIds(
    requests: Record<string, string[]>,
    answers: ReadonlyArray<IconAnswer>,
): string[] {
    const answered = new Set(answers.map((answer) => answer.id));
    return Object.values(requests)
        .flat()
        .filter((id) => !answered.has(id));
}

// ── Ingredient selection ────────────────────────────────────────────────

/** Ingredients without an icon: used in recipes first, then the rest. */
export async function selectIngredientsForIcons(
    prisma: PrismaClient,
    limit: number,
): Promise<Array<{ id: string; name: string }>> {
    const rows = await prisma.ingredient.findMany({
        where: { icon: null },
        select: { id: true, name: true, _count: { select: { recipes: true } } },
        orderBy: { name: 'asc' },
    });
    const used = rows.filter((row) => row._count.recipes > 0);
    const unused = rows.filter((row) => row._count.recipes === 0);
    const ordered = [...used, ...unused].map(({ id, name }) => ({ id, name }));
    return limit > 0 ? ordered.slice(0, limit) : ordered;
}

// ── Import of a finished batch ──────────────────────────────────────────

export async function importIconBatchOutput(
    prisma: PrismaClient,
    outputJsonl: string,
    requests: Record<string, string[]>,
    write: boolean,
) {
    const { answers, failedRequests, unknownIds } = parseIconBatchOutput(outputJsonl, requests);
    const missing = unansweredIds(requests, answers);
    const withIcon = answers.filter((answer) => answer.icon !== null);

    let updated = 0;
    let alreadyHadIcon = 0;
    const writeErrors: string[] = [];
    if (write) {
        for (const answer of withIcon) {
            try {
                const { count } = await prisma.ingredient.updateMany({
                    where: { id: answer.id, icon: null },
                    data: { icon: answer.icon },
                });
                if (count > 0) updated += 1;
                else alreadyHadIcon += 1;
            } catch (error) {
                writeErrors.push(`${answer.id}: ${error instanceof Error ? error.message : error}`);
            }
        }
    }

    const sampleIds = withIcon.slice(0, SAMPLE_SIZE);
    const names = await prisma.ingredient.findMany({
        where: { id: { in: sampleIds.map((answer) => answer.id) } },
        select: { id: true, name: true },
    });
    const nameById = new Map(names.map((row) => [row.id, row.name]));

    return {
        missing,
        summary: {
            failedRequests: failedRequests.length,
            unknownIds,
            answered: answers.length,
            withIcon: withIcon.length,
            noIconFits: answers.length - withIcon.length,
            updated,
            alreadyHadIcon,
            writeErrors: writeErrors.length,
            withoutResult: missing.length,
        },
        sample: sampleIds.map((answer) => ({
            name: nameById.get(answer.id) ?? answer.id,
            icon: answer.icon,
        })),
        errors: writeErrors.slice(0, 10),
    };
}

// ── Steps ───────────────────────────────────────────────────────────────

const DEFAULTS = { write: false, limit: 0, chunkSize: 100, pollMinutes: 10, reset: false };

async function submit(
    deps: IconBackfillDeps,
    ingredients: Array<{ id: string; name: string }>,
    chunkSize: number,
    round: number,
) {
    const { jsonl, requests } = buildIconBatchRequests(ingredients, chunkSize, round);
    const inputFileId = await deps.api.uploadJsonl(jsonl, `ingredient-icons-r${round}.jsonl`);
    const batch = await deps.api.createBatch(inputFileId, {
        purpose: 'KUC-125 ingredient icons',
        round: String(round),
    });
    const state: IconBatchState = {
        batchId: batch.id,
        inputFileId,
        model: ICON_MODEL,
        promptVersion: ICON_PROMPT_VERSION,
        createdAt: (deps.now?.() ?? new Date()).toISOString(),
        round,
        requests,
    };
    await deps.store.set(state);
    return state;
}

export async function runIconBackfill(
    deps: IconBackfillDeps,
    data: BackfillIngredientIconsJob,
): Promise<Record<string, unknown>> {
    const options = { ...DEFAULTS, ...data };
    const pollDelay = options.pollMinutes * 60_000;
    const schedule = () => deps.schedulePoll(pollDelay, data);
    const pollData = { ...data } as Record<string, unknown>;
    const scheduleFirstPoll = (created: IconBatchState) =>
        schedulePollIfDue(
            deps.store,
            created,
            pollDelay,
            deps.now?.() ?? new Date(),
            schedule,
            pollData,
        );

    if (options.reset) await deps.store.clear();

    const state = await deps.store.get();

    if (!state) {
        const ingredients = await selectIngredientsForIcons(deps.prisma, options.limit);
        if (ingredients.length === 0)
            return { step: 'idle', message: 'Alle Zutaten haben ein Icon' };
        const created = await submit(deps, ingredients, options.chunkSize, 0);
        await scheduleFirstPoll(created);
        return {
            step: 'submitted',
            batchId: created.batchId,
            ingredients: ingredients.length,
            requests: Object.keys(created.requests).length,
            model: ICON_MODEL,
        };
    }

    const now = deps.now?.() ?? new Date();
    const check = await checkBatch(deps.api, deps.store, state.batchId);
    const base = { batchId: state.batchId, round: state.round, status: check.status };

    if (check.kind === 'running') {
        await schedulePollIfDue(deps.store, state, pollDelay, now, schedule, pollData);
        return { step: 'waiting', ...base, requestCounts: check.requestCounts };
    }

    const { summary, missing, sample, errors } = await importIconBatchOutput(
        deps.prisma,
        check.outputJsonl,
        state.requests,
        options.write,
    );
    const result = { ...base, write: options.write, ...summary };

    if (!options.write) {
        // Kept for a later write run; the poll cron leaves it alone
        await deps.store.set({ ...state, dryRunReportedAt: now.toISOString(), pollStopped: true });
        return { step: 'dry-run', ...result, sample, missingIds: missing.slice(0, 50) };
    }

    await deps.store.clear();
    if (missing.length > 0 && state.round < MAX_RETRY_ROUNDS) {
        const rows = await deps.prisma.ingredient.findMany({
            where: { id: { in: missing }, icon: null },
            select: { id: true, name: true },
        });
        if (rows.length > 0) {
            const retry = await submit(deps, rows, 1, state.round + 1);
            await scheduleFirstPoll(retry);
            return {
                step: 'imported',
                ...result,
                retryBatchId: retry.batchId,
                retried: rows.length,
                errors,
            };
        }
    }
    return { step: 'imported', ...result, missingIds: missing.slice(0, 50), errors };
}

// ── Real dependencies ───────────────────────────────────────────────────

function openAiBatchApi(): IconBatchApi {
    const api = createOpenAIBatchApi();
    return {
        uploadJsonl: api.uploadJsonl,
        createBatch: (inputFileId, metadata) =>
            api.createBatch(inputFileId, '/v1/responses', metadata),
        retrieveBatch: api.retrieveBatch,
        fileText: api.fileText,
    };
}

export async function processBackfillIngredientIcons(
    job: Job<BackfillIngredientIconsJob>,
): Promise<Record<string, unknown>> {
    const store = redisBatchStore<IconBatchState>(ICON_STORE_NAME);
    return withBatchLock(
        store,
        async () => {
            const result = await runIconBackfill(
                {
                    prisma: workerPrisma,
                    api: openAiBatchApi(),
                    store,
                    schedulePoll: async (delay, data) => {
                        // Poll jobs never reset the saved batch
                        await getScheduledQueue().add(
                            ICON_JOB_NAME,
                            { ...data, reset: false },
                            { delay },
                        );
                    },
                },
                job.data,
            );
            console.log(`[IconBackfill] ${JSON.stringify(result)}`);
            return result;
        },
        () =>
            getScheduledQueue().add(
                ICON_JOB_NAME,
                { ...job.data, reset: false },
                { delay: LOCKED_REQUEUE_DELAY_MS },
            ),
    );
}
