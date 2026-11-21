// backfill-embeddings (on demand and after each reindex, KUC-118): recipes
// without a stored embedding get one through the OpenAI Batch API
// (/v1/embeddings). Stored embeddings are copied back into OpenSearch on every
// run without any API call.
//
// One run does one step and re-enqueues itself to poll:
//   no saved batch   → submit a batch for all published recipes without
//                      embedding (one recipe per request)
//   batch running    → poll again later (no second poll chain)
//   batch completed  → store the vectors; failed recipes go into a retry batch
// The single embedding after publishing (sync-recipe) stays a direct call.
//
// The request body is the one of the direct call (buildEmbeddingRequest).
// Database and OpenSearch access come in as dependencies
// (opensearch-processor.ts), so the flow is testable without them.

import { buildEmbeddingRequest, EMBEDDING_MODEL } from '@app/lib/embeddings/embedding-service';
import {
    buildBatchJsonl,
    embeddingVectors,
    parseBatchOutputJsonl,
    type OpenAIBatchApi,
} from '@shared/openai-batch';

import { checkBatch, schedulePollIfDue, type BatchStateStore, type SavedBatch } from './batch-job';
import type { BackfillEmbeddingsJob } from './types';

export const EMBEDDINGS_JOB_NAME = 'backfill-embeddings';
export const EMBEDDINGS_STORE_NAME = 'embeddings';
/** Rounds of retries for failed recipes after the first batch */
const MAX_RETRY_ROUNDS = 2;

export interface EmbeddingsBatchState extends SavedBatch {
    model: string;
    /** custom_id → recipe id */
    requests: Record<string, string>;
}

export interface RecipeEmbeddingText {
    id: string;
    text: string;
}

export interface EmbeddingsDeps {
    api: OpenAIBatchApi;
    store: BatchStateStore<EmbeddingsBatchState>;
    /**
     * Copies stored embeddings into OpenSearch and returns the published
     * recipes that have none yet, with their embedding text.
     */
    restoreStored(pageSize: number): Promise<{ restored: number; missing: RecipeEmbeddingText[] }>;
    /**
     * Stores vectors (database + OpenSearch) for recipes that are still
     * published and have no embedding of the current model yet (see
     * rowsToStore); returns how many were written.
     */
    saveEmbeddings(rows: Array<{ id: string; embedding: number[] }>): Promise<number>;
    schedulePoll(delayMs: number, data: BackfillEmbeddingsJob): Promise<void>;
    now?: () => Date;
}

// ── Requests and output ─────────────────────────────────────────────────

export function buildEmbeddingsBatch(
    recipes: RecipeEmbeddingText[],
    round: number,
): { jsonl: string; requests: Record<string, string> } {
    const requests: Record<string, string> = {};
    const lines = recipes.map((recipe, index) => {
        const customId = `embedding-r${round}-${index}`;
        requests[customId] = recipe.id;
        return { customId, body: buildEmbeddingRequest(recipe.text) };
    });
    return { jsonl: buildBatchJsonl('/v1/embeddings', lines), requests };
}

/** Vectors of the successful requests; recipes without a usable vector are missing. */
export function parseEmbeddingsOutput(
    outputJsonl: string,
    requests: Record<string, string>,
): { rows: Array<{ id: string; embedding: number[] }>; missing: string[] } {
    const rows: Array<{ id: string; embedding: number[] }> = [];
    const done = new Set<string>();
    for (const entry of parseBatchOutputJsonl(outputJsonl)) {
        const recipeId = requests[entry.customId];
        if (!recipeId || entry.body === undefined) continue;
        try {
            const [embedding] = embeddingVectors(entry.body);
            if (!embedding || embedding.length === 0) continue;
            rows.push({ id: recipeId, embedding });
            done.add(entry.customId);
        } catch {
            // counted as missing below
        }
    }
    const missing = Object.keys(requests)
        .filter((customId) => !done.has(customId))
        .map((customId) => requests[customId]);
    return { rows, missing };
}

/**
 * Batch vectors that may be stored: the recipe is still published and has no
 * embedding of the current model yet. One written meanwhile (sync-recipe
 * after an edit) is newer than the batch and is kept.
 */
export function rowsToStore<T extends { id: string }>(
    rows: T[],
    publishedIds: ReadonlySet<string>,
    currentIds: ReadonlySet<string>,
): T[] {
    return rows.filter((row) => publishedIds.has(row.id) && !currentIds.has(row.id));
}

// ── Steps ───────────────────────────────────────────────────────────────

const DEFAULTS = { batchSize: 50, pollMinutes: 10, reset: false };

async function submit(deps: EmbeddingsDeps, recipes: RecipeEmbeddingText[], round: number) {
    const { jsonl, requests } = buildEmbeddingsBatch(recipes, round);
    const inputFileId = await deps.api.uploadJsonl(jsonl, `embeddings-r${round}.jsonl`);
    const batch = await deps.api.createBatch(inputFileId, '/v1/embeddings', {
        purpose: 'KUC-118 recipe embeddings',
        round: String(round),
    });
    const state: EmbeddingsBatchState = {
        batchId: batch.id,
        inputFileId,
        model: EMBEDDING_MODEL,
        createdAt: (deps.now?.() ?? new Date()).toISOString(),
        round,
        requests,
    };
    await deps.store.set(state);
    return state;
}

export async function runEmbeddingsBackfill(
    deps: EmbeddingsDeps,
    data: BackfillEmbeddingsJob,
): Promise<Record<string, unknown>> {
    const options = { ...DEFAULTS, ...data };
    const pollDelay = options.pollMinutes * 60_000;
    const now = deps.now?.() ?? new Date();
    const schedulePoll = (state: EmbeddingsBatchState) =>
        schedulePollIfDue(
            deps.store,
            state,
            pollDelay,
            now,
            () => deps.schedulePoll(pollDelay, data),
            { ...data },
        );

    if (options.reset) await deps.store.clear();
    const state = await deps.store.get();

    // Copying stored embeddings runs once per run: when submitting or after
    // an import, never while just polling.
    if (!state) {
        const { restored, missing } = await deps.restoreStored(options.batchSize);
        if (missing.length === 0) return { step: 'idle', restored, generated: 0 };
        const created = await submit(deps, missing, 0);
        await schedulePoll(created);
        return {
            step: 'submitted',
            restored,
            batchId: created.batchId,
            recipes: missing.length,
            model: created.model,
        };
    }

    const check = await checkBatch(deps.api, deps.store, state.batchId);
    const base = { batchId: state.batchId, round: state.round, status: check.status };
    if (check.kind === 'running') {
        await schedulePoll(state);
        return { step: 'waiting', ...base, requestCounts: check.requestCounts };
    }

    const output = parseEmbeddingsOutput(check.outputJsonl, state.requests);
    const generated = await deps.saveEmbeddings(output.rows);
    await deps.store.clear();
    const { restored, missing } = await deps.restoreStored(options.batchSize);
    const summary = { ...base, restored, generated, withoutResult: output.missing.length };

    if (output.missing.length > 0 && state.round < MAX_RETRY_ROUNDS) {
        // Still published and still without embedding, with the current text
        const failed = new Set(output.missing);
        const retry = missing.filter((recipe) => failed.has(recipe.id));
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
    return { step: 'imported', ...summary, missingIds: output.missing.slice(0, 50) };
}
