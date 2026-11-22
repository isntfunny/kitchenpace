import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRng, cosineSimilarity, kmeans, normalize, suggestClusterCount } from './kmeans';

/** Three well separated groups in 4 dimensions, with small deterministic noise. */
function makeGroups(perGroup: number) {
    const rng = createRng(7);
    const axes = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
    ];
    const vectors: number[][] = [];
    const truth: number[] = [];
    for (let i = 0; i < perGroup; i++) {
        axes.forEach((axis, group) => {
            vectors.push(axis.map((value) => value + (rng() - 0.5) * 0.1));
            truth.push(group);
        });
    }
    return { vectors, truth };
}

test('createRng is deterministic per seed', () => {
    const a = createRng(1);
    const b = createRng(1);
    const c = createRng(2);
    const seqA = [a(), a(), a()];
    assert.deepEqual(seqA, [b(), b(), b()]);
    assert.notDeepEqual(seqA, [c(), c(), c()]);
    assert.ok(seqA.every((value) => value >= 0 && value < 1));
});

test('kmeans recovers well separated groups', () => {
    const { vectors, truth } = makeGroups(10);
    const result = kmeans(vectors, 3, { seed: 42 });

    assert.equal(result.centroids.length, 3);
    assert.equal(result.converged, true);
    // Same group => same cluster, different groups => different clusters
    for (let i = 0; i < vectors.length; i++) {
        for (let j = i + 1; j < vectors.length; j++) {
            assert.equal(
                result.assignments[i] === result.assignments[j],
                truth[i] === truth[j],
                `pair ${i}/${j}`,
            );
        }
    }
});

test('kmeans is deterministic for the same seed and input order', () => {
    const { vectors } = makeGroups(8);
    const first = kmeans(vectors, 3, { seed: 5 });
    const second = kmeans(vectors, 3, { seed: 5 });
    assert.deepEqual(first.assignments, second.assignments);
    assert.deepEqual(first.centroids, second.centroids);
});

test('kmeans returns normalized centroids', () => {
    const { vectors } = makeGroups(5);
    const { centroids } = kmeans(vectors, 3);
    for (const centroid of centroids) {
        const norm = Math.sqrt(centroid.reduce((sum, value) => sum + value * value, 0));
        assert.ok(Math.abs(norm - 1) < 1e-9);
    }
});

test('kmeans handles edge cases: empty input, k > n, k = 0, duplicates', () => {
    assert.deepEqual(kmeans([], 3).assignments, []);
    assert.equal(kmeans([[1, 0]], 3).centroids.length, 1);
    assert.equal(
        kmeans(
            [
                [1, 0],
                [0, 1],
            ],
            0,
        ).centroids.length,
        0,
    );

    const duplicates = kmeans(
        [
            [1, 0],
            [1, 0],
            [1, 0],
            [0, 1],
        ],
        3,
    );
    assert.equal(duplicates.assignments.length, 4);
    assert.ok(duplicates.assignments.every((a) => a >= 0 && a < 3));
});

test('kmeans rejects mixed dimensions', () => {
    assert.throws(() => kmeans([[1, 0], [1]], 2), /same dimension/);
});

test('cosineSimilarity and normalize behave on zero and mismatched vectors', () => {
    assert.ok(Math.abs(cosineSimilarity([2, 0], [5, 0]) - 1) < 1e-12);
    assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
    assert.equal(cosineSimilarity([1], [1, 2]), 0);
    assert.deepEqual(normalize([0, 0]), [0, 0]);
});

test('suggestClusterCount grows with sqrt(n) within bounds', () => {
    assert.equal(suggestClusterCount(0), 0);
    assert.equal(suggestClusterCount(3), 3); // never more clusters than recipes
    assert.equal(suggestClusterCount(50), 5);
    assert.equal(suggestClusterCount(800), 20);
    assert.equal(suggestClusterCount(100000), 24);
});
