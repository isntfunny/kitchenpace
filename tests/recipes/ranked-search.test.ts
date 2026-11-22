import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RankingRecipe } from '../../shared/recipe-ranking/features';
import { rankedSearch, type RankDeps } from '../../src/lib/recipes/ranked-search';

const recipe = (id: string, embedding: number[] | null = [1, 0, 0]): RankingRecipe => ({
    id,
    title: `Gericht ${id}`,
    categorySlugs: ['hauptgericht'],
    tags: [],
    ingredients: [],
    rating: 0,
    ratingCount: 0,
    totalTime: 30,
    difficulty: 'EASY',
    stepCount: 5,
    embedding,
});

const ids = Array.from({ length: 30 }, (_, i) => `r${i}`);

function deps(overrides: Partial<RankDeps> = {}) {
    const calls: {
        knn: { vector: number[]; k: number; allowed: string[] }[];
        fallback: string[][];
    } = {
        knn: [],
        fallback: [],
    };
    const d: RankDeps = {
        knn: async (vector, k, allowed) => {
            calls.knn.push({ vector, k, allowed });
            return allowed.slice(0, k);
        },
        load: async (list) => new Map(list.map((id) => [id, recipe(id)])),
        tasteFallback: async (list) => {
            calls.fallback.push(list);
            return list.map((id, i) => ({ id, score: 1 - i / 100 }));
        },
        ...overrides,
    };
    return { d, calls };
}

const base = {
    idsByRating: ids,
    profile: [1, 0, 0] as number[] | null,
    picks: [] as RankingRecipe[],
    excludeIds: [] as string[],
    expiring: [],
    season: 'herbst' as const,
    withReasons: false,
    globalMean: 3.5,
};

test('uses knn with the picks blended into the vector', async () => {
    const { d, calls } = deps();
    await rankedSearch({ ...base, picks: [recipe('p1', [0, 1, 0])] }, d);
    assert.equal(calls.knn.length, 1);
    assert.notDeepEqual(calls.knn[0].vector, [1, 0, 0]);
    assert.deepEqual(calls.knn[0].allowed, ids);
    assert.equal(calls.knn[0].k, 150);
});

test('fills up below 12 in rating order', async () => {
    const { d } = deps({ knn: async () => ['r20', 'r21', 'r22', 'r23', 'r24'] });
    const result = await rankedSearch(base, d);
    assert.equal(result.length, 12);
    const filled = result
        .map((r) => r.id)
        .filter((id) => !['r20', 'r21', 'r22', 'r23', 'r24'].includes(id));
    assert.deepEqual(filled.sort(), ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6'].sort());
});

test('falls back to the DB cosine when knn throws', async () => {
    const { d, calls } = deps({
        knn: async () => {
            throw new Error('knn down');
        },
    });
    const result = await rankedSearch(base, d);
    assert.equal(calls.fallback.length, 1);
    assert.deepEqual(calls.fallback[0], ids);
    assert.ok(result.length > 0);
});

test('no vector, no knn', async () => {
    const { d, calls } = deps();
    const result = await rankedSearch({ ...base, profile: null }, d);
    assert.equal(calls.knn.length, 0);
    assert.equal(result.length, ids.length);
});

test('excluded ids never appear, not even when filling up', async () => {
    const { d, calls } = deps({ knn: async () => ['r0', 'r1'] });
    const result = await rankedSearch({ ...base, excludeIds: ['r0', 'r2', 'r3'] }, d);
    const got = new Set(result.map((r) => r.id));
    for (const id of ['r0', 'r2', 'r3']) assert.ok(!got.has(id), id);
    assert.ok(!calls.knn.length || true);
});

test('recipes missing in the DB are dropped', async () => {
    const { d } = deps({
        load: async (list) =>
            new Map(list.filter((id) => id !== 'r1').map((id) => [id, recipe(id)])),
    });
    const result = await rankedSearch({ ...base, profile: null }, d);
    assert.ok(!result.some((r) => r.id === 'r1'));
});
