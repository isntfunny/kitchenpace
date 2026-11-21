import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dropForeignDimensions, normalizeSimilarity } from './theme-cluster-processor';

test('normalizeSimilarity accepts percentages and fractions', () => {
    assert.equal(normalizeSimilarity(80), 0.8);
    assert.equal(normalizeSimilarity(0.8), 0.8);
    assert.equal(normalizeSimilarity(undefined), undefined);
    assert.equal(normalizeSimilarity(Number.NaN), undefined);
});

test('dropForeignDimensions keeps only the most common embedding dimension', () => {
    const make = (id: string, dimension: number) => ({
        recipeId: id,
        embedding: new Array(dimension).fill(0.1),
        tags: [],
        categories: [],
    });
    const kept = dropForeignDimensions([make('a', 3), make('b', 3), make('c', 2), make('d', 3)]);
    assert.deepEqual(
        kept.map((r) => r.recipeId),
        ['a', 'b', 'd'],
    );
    assert.deepEqual(dropForeignDimensions([]), []);
});
