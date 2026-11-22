// backfill-ingredient-icons with a fake database, API and store: no OpenAI,
// no Redis, no Postgres.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PrismaClient } from '@prisma/client';

import {
    buildIconBatchRequests,
    parseIconBatchOutput,
    runIconBackfill,
    unansweredIds,
    type IconBatchState,
    type IconStateStore,
} from './icon-backfill';

interface FakeIngredient {
    id: string;
    name: string;
    icon: string | null;
    recipes: number;
}

function fakePrisma(rows: FakeIngredient[]) {
    const prisma = {
        ingredient: {
            findMany: async (args: { where?: { icon?: null; id?: { in: string[] } } }) =>
                rows
                    .filter((row) => (args.where?.icon === null ? row.icon === null : true))
                    .filter((row) => (args.where?.id ? args.where.id.in.includes(row.id) : true))
                    .map((row) => ({
                        id: row.id,
                        name: row.name,
                        _count: { recipes: row.recipes },
                    })),
            updateMany: async (args: {
                where: { id: string; icon: null };
                data: { icon: string };
            }) => {
                const row = rows.find((r) => r.id === args.where.id && r.icon === null);
                if (!row) return { count: 0 };
                row.icon = args.data.icon;
                return { count: 1 };
            },
        },
    };
    return prisma as unknown as PrismaClient;
}

function fakeStore(): IconStateStore & { current: IconBatchState | null } {
    const store = {
        current: null as IconBatchState | null,
        get: async () => store.current,
        set: async (state: IconBatchState) => {
            store.current = state;
        },
        clear: async () => {
            store.current = null;
        },
        lock: async () => true,
        unlock: async () => {},
    };
    return store;
}

const outputLine = (customId: string, items: unknown[]) =>
    JSON.stringify({
        custom_id: customId,
        response: {
            status_code: 200,
            body: {
                output: [
                    {
                        content: [{ type: 'output_text', text: JSON.stringify({ items }) }],
                    },
                ],
            },
        },
    });

function fakeApi(output: () => string) {
    const created: string[] = [];
    return {
        created,
        uploadJsonl: async () => 'file-1',
        createBatch: async () => {
            created.push('batch');
            return { id: 'batch-1' };
        },
        retrieveBatch: async () => ({ status: 'completed', output_file_id: 'out-1' }),
        fileText: async () => output(),
    };
}

const deps = (prisma: PrismaClient, api: ReturnType<typeof fakeApi>, store: IconStateStore) => ({
    prisma,
    api,
    store,
    schedulePoll: async () => {},
    now: () => new Date('2026-11-21T06:00:00Z'),
});

test('requests: chunks of the requested size, one allowed-names schema, ids per custom_id', () => {
    const { jsonl, requests } = buildIconBatchRequests(
        [
            { id: 'a', name: 'Gouda' },
            { id: 'b', name: 'Karotte' },
            { id: 'c', name: 'Salz' },
        ],
        2,
        0,
    );
    assert.deepEqual(requests, { 'icons-r0-0': ['a', 'b'], 'icons-r0-1': ['c'] });
    const lines = jsonl
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
    assert.equal(lines.length, 2);
    assert.equal(lines[0].url, '/v1/responses');
    assert.equal(lines[0].body.text.format.strict, true);
    assert.equal(lines[0].body.tools, undefined, 'no web search');
});

test('output: invented ids are ignored, invalid icons become null, failed requests are listed', () => {
    const requests = { r0: ['a', 'b'], r1: ['c'] };
    const output = [
        outputLine('r0', [
            { id: 'a', icon: 'cheese' },
            { id: 'b', icon: 'made-up' },
            { id: 'zzz', icon: 'egg' },
        ]),
        JSON.stringify({ custom_id: 'r1', error: { message: 'boom' } }),
    ].join('\n');
    const parsed = parseIconBatchOutput(output, requests);
    assert.deepEqual(parsed.answers, [
        { id: 'a', icon: 'cheese' },
        { id: 'b', icon: null },
    ]);
    assert.deepEqual(parsed.failedRequests, ['r1']);
    assert.equal(parsed.unknownIds, 1);
    assert.deepEqual(unansweredIds(requests, parsed.answers), ['c']);
});

test('dry run submits, then reports without writing and keeps the batch', async () => {
    const rows: FakeIngredient[] = [
        { id: 'a', name: 'Gouda', icon: null, recipes: 3 },
        { id: 'b', name: 'Salz', icon: null, recipes: 0 },
    ];
    const store = fakeStore();
    const api = fakeApi(() =>
        outputLine('icons-r0-0', [
            { id: 'a', icon: 'cheese' },
            { id: 'b', icon: null },
        ]),
    );
    const d = deps(fakePrisma(rows), api, store);

    const first = await runIconBackfill(d, { write: false, pollMinutes: 0 });
    assert.equal(first.step, 'submitted');
    assert.equal(first.ingredients, 2);

    const second = await runIconBackfill(d, { write: false, pollMinutes: 0 });
    assert.equal(second.step, 'dry-run');
    assert.equal(second.withIcon, 1);
    assert.equal(second.noIconFits, 1);
    assert.equal(second.updated, 0);
    assert.deepEqual(second.sample, [{ name: 'Gouda', icon: 'cheese' }]);
    assert.deepEqual(
        rows.map((r) => r.icon),
        [null, null],
    );
    assert.ok(store.current, 'batch stays saved for the write run');
});

test('write run imports the saved batch without a new one and never replaces an icon', async () => {
    const rows: FakeIngredient[] = [
        { id: 'a', name: 'Gouda', icon: null, recipes: 1 },
        { id: 'b', name: 'Salz', icon: null, recipes: 1 },
    ];
    const store = fakeStore();
    const api = fakeApi(() =>
        outputLine('icons-r0-0', [
            { id: 'a', icon: 'cheese' },
            { id: 'b', icon: 'salt-pepper' },
        ]),
    );
    const d = deps(fakePrisma(rows), api, store);
    await runIconBackfill(d, { write: false, pollMinutes: 0 });
    // An admin picks an icon for "Salz" while the batch is saved
    rows[1].icon = 'spice-box';

    const result = await runIconBackfill(d, { write: true, pollMinutes: 0 });
    assert.equal(result.step, 'imported');
    assert.equal(result.updated, 1);
    assert.equal(result.alreadyHadIcon, 1);
    assert.deepEqual(
        rows.map((r) => r.icon),
        ['cheese', 'spice-box'],
    );
    assert.equal(api.created.length, 1, 'no second batch');
    assert.equal(store.current, null);
});

test('ingredients without any answer are asked again, one per request', async () => {
    const rows: FakeIngredient[] = [
        { id: 'a', name: 'Gouda', icon: null, recipes: 1 },
        { id: 'b', name: 'Salz', icon: null, recipes: 1 },
    ];
    const store = fakeStore();
    const api = fakeApi(() => outputLine('icons-r0-0', [{ id: 'a', icon: 'cheese' }]));
    const d = deps(fakePrisma(rows), api, store);
    await runIconBackfill(d, { write: true, pollMinutes: 0 });

    const result = await runIconBackfill(d, { write: true, pollMinutes: 0 });
    assert.equal(result.retried, 1);
    assert.equal(result.withoutResult, 1);
    assert.deepEqual(Object.values(store.current!.requests), [['b']]);
    assert.equal(store.current!.round, 1);
});

test('nothing to do when every ingredient has an icon', async () => {
    const rows: FakeIngredient[] = [{ id: 'a', name: 'Gouda', icon: 'cheese', recipes: 1 }];
    const result = await runIconBackfill(
        deps(
            fakePrisma(rows),
            fakeApi(() => ''),
            fakeStore(),
        ),
        {},
    );
    assert.equal(result.step, 'idle');
});
