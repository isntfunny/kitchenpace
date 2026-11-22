import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assignmentStability, jaccard, keepStableLabel, matchClusters } from './match';

const prev = [
    { id: 'A', centroid: [1, 0, 0] },
    { id: 'B', centroid: [0, 1, 0] },
    { id: 'C', centroid: [0, 0, 1] },
];

test('clusters keep their id when centroids drift slightly and order changes', () => {
    const next = [
        [0.05, 0.02, 1], // C, moved
        [1, 0.1, 0], // A, moved
        [0, 1, 0.1], // B, moved
    ];
    const { matches, retiredPrevIds } = matchClusters(prev, next);
    assert.deepEqual(
        matches.map((m) => m.prevId),
        ['C', 'A', 'B'],
    );
    assert.deepEqual(retiredPrevIds, []);
    assert.ok(matches.every((m) => (m.similarity ?? 0) > 0.95));
});

test('new topics get no id, vanished topics are retired', () => {
    const next = [
        [1, 0, 0],
        [0.7, 0.7, 0.7], // matches nothing above the threshold
    ];
    const { matches, retiredPrevIds } = matchClusters(prev, next);
    assert.equal(matches[0].prevId, 'A');
    assert.equal(matches[1].prevId, null);
    assert.equal(matches[1].similarity, null);
    assert.deepEqual(retiredPrevIds, ['B', 'C']);
});

test('matching is one-to-one: two new clusters never claim the same previous id', () => {
    const next = [
        [1, 0.05, 0],
        [1, 0.2, 0],
    ];
    const { matches } = matchClusters(prev, next);
    const ids = matches.map((m) => m.prevId).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(matches[0].prevId, 'A'); // closer one wins
    assert.equal(matches[1].prevId, null);
});

test('matching handles empty sides', () => {
    assert.deepEqual(matchClusters([], [[1, 0]]).matches, [
        { nextIndex: 0, prevId: null, similarity: null },
    ]);
    assert.deepEqual(matchClusters(prev, []).retiredPrevIds, ['A', 'B', 'C']);
});

test('jaccard and label stabilisation', () => {
    assert.equal(jaccard(['a', 'b'], ['a', 'b']), 1);
    assert.equal(jaccard([], []), 1);
    assert.ok(Math.abs(jaccard(['a', 'b', 'c'], ['b', 'c', 'd']) - 0.5) < 1e-12);

    const previous = { label: 'Pasta & Italienisch', terms: ['Pasta', 'Italienisch', 'Tomate'] };
    assert.equal(
        keepStableLabel(previous, {
            label: 'Italienisch & Pasta',
            terms: ['Italienisch', 'Pasta', 'Tomate'],
        }),
        'Pasta & Italienisch',
    );
    assert.equal(
        keepStableLabel(previous, { label: 'Suppe', terms: ['Suppe', 'Eintopf'] }),
        'Suppe',
    );
});

test('assignmentStability counts only recipes present in both runs', () => {
    const before = new Map([
        ['r1', 'A'],
        ['r2', 'A'],
        ['r3', 'B'],
    ]);
    const after = new Map([
        ['r1', 'A'],
        ['r2', 'B'],
        ['r4', 'B'], // new recipe, ignored
    ]);
    assert.deepEqual(assignmentStability(before, after), { compared: 2, unchanged: 1, ratio: 0.5 });
    assert.equal(assignmentStability(new Map(), after).ratio, 1);
});
