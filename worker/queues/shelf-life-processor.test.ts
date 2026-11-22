// OpenAI is never called: the batch API is a fake. The flow test needs a
// throwaway database (SHELF_LIFE_TEST_DATABASE_URL), never production.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { SHELF_LIFE_PROMPT } from '@shared/ingredient-shelf-life/prompt';
import {
    getShelfLifeResponseFormat,
    type ShelfLifeItem,
} from '@shared/ingredient-shelf-life/schema';
import type { OpenAIBatchApi } from '@shared/openai-batch';

import {
    buildBatchRequests,
    missingAfterImport,
    parseBatchOutput,
    runShelfLifeBackfill,
    type ShelfLifeBatchState,
    type ShelfLifeStateStore,
} from './shelf-life-processor';

const sample: ShelfLifeItem[] = JSON.parse(
    readFileSync(
        new URL('../../shared/ingredient-shelf-life/fixtures/results-sample.json', import.meta.url),
        'utf8',
    ),
).slice(0, 8);

const outputLine = (customId: string, items: unknown[], status = 200) =>
    JSON.stringify({
        custom_id: customId,
        response: {
            status_code: status,
            body: {
                output: [
                    {
                        type: 'message',
                        content: [{ type: 'output_text', text: JSON.stringify({ items }) }],
                    },
                ],
            },
        },
        error: null,
    });

test('builds one /v1/responses request per chunk with prompt and strict schema', () => {
    const ingredients = Array.from({ length: 120 }, (_, index) => ({
        id: `i${index}`,
        name: `Z${index}`,
    }));
    const { jsonl, requests } = buildBatchRequests(ingredients, 50, 0);
    const lines = jsonl
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
    assert.equal(lines.length, 3);
    assert.deepEqual(
        Object.values(requests).map((ids) => ids.length),
        [50, 50, 20],
    );
    assert.equal(lines[0].url, '/v1/responses');
    assert.equal(lines[0].body.model, 'gpt-6.2-sol');
    // Instructions as cached developer message, not top-level `instructions` (KUC-128)
    assert.equal(lines[0].body.instructions, undefined);
    assert.equal(lines[0].body.input[0].role, 'developer');
    assert.equal(lines[0].body.input[0].content[0].text, SHELF_LIFE_PROMPT);
    assert.deepEqual(lines[0].body.input[0].content[0].prompt_cache_breakpoint, {
        mode: 'explicit',
    });
    assert.deepEqual(lines[0].body.prompt_cache_options, { mode: 'explicit' });
    assert.deepEqual(lines[0].body.text.format, getShelfLifeResponseFormat());
    assert.equal(lines[0].body.tools, undefined);
    assert.match(
        lines[2].body.input[1].content,
        /^Zutaten \(JSON\):\n\[\{"id":"i100","name":"Z100"\}/,
    );
});

test('parses output, failed and missing requests are listed', () => {
    const requests = { a: ['1'], b: ['2'], c: ['3'], d: ['4'] };
    const output = [
        outputLine('a', [{ id: '1' }]),
        outputLine('b', [], 500),
        JSON.stringify({ custom_id: 'c', response: { status_code: 200, body: { output: [] } } }),
    ].join('\n');
    const { rawItems, failedRequests } = parseBatchOutput(output, requests);
    assert.deepEqual(rawItems, [{ id: '1' }]);
    assert.deepEqual(failedRequests, ['b', 'c', 'd']);
});

test('missing ids: no valid result or write error, deleted ones not retried', () => {
    const missing = missingAfterImport({ r0: ['a', 'b', 'c', 'd'] }, new Set(['a', 'b', 'd']), {
        notFound: ['d'],
        failed: [{ id: 'b', error: 'x' }],
    });
    assert.deepEqual(missing, ['b', 'c']);
});

const url = process.env.SHELF_LIFE_TEST_DATABASE_URL;
const prisma = url ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }) : null;
const PREFIX = 'slbatch-';

after(async () => {
    if (!prisma) return;
    await prisma.ingredient.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await prisma.$disconnect();
});

test(
    'flow: submit, wait, dry run, write, retry single ingredient',
    { skip: url ? false : 'SHELF_LIFE_TEST_DATABASE_URL not set' },
    async () => {
        const db = prisma!;
        await db.ingredient.deleteMany({ where: { id: { startsWith: PREFIX } } });
        // Only our test ingredients are unassessed in the test run
        await db.ingredient.createMany({
            data: sample.map((item, index) => ({
                id: PREFIX + item.id,
                name: `Roh ${index}`,
                slug: `${PREFIX}${index}`,
            })),
        });
        const ids = sample.map((item) => PREFIX + item.id);

        let state = null as ShelfLifeBatchState | null;
        const store: ShelfLifeStateStore = {
            get: async () => state,
            set: async (next) => {
                state = next;
            },
            clear: async () => {
                state = null;
            },
            lock: async () => true,
            unlock: async () => {},
        };
        const uploads: string[] = [];
        let status = 'in_progress';
        let output = '';
        const endpoints: string[] = [];
        const api: OpenAIBatchApi = {
            uploadJsonl: async (content) => {
                uploads.push(content);
                return `file-${uploads.length}`;
            },
            createBatch: async (_file, endpoint) => {
                endpoints.push(endpoint);
                return { id: `batch-${uploads.length}` };
            },
            retrieveBatch: async () => ({ status, output_file_id: 'out' }),
            fileText: async () => output,
        };
        const polls: number[] = [];
        const deps = {
            prisma: db,
            api,
            store,
            schedulePoll: async (delay: number) => {
                polls.push(delay);
            },
        };

        const submitted = await runShelfLifeBackfill(deps, { limit: 0, chunkSize: 4 });
        assert.equal(submitted.step, 'submitted');
        const requestedIds = Object.values(state!.requests).flat();
        for (const id of ids) assert.ok(requestedIds.includes(id));

        assert.equal((await runShelfLifeBackfill(deps, {})).step, 'waiting');

        // Model drops the last item of our set and invents an id instead
        status = 'completed';
        const returned = sample.slice(0, 7).map((item) => ({ ...item, id: PREFIX + item.id }));
        output = Object.keys(state!.requests)
            .map((customId) => {
                const wanted = new Set(state!.requests[customId]);
                const items = returned.filter((item) => wanted.has(item.id));
                if (wanted.has(ids[7])) items.push({ ...sample[7], id: `${PREFIX}mangled` });
                return outputLine(customId, items);
            })
            .join('\n');

        const dry = await runShelfLifeBackfill(deps, {});
        assert.equal(dry.step, 'dry-run');
        assert.equal(dry.unknownIds, 1);
        assert.ok((dry.missingIds as string[]).includes(ids[7]));
        assert.equal(
            await db.ingredient.count({ where: { id: { in: ids }, shelfLifeSource: 'AI' } }),
            0,
        );
        assert.ok(state, 'batch is kept after a dry run');

        const written = await runShelfLifeBackfill(deps, { write: true });
        assert.equal(written.step, 'imported');
        assert.equal(
            await db.ingredient.count({ where: { id: { in: ids }, shelfLifeSource: 'AI' } }),
            7,
        );
        assert.ok(written.retryBatchId);
        const retryLines = uploads.at(-1)!.trim().split('\n');
        assert.deepEqual(new Set(endpoints), new Set(['/v1/responses']));
        const retriedOurs = retryLines.filter((line) => line.includes(ids[7]));
        assert.equal(retriedOurs.length, 1);
        assert.equal(state!.round, 1);
        for (const ingredientIds of Object.values(state!.requests))
            assert.equal(ingredientIds.length, 1);

        // Retry answers correctly
        output = Object.keys(state!.requests)
            .filter((customId) => state!.requests[customId][0] === ids[7])
            .map((customId) => outputLine(customId, [{ ...sample[7], id: ids[7] }]))
            .join('\n');
        const retried = await runShelfLifeBackfill(deps, { write: true });
        assert.equal(retried.step, 'imported');
        assert.equal(
            await db.ingredient.count({ where: { id: { in: ids }, shelfLifeSource: 'AI' } }),
            8,
        );
    },
);
