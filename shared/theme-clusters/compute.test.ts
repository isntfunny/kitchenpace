import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeThemeClusters, dominantTermNames, type ClusterRecipeInput } from './compute';
import { createRng } from './kmeans';

const TOPICS = [
    { axis: 0, tags: ['Pasta', 'Italienisch'], category: { slug: 'pasta', name: 'Pasta' } },
    { axis: 1, tags: ['Backen', 'Süß'], category: { slug: 'dessert', name: 'Dessert' } },
    { axis: 2, tags: ['Suppe', 'Herbst'], category: { slug: 'suppen', name: 'Suppen' } },
];

function makeRecipes(perTopic: number, noiseSeed: number, noise = 0.15): ClusterRecipeInput[] {
    const rng = createRng(noiseSeed);
    const recipes: ClusterRecipeInput[] = [];
    TOPICS.forEach((topic, t) => {
        for (let i = 0; i < perTopic; i++) {
            const embedding = [0, 0, 0, 0].map((_, d) =>
                d === topic.axis ? 1 + (rng() - 0.5) * noise : (rng() - 0.5) * noise,
            );
            recipes.push({
                recipeId: `r-${t}-${String(i).padStart(2, '0')}`,
                embedding,
                tags: [...topic.tags, ...(i % 3 === 0 ? ['Schnell'] : [])],
                categories: [topic.category],
            });
        }
    });
    return recipes;
}

test('a run builds labelled, filterable clusters', () => {
    const { clusters, k, converged } = computeThemeClusters(makeRecipes(12, 1), [], { k: 3 });
    assert.equal(k, 3);
    assert.equal(converged, true);
    assert.equal(clusters.length, 3);
    for (const cluster of clusters) {
        assert.equal(cluster.recipeIds.length, 12);
        assert.equal(cluster.continuesId, null);
        assert.equal(cluster.profile.eligible, true);
        assert.ok(cluster.profile.filterCoverage > 0.8);
    }
    const labels = clusters.map((c) => c.label).join('|');
    assert.match(labels, /Pasta|Italienisch/);
    assert.match(labels, /Backen|Süß|Dessert/);
    assert.match(labels, /Suppe|Herbst/);
});

test('input order does not change the result', () => {
    const recipes = makeRecipes(10, 3);
    const a = computeThemeClusters(recipes, [], { k: 3 });
    const b = computeThemeClusters([...recipes].reverse(), [], { k: 3 });
    assert.deepEqual(
        a.clusters.map((c) => [c.label, c.recipeIds]),
        b.clusters.map((c) => [c.label, c.recipeIds]),
    );
});

test('second run on slightly changed data keeps ids, labels and assignments stable', () => {
    const first = computeThemeClusters(makeRecipes(15, 1), [], { k: 3 });
    const previous = first.clusters.map((c, i) => ({
        id: `cluster-${i}`,
        label: c.label,
        centroid: c.centroid,
        terms: dominantTermNames(c.profile),
    }));
    const previousAssignments = new Map<string, string>();
    first.clusters.forEach((c, i) =>
        c.recipeIds.forEach((id) => previousAssignments.set(id, `cluster-${i}`)),
    );

    // Different noise = new embeddings, plus some new recipes
    const secondRecipes = [
        ...makeRecipes(15, 99),
        ...makeRecipes(2, 5).map((r) => ({ ...r, recipeId: `n-${r.recipeId}` })),
    ];
    const second = computeThemeClusters(secondRecipes, previous, {
        k: 3,
        seed: 123, // even another seed must continue the same clusters
        previousAssignments,
    });

    assert.deepEqual(second.clusters.map((c) => c.continuesId).sort(), [
        'cluster-0',
        'cluster-1',
        'cluster-2',
    ]);
    assert.deepEqual(second.retiredPrevIds, []);
    for (const cluster of second.clusters) {
        const before = previous.find((p) => p.id === cluster.continuesId)!;
        assert.equal(cluster.label, before.label);
    }
    assert.equal(second.stability?.ratio, 1);
    assert.ok((second.stability?.compared ?? 0) >= 45);
});

test('a vanished topic retires its cluster, automatic k works on tiny input', () => {
    const first = computeThemeClusters(makeRecipes(12, 1), [], { k: 3 });
    const previous = first.clusters.map((c, i) => ({
        id: `cluster-${i}`,
        label: c.label,
        centroid: c.centroid,
        terms: dominantTermNames(c.profile),
    }));
    const withoutSoups = makeRecipes(12, 2).filter((r) => !r.recipeId.startsWith('r-2'));
    const second = computeThemeClusters(withoutSoups, previous, { k: 2 });
    assert.equal(second.retiredPrevIds.length, 1);

    assert.equal(computeThemeClusters([], []).clusters.length, 0);
    assert.equal(computeThemeClusters(makeRecipes(1, 1).slice(0, 2), []).clusters.length, 2);
});
