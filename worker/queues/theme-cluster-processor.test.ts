import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Job } from 'bullmq';

import { createRng } from '@shared/theme-clusters/kmeans';
import type { RunSnapshot } from '@shared/theme-clusters/snapshot';

import {
    keepDominantModel,
    normalizeSimilarity,
    processClusterRecipeThemes,
    type ThemeClusterDeps,
    type ThemeClusterStore,
} from './theme-cluster-processor';
import type { ClusterRecipeThemesJob } from './types';

const rec = (id: string, model: string, dimension: number) => ({
    model,
    recipe: { recipeId: id, embedding: new Array(dimension).fill(0.1), tags: [], categories: [] },
});

test('normalizeSimilarity accepts percentages and fractions', () => {
    assert.equal(normalizeSimilarity(80), 0.8);
    assert.equal(normalizeSimilarity(0.8), 0.8);
    assert.equal(normalizeSimilarity(undefined), undefined);
    assert.equal(normalizeSimilarity(Number.NaN), undefined);
});

test('keepDominantModel keeps the most common model/dimension pair', () => {
    const kept = keepDominantModel([
        rec('a', 'm1', 3),
        rec('b', 'm1', 3),
        rec('c', 'm2', 3),
        rec('d', 'm1', 2),
        rec('e', 'm1', 3),
    ]);
    assert.equal(kept.model, 'm1');
    assert.deepEqual(
        kept.recipes.map((r) => r.recipeId),
        ['a', 'b', 'e'],
    );
    assert.deepEqual(keepDominantModel([]), { recipes: [], model: 'unknown' });
});

// ── Processor with fake store and fake data ─────────────────────────────────

function makeRecipes(noiseSeed: number) {
    const rng = createRng(noiseSeed);
    const topics = [
        { tags: ['Pasta', 'Italienisch'], category: { slug: 'pasta', name: 'Pasta' } },
        { tags: ['Backen', 'Süß'], category: { slug: 'dessert', name: 'Dessert' } },
    ];
    return topics.flatMap((topic, t) =>
        Array.from({ length: 10 }, (_, i) => ({
            recipeId: `r-${t}-${i}`,
            embedding: [0, 0, 0].map((_, d) => (d === t ? 1 : 0) + (rng() - 0.5) * 0.1),
            tags: topic.tags,
            categories: [topic.category],
        })),
    );
}

function fakeStore() {
    const saved: RunSnapshot[] = [];
    const failures: string[] = [];
    let previous: Awaited<ReturnType<ThemeClusterStore['loadPrevious']>> = {
        clusters: [],
        assignments: new Map(),
    };
    const store: ThemeClusterStore = {
        loadPrevious: async () => previous,
        save: async (snapshot) => {
            saved.push(snapshot);
            return { runId: `run-${saved.length}` };
        },
        recordFailure: async ({ error }) => {
            failures.push(error);
        },
    };
    return { store, saved, failures, setPrevious: (value: typeof previous) => (previous = value) };
}

const fakeJob = (data: ClusterRecipeThemesJob) =>
    ({
        id: 'job-1',
        data,
        updateProgress: async () => undefined,
    }) as unknown as Job<ClusterRecipeThemesJob>;

let keyCounter = 0;
const deps = (store: ThemeClusterStore, noiseSeed = 1): ThemeClusterDeps => ({
    store,
    loadRecipes: async () => ({ recipes: makeRecipes(noiseSeed), model: 'test-model' }),
    newKey: () => `k${++keyCounter}`,
});

test('a write run saves one snapshot with new keys and reports a label sample', async () => {
    const { store, saved } = fakeStore();
    const report = await processClusterRecipeThemes(fakeJob({ clusters: 2 }), deps(store));

    assert.equal(saved.length, 1);
    assert.equal(saved[0].run.model, 'test-model');
    assert.equal(saved[0].run.recipeCount, 20);
    assert.equal(report.persisted, true);
    assert.equal(report.runId, 'run-1');
    assert.equal(report.sample?.length, 2);
    assert.deepEqual(
        (report.sample ?? []).map((s) => s.key).sort(),
        saved[0].clusters.map((c) => c.key).sort(),
    );
});

test('dry run computes and reports but writes nothing', async () => {
    const { store, saved, failures } = fakeStore();
    const report = await processClusterRecipeThemes(
        fakeJob({ clusters: 2, dryRun: true }),
        deps(store),
    );
    assert.equal(saved.length, 0);
    assert.equal(failures.length, 0);
    assert.equal(report.persisted, false);
    assert.equal(report.runId, null);
});

test('a second run continues the keys of the stored previous run', async () => {
    const first = fakeStore();
    await processClusterRecipeThemes(fakeJob({ clusters: 2 }), deps(first.store, 1));
    const { previousFromRows } = await import('@shared/theme-clusters/snapshot');

    const second = fakeStore();
    second.setPrevious(previousFromRows(first.saved[0].clusters));
    const report = await processClusterRecipeThemes(
        fakeJob({ clusters: 2, seed: 7 }),
        deps(second.store, 50),
    );

    assert.deepEqual(
        second.saved[0].clusters.map((c) => c.key).sort(),
        first.saved[0].clusters.map((c) => c.key).sort(),
    );
    assert.equal(report.stability?.ratio, 1);
    assert.equal(second.saved[0].run.stabilityRatio, 1);
});

test('too few recipes: nothing is written', async () => {
    const { store, saved } = fakeStore();
    const report = await processClusterRecipeThemes(fakeJob({}), {
        ...deps(store),
        loadRecipes: async () => ({ recipes: makeRecipes(1).slice(0, 1), model: 'm' }),
    });
    assert.equal(saved.length, 0);
    assert.equal(report.persisted, false);
});

test('a failing run is recorded as FAILED and rethrown; dry runs record nothing', async () => {
    const { store, failures } = fakeStore();
    const broken: ThemeClusterDeps = {
        ...deps(store),
        loadRecipes: async () => {
            throw new Error('db down');
        },
    };
    await assert.rejects(processClusterRecipeThemes(fakeJob({ clusters: 3 }), broken), /db down/);
    assert.deepEqual(failures, ['db down']);

    await assert.rejects(processClusterRecipeThemes(fakeJob({ dryRun: true }), broken), /db down/);
    assert.equal(failures.length, 1);
});
