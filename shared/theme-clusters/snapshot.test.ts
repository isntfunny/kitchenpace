import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeThemeClusters, dominantTermNames, type ClusterRecipeInput } from './compute';
import { createRng } from './kmeans';
import { buildRunSnapshot, previousFromRows, termsFromStored } from './snapshot';

function makeRecipes(noiseSeed: number): ClusterRecipeInput[] {
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

const meta = { seed: 42, model: 'text-embedding-3-large', recipeCount: 20 };
let counter = 0;
const newKey = () => `new-${++counter}`;

test('first run: every cluster gets a new key and a complete snapshot', () => {
    const snapshot = buildRunSnapshot(
        computeThemeClusters(makeRecipes(1), [], { k: 2 }),
        meta,
        newKey,
    );
    assert.equal(snapshot.run.k, 2);
    assert.equal(snapshot.run.stabilityRatio, null);
    assert.equal(snapshot.run.recipeCount, 20);
    assert.equal(snapshot.clusters.length, 2);
    for (const cluster of snapshot.clusters) {
        assert.match(cluster.key, /^new-\d+$/);
        assert.equal(cluster.members.length, cluster.size);
        assert.ok(cluster.filterTags.length > 0 || cluster.filterCategories.length > 0);
        assert.ok(cluster.topTerms.filterCoverage > 0.8);
        assert.equal(cluster.eligible, true);
        assert.ok(cluster.members.every((m) => m.similarity > 0.9));
    }
});

test('second run keeps keys through the store round trip and reports stability', () => {
    const first = buildRunSnapshot(
        computeThemeClusters(makeRecipes(1), [], { k: 2 }),
        meta,
        newKey,
    );
    // What the store would read back for the previous run
    const previous = previousFromRows(first.clusters);
    assert.equal(previous.assignments.size, 20);

    const second = buildRunSnapshot(
        computeThemeClusters(makeRecipes(77), previous.clusters, {
            k: 2,
            seed: 9,
            previousAssignments: previous.assignments,
        }),
        meta,
        newKey,
    );
    assert.deepEqual(
        second.clusters.map((c) => c.key).sort(),
        first.clusters.map((c) => c.key).sort(),
    );
    assert.deepEqual(
        second.clusters.map((c) => c.label).sort(),
        first.clusters.map((c) => c.label).sort(),
    );
    assert.equal(second.run.stabilityRatio, 1);
    assert.deepEqual(second.retiredKeys, []);
});

test('keys stay unique inside a run even if the key factory repeats itself', () => {
    const result = computeThemeClusters(makeRecipes(2), [], { k: 2 });
    const snapshot = buildRunSnapshot(result, meta, () => 'same');
    assert.equal(new Set(snapshot.clusters.map((c) => c.key)).size, 2);
});

test('termsFromStored matches dominantTermNames and survives bad JSON', () => {
    const result = computeThemeClusters(makeRecipes(3), [], { k: 2 });
    const [cluster] = buildRunSnapshot(result, meta, newKey).clusters;
    assert.deepEqual(
        termsFromStored(cluster.topTerms),
        dominantTermNames(result.clusters[0].profile),
    );

    for (const bad of [null, undefined, 'x', 3, [], {}, { tags: 'x' }, { tags: [{ name: 1 }] }]) {
        assert.deepEqual(termsFromStored(bad), []);
    }
});
