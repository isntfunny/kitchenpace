import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cosine, hasTasteProfile } from '../../shared/recipe-ranking/vector';
import {
    MISSING_EMBEDDING_SCORE,
    paginate,
    rankByTaste,
    resolveEffectiveSort,
} from '../../src/lib/recipes/taste-ranking';

test('cosine handles identical, orthogonal, opposite, empty and zero vectors', () => {
    assert.ok(Math.abs(cosine([1, 2, 3], [2, 4, 6]) - 1) < 1e-9);
    assert.equal(cosine([1, 0], [0, 1]), 0);
    assert.ok(Math.abs(cosine([1, 0], [-1, 0]) + 1) < 1e-9);
    assert.equal(cosine([], []), 0);
    assert.equal(cosine([0, 0], [1, 1]), 0);
    assert.equal(cosine([1, 2], [1, 2, 3]), 0);
});

test('hasTasteProfile rejects missing, empty and all-zero vectors', () => {
    assert.equal(hasTasteProfile(undefined), false);
    assert.equal(hasTasteProfile(null), false);
    assert.equal(hasTasteProfile([]), false);
    assert.equal(hasTasteProfile([0, 0, 0]), false);
    assert.equal(hasTasteProfile([0, 0.2]), true);
});

test('taste sort falls back to popular for guests and users without a taste profile', () => {
    assert.equal(resolveEffectiveSort('taste', { isLoggedIn: false }), 'popular');
    assert.equal(
        resolveEffectiveSort('taste', { isLoggedIn: true, hasTasteProfile: false }),
        'popular',
    );
    assert.equal(
        resolveEffectiveSort('taste', { isLoggedIn: true, hasTasteProfile: true }),
        'taste',
    );
    assert.equal(resolveEffectiveSort('taste', { isLoggedIn: true }), 'taste');
    assert.equal(resolveEffectiveSort('rating', { isLoggedIn: false }), 'rating');
    assert.equal(
        resolveEffectiveSort('newest', { isLoggedIn: true, hasTasteProfile: false }),
        'newest',
    );
});

test('rankByTaste orders by similarity, keeps ties stable and puts missing embeddings last', () => {
    const embeddings: Record<string, number[] | undefined> = {
        far: [0, 1],
        near: [1, 0.1],
        same: [1, 0],
        tieA: [0, 1],
        none: undefined,
    };
    const ids = ['none', 'far', 'tieA', 'near', 'same'];
    const ranked = rankByTaste(ids, [1, 0], (id) => embeddings[id]);

    assert.deepEqual(
        ranked.map((entry) => entry.item),
        ['same', 'near', 'far', 'tieA', 'none'],
    );
    assert.equal(ranked.at(-1)?.score, MISSING_EMBEDDING_SCORE);
});

test('rankByTaste does not mutate the input and handles an empty pool', () => {
    const input = ['a', 'b'];
    rankByTaste(input, [1], () => [1]);
    assert.deepEqual(input, ['a', 'b']);
    assert.deepEqual(
        rankByTaste([], [1], () => [1]),
        [],
    );
});

test('paginate slices a ranked pool by 1-based page', () => {
    const pool = Array.from({ length: 70 }, (_, i) => i);
    assert.deepEqual(paginate(pool, 1, 30), pool.slice(0, 30));
    assert.deepEqual(paginate(pool, 3, 30), pool.slice(60, 70));
    assert.deepEqual(paginate(pool, 4, 30), []);
    assert.deepEqual(paginate(pool, 0, 30), pool.slice(0, 30));
});
