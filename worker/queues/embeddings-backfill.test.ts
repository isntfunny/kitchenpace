// backfill-embeddings on the Batch API: OpenAI, database and OpenSearch are fakes.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { OpenAIBatchApi } from '@shared/openai-batch';

import {
    buildEmbeddingsBatch,
    parseEmbeddingsOutput,
    runEmbeddingsBackfill,
    type EmbeddingsBatchState,
    type EmbeddingsDeps,
} from './embeddings-backfill';

const embeddingLine = (customId: string, vector: number[] | null, status = 200) =>
    JSON.stringify({
        custom_id: customId,
        response: {
            status_code: status,
            body: vector ? { object: 'list', data: [{ index: 0, embedding: vector }] } : {},
        },
        error: null,
    });

test('one /v1/embeddings request per recipe with the direct request body', () => {
    const { jsonl, requests } = buildEmbeddingsBatch(
        [
            { id: 'r1', text: 'Pfannkuchen' },
            { id: 'r2', text: 'Gulasch' },
        ],
        0,
    );
    const lines = jsonl
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
    assert.deepEqual(requests, { 'embedding-r0-0': 'r1', 'embedding-r0-1': 'r2' });
    assert.deepEqual(lines[1], {
        custom_id: 'embedding-r0-1',
        method: 'POST',
        url: '/v1/embeddings',
        body: { model: 'text-embedding-3-large', input: 'Gulasch' },
    });
});

test('output: vectors of successful requests, failed and missing ones listed', () => {
    const requests = { a: 'r1', b: 'r2', c: 'r3', d: 'r4' };
    const output = [
        embeddingLine('a', [0.1, 0.2]),
        embeddingLine('b', null, 500),
        embeddingLine('c', null),
        embeddingLine('x', [9]),
    ].join('\n');
    const { rows, missing } = parseEmbeddingsOutput(output, requests);
    assert.deepEqual(rows, [{ id: 'r1', embedding: [0.1, 0.2] }]);
    assert.deepEqual(missing, ['r2', 'r3', 'r4']);
});

function harness(missingRecipes: Array<{ id: string; text: string }>) {
    let state = null as EmbeddingsBatchState | null;
    const uploads: string[] = [];
    const endpoints: string[] = [];
    const polls: number[] = [];
    const saved: Array<{ id: string; embedding: number[] }> = [];
    const batch = { status: 'in_progress', output: '' };
    let clock = new Date('2026-11-21T06:00:00Z');
    const api: OpenAIBatchApi = {
        uploadJsonl: async (content) => {
            uploads.push(content);
            return `file-${uploads.length}`;
        },
        createBatch: async (_file, endpoint) => {
            endpoints.push(endpoint);
            return { id: `batch-${uploads.length}` };
        },
        retrieveBatch: async () => ({ status: batch.status, output_file_id: 'out' }),
        fileText: async () => batch.output,
    };
    const deps: EmbeddingsDeps = {
        api,
        store: {
            get: async () => state,
            set: async (next) => {
                state = next;
            },
            clear: async () => {
                state = null;
            },
            lock: async () => true,
            unlock: async () => {},
        },
        restoreStored: async () => ({
            restored: 3,
            missing: missingRecipes.filter((recipe) => !saved.some((row) => row.id === recipe.id)),
        }),
        saveEmbeddings: async (rows) => {
            saved.push(...rows);
            return rows.length;
        },
        schedulePoll: async (delay) => {
            polls.push(delay);
        },
        now: () => clock,
    };
    return {
        deps,
        uploads,
        endpoints,
        polls,
        saved,
        batch,
        state: () => state,
        advance: (minutes: number) => {
            clock = new Date(clock.getTime() + minutes * 60_000);
        },
    };
}

test('flow: submit, wait, import, retry the failed recipe, done', async () => {
    const h = harness([
        { id: 'r1', text: 'Pfannkuchen' },
        { id: 'r2', text: 'Gulasch' },
    ]);

    const submitted = await runEmbeddingsBackfill(h.deps, {});
    assert.equal(submitted.step, 'submitted');
    assert.equal(submitted.restored, 3);
    assert.equal(submitted.recipes, 2);
    assert.deepEqual(h.endpoints, ['/v1/embeddings']);
    assert.equal(h.polls.length, 1);

    // A run during the batch (e.g. hourly reindex) neither submits nor adds a poll
    h.advance(1);
    const waiting = await runEmbeddingsBackfill(h.deps, {});
    assert.equal(waiting.step, 'waiting');
    assert.equal(h.uploads.length, 1);
    assert.equal(h.polls.length, 1);

    // The poll job at its due time schedules the next poll
    h.advance(9);
    await runEmbeddingsBackfill(h.deps, {});
    assert.equal(h.polls.length, 2);

    // r2 failed
    h.batch.status = 'completed';
    const ids = h.state()!.requests;
    h.batch.output = Object.entries(ids)
        .map(([customId, recipeId]) =>
            recipeId === 'r1'
                ? embeddingLine(customId, [1, 2, 3])
                : embeddingLine(customId, null, 500),
        )
        .join('\n');
    const imported = await runEmbeddingsBackfill(h.deps, {});
    assert.equal(imported.step, 'imported');
    assert.equal(imported.generated, 1);
    assert.equal(imported.retried, 1);
    assert.deepEqual(h.saved, [{ id: 'r1', embedding: [1, 2, 3] }]);
    assert.equal(h.state()!.round, 1);
    assert.deepEqual(Object.values(h.state()!.requests), ['r2']);
    assert.match(h.uploads[1], /"input":"Gulasch"/);

    h.batch.output = Object.keys(h.state()!.requests)
        .map((customId) => embeddingLine(customId, [4, 5]))
        .join('\n');
    const retried = await runEmbeddingsBackfill(h.deps, {});
    assert.equal(retried.step, 'imported');
    assert.equal(retried.retryBatchId, undefined);
    assert.equal(h.state(), null);
    assert.equal(h.saved.length, 2);

    assert.equal((await runEmbeddingsBackfill(h.deps, {})).step, 'idle');
});

test('failed batch is forgotten and reported; the next run submits again', async () => {
    const h = harness([{ id: 'r1', text: 'Pfannkuchen' }]);
    await runEmbeddingsBackfill(h.deps, {});
    h.batch.status = 'failed';
    await assert.rejects(runEmbeddingsBackfill(h.deps, {}), /Status failed/);
    assert.equal(h.state(), null);
    h.batch.status = 'in_progress';
    assert.equal((await runEmbeddingsBackfill(h.deps, {})).step, 'submitted');
    assert.equal(h.uploads.length, 2);
});

test('no retry after the last round; nothing is lost because the next run asks again', async () => {
    const h = harness([{ id: 'r1', text: 'Pfannkuchen' }]);
    await runEmbeddingsBackfill(h.deps, {});
    h.batch.status = 'completed';
    for (let round = 0; round <= 2; round += 1) {
        h.batch.output = Object.keys(h.state()!.requests)
            .map((customId) => embeddingLine(customId, null, 500))
            .join('\n');
        const result = await runEmbeddingsBackfill(h.deps, {});
        assert.equal(result.step, 'imported');
        assert.equal(result.retried, round < 2 ? 1 : undefined);
    }
    assert.equal(h.state(), null);
    h.batch.status = 'in_progress';
    assert.equal((await runEmbeddingsBackfill(h.deps, {})).step, 'submitted');
});
