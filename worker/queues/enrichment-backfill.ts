// backfill-ingredient-enrichment (daily 05:30, KUC-94, KUC-114, KUC-118):
// safety net for ingredients that still lack nutrition values, units,
// categories, shelf life or a display name. Runs on the OpenAI Batch API.
//
// One run does one step and re-enqueues itself to poll:
//   no saved batch   → select ingredients, submit one batch with a nutrition
//                      request (web search) per ingredient and shelf-life
//                      requests for those without shelf life or name
//   batch running    → poll again later (no second poll chain)
//   batch completed  → import nutrition first, then shelf life (same order as
//                      enrich-ingredient-nutrition, so LOW confidence keeps
//                      needsReview); failed entries go into a retry batch
// Whatever is still missing after the retry rounds is selected again by the
// next daily run, so no ingredient stays without enrichment.
//
// Request bodies and result import are the ones of the direct job
// (nutrition-processor.ts, shelf-life-processor.ts).

import type { PrismaClient } from '@prisma/client';
import type { Job } from 'bullmq';

import { AI_TEXT_MODEL } from '@shared/ai-models';
import {
    buildBatchJsonl,
    createOpenAIBatchApi,
    parseBatchOutputJsonl,
    responsesOutputText,
    type OpenAIBatchApi,
} from '@shared/openai-batch';

import {
    checkBatch,
    redisBatchStore,
    schedulePollIfDue,
    withBatchLock,
    type BatchStateStore,
    type SavedBatch,
} from './batch-job';
import {
    buildNutritionRequest,
    importNutritionResult,
    loadEnrichmentContext,
    needsNutritionEnrichment,
    parseNutritionAnswer,
} from './nutrition-processor';
import { prisma as workerPrisma } from './prisma';
import { getScheduledQueue } from './queue';
import {
    buildBatchRequests as buildShelfLifeRequests,
    importShelfLifeBatchOutput,
    needsShelfLifeEnrichment,
} from './shelf-life-processor';
import type { BackfillIngredientEnrichmentJob } from './types';

export const ENRICHMENT_JOB_NAME = 'backfill-ingredient-enrichment';
const STORE_NAME = 'ingredient-enrichment';
/** Rounds of retries for failed entries after the first batch */
const MAX_RETRY_ROUNDS = 2;
/** Ingredients per shelf-life request in the first round (as in KUC-94) */
const SHELF_LIFE_CHUNK_SIZE = 50;

export interface EnrichmentBatchState extends SavedBatch {
    model: string;
    /** custom_id → ingredient id (nutrition, units, categories) */
    nutrition: Record<string, string>;
    /** custom_id → ingredient ids (shelf life and display name) */
    shelfLife: Record<string, string[]>;
}

export interface EnrichmentDeps {
    prisma: PrismaClient;
    api: OpenAIBatchApi;
    store: BatchStateStore<EnrichmentBatchState>;
    schedulePoll(delayMs: number, data: BackfillIngredientEnrichmentJob): Promise<void>;
    now?: () => Date;
}

interface Candidate {
    id: string;
    name: string;
    nutrition: boolean;
    shelfLife: boolean;
}

// ── Selection ───────────────────────────────────────────────────────────

const candidateSelect = {
    id: true,
    name: true,
    energyKcal: true,
    ingredientUnits: { select: { unitId: true } },
    categories: { select: { id: true } },
    shelfLifeSource: true,
    normalizedName: true,
    normalizedNameManual: true,
} as const;

function toCandidates(
    rows: Array<
        { id: string; name: string } & Parameters<typeof needsNutritionEnrichment>[0] &
            Parameters<typeof needsShelfLifeEnrichment>[0]
    >,
): Candidate[] {
    return rows
        .map((row) => ({
            id: row.id,
            name: row.name,
            nutrition: needsNutritionEnrichment(row),
            shelfLife: needsShelfLifeEnrichment(row),
        }))
        .filter((candidate) => candidate.nutrition || candidate.shelfLife);
}

/** Ingredients with something missing, newest first so fresh ones are not starved. */
export async function selectEnrichmentCandidates(
    prisma: PrismaClient,
    limit: number,
    includeNeedsReview: boolean,
): Promise<Candidate[]> {
    const rows = await prisma.ingredient.findMany({
        where: {
            OR: [
                { energyKcal: null },
                { ingredientUnits: { none: {} } },
                { categories: { none: {} } },
                // Also catches ingredients whose enqueue at creation was lost
                { shelfLifeSource: null },
                { normalizedName: null, normalizedNameManual: false },
                ...(includeNeedsReview ? [{ needsReview: true }] : []),
            ],
        },
        select: candidateSelect,
        take: limit,
        orderBy: { createdAt: 'desc' },
    });
    return toCandidates(rows);
}

// ── Requests ────────────────────────────────────────────────────────────

/** One batch file: a nutrition request per ingredient plus shelf-life requests. */
export async function buildEnrichmentBatch(
    prisma: PrismaClient,
    candidates: Candidate[],
    round: number,
): Promise<{
    jsonl: string;
    nutrition: Record<string, string>;
    shelfLife: Record<string, string[]>;
}> {
    const nutritionCandidates = candidates.filter((candidate) => candidate.nutrition);
    const nutrition: Record<string, string> = {};
    const nutritionLines: { customId: string; body: unknown }[] = [];
    if (nutritionCandidates.length > 0) {
        const context = await loadEnrichmentContext(prisma);
        nutritionCandidates.forEach((candidate, index) => {
            const customId = `nutrition-r${round}-${index}`;
            nutrition[customId] = candidate.id;
            nutritionLines.push({
                customId,
                body: buildNutritionRequest(candidate.name, context),
            });
        });
    }

    const shelfLife = buildShelfLifeRequests(
        candidates.filter((candidate) => candidate.shelfLife),
        round === 0 ? SHELF_LIFE_CHUNK_SIZE : 1,
        round,
    );
    return {
        jsonl: buildBatchJsonl('/v1/responses', nutritionLines) + shelfLife.jsonl,
        nutrition,
        shelfLife: shelfLife.requests,
    };
}

async function submit(deps: EnrichmentDeps, candidates: Candidate[], round: number) {
    const { jsonl, nutrition, shelfLife } = await buildEnrichmentBatch(
        deps.prisma,
        candidates,
        round,
    );
    const inputFileId = await deps.api.uploadJsonl(jsonl, `ingredient-enrichment-r${round}.jsonl`);
    const batch = await deps.api.createBatch(inputFileId, '/v1/responses', {
        purpose: 'KUC-118 ingredient enrichment',
        round: String(round),
    });
    const state: EnrichmentBatchState = {
        batchId: batch.id,
        inputFileId,
        model: AI_TEXT_MODEL,
        createdAt: (deps.now?.() ?? new Date()).toISOString(),
        round,
        nutrition,
        shelfLife,
    };
    await deps.store.set(state);
    return state;
}

// ── Import ──────────────────────────────────────────────────────────────

/**
 * Imports the nutrition answers. Ingredients whose request failed or whose
 * answer could not be read or written are returned as missing.
 */
export async function importNutritionBatchOutput(
    prisma: PrismaClient,
    outputJsonl: string,
    requests: Record<string, string>,
): Promise<{ imported: number; autoApproved: number; missing: string[]; errors: string[] }> {
    const bodies = new Map(
        parseBatchOutputJsonl(outputJsonl)
            .filter((entry) => entry.customId in requests)
            .map((entry) => [entry.customId, entry]),
    );
    const result = {
        imported: 0,
        autoApproved: 0,
        missing: [] as string[],
        errors: [] as string[],
    };
    if (Object.keys(requests).length === 0) return result;

    const context = await loadEnrichmentContext(prisma);
    for (const [customId, ingredientId] of Object.entries(requests)) {
        const entry = bodies.get(customId);
        if (!entry || entry.body === undefined) {
            result.missing.push(ingredientId);
            if (entry?.error) result.errors.push(`${ingredientId}: ${entry.error.slice(0, 200)}`);
            continue;
        }
        try {
            const parsed = parseNutritionAnswer(responsesOutputText(entry.body));
            const imported = await importNutritionResult(prisma, ingredientId, parsed, context);
            if (imported.status === 'imported') result.imported += 1;
            if (imported.autoApproved) result.autoApproved += 1;
        } catch (error) {
            result.missing.push(ingredientId);
            result.errors.push(
                `${ingredientId}: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
    return result;
}

// ── Steps ───────────────────────────────────────────────────────────────

const DEFAULTS = {
    batchSize: 50,
    dryRun: false,
    includeNeedsReview: false,
    pollMinutes: 10,
    reset: false,
};

export async function runEnrichmentBackfill(
    deps: EnrichmentDeps,
    data: BackfillIngredientEnrichmentJob,
): Promise<Record<string, unknown>> {
    const options = { ...DEFAULTS, ...data };
    const pollDelay = options.pollMinutes * 60_000;
    const now = deps.now?.() ?? new Date();
    const schedulePoll = (state: EnrichmentBatchState) =>
        schedulePollIfDue(deps.store, state, pollDelay, now, () =>
            deps.schedulePoll(pollDelay, data),
        );

    if (options.reset && !options.dryRun) await deps.store.clear();
    const state = await deps.store.get();

    if (!state) {
        const candidates = await selectEnrichmentCandidates(
            deps.prisma,
            options.batchSize,
            options.includeNeedsReview,
        );
        const counts = {
            total: candidates.length,
            nutrition: candidates.filter((candidate) => candidate.nutrition).length,
            shelfLife: candidates.filter((candidate) => candidate.shelfLife).length,
        };
        if (options.dryRun) {
            for (const candidate of candidates) {
                console.log(`[EnrichBackfill] [DRY RUN] Would submit: ${candidate.name}`);
            }
            return { step: 'dry-run', ...counts };
        }
        if (candidates.length === 0) {
            return { step: 'idle', message: 'Alle Zutaten angereichert', ...counts };
        }
        const created = await submit(deps, candidates, 0);
        await schedulePoll(created);
        return { step: 'submitted', batchId: created.batchId, model: created.model, ...counts };
    }

    if (options.dryRun) {
        // Never import (writes) in a dry run; just show the saved batch
        return { step: 'dry-run', pendingBatchId: state.batchId, round: state.round };
    }

    const check = await checkBatch(deps.api, deps.store, state.batchId);
    const base = { batchId: state.batchId, round: state.round, status: check.status };
    if (check.kind === 'running') {
        await schedulePoll(state);
        return { step: 'waiting', ...base, requestCounts: check.requestCounts };
    }

    // Nutrition first, then shelf life: the auto-approval of the nutrition
    // import must not clear needsReview set for a LOW confidence shelf life.
    const nutrition = await importNutritionBatchOutput(
        deps.prisma,
        check.outputJsonl,
        state.nutrition,
    );
    const shelfLife = await importShelfLifeBatchOutput(
        deps.prisma,
        check.outputJsonl,
        state.shelfLife,
        true,
    );
    const summary = {
        ...base,
        nutrition: {
            requested: Object.keys(state.nutrition).length,
            imported: nutrition.imported,
            autoApproved: nutrition.autoApproved,
            withoutResult: nutrition.missing.length,
            errors: nutrition.errors.slice(0, 10),
        },
        shelfLife: shelfLife.summary,
    };

    await deps.store.clear();
    const missing = [...new Set([...nutrition.missing, ...shelfLife.missing])];
    if (missing.length > 0 && state.round < MAX_RETRY_ROUNDS) {
        const rows = await deps.prisma.ingredient.findMany({
            where: { id: { in: missing } },
            select: candidateSelect,
        });
        // Only what is still missing now (and was asked for in this batch)
        const nutritionMissing = new Set(nutrition.missing);
        const shelfLifeMissing = new Set(shelfLife.missing);
        const retry = toCandidates(rows)
            .map((candidate) => ({
                ...candidate,
                nutrition: candidate.nutrition && nutritionMissing.has(candidate.id),
                shelfLife: candidate.shelfLife && shelfLifeMissing.has(candidate.id),
            }))
            .filter((candidate) => candidate.nutrition || candidate.shelfLife);
        if (retry.length > 0) {
            const created = await submit(deps, retry, state.round + 1);
            await schedulePoll(created);
            return {
                step: 'imported',
                ...summary,
                retryBatchId: created.batchId,
                retried: retry.length,
            };
        }
    }
    return { step: 'imported', ...summary, missingIds: missing.slice(0, 50) };
}

// ── Real dependencies ───────────────────────────────────────────────────

export async function processBackfillIngredientEnrichment(
    job: Job<BackfillIngredientEnrichmentJob>,
): Promise<Record<string, unknown>> {
    const store = redisBatchStore<EnrichmentBatchState>(STORE_NAME);
    return withBatchLock(store, async () => {
        const result = await runEnrichmentBackfill(
            {
                prisma: workerPrisma,
                api: createOpenAIBatchApi(),
                store,
                schedulePoll: async (delay, data) => {
                    // Poll jobs never reset the saved batch
                    await getScheduledQueue().add(
                        ENRICHMENT_JOB_NAME,
                        { ...data, reset: false },
                        { delay },
                    );
                },
            },
            job.data,
        );
        console.log(`[EnrichBackfill] ${JSON.stringify(result)}`);
        return result;
    });
}
