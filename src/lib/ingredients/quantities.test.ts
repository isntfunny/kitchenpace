import assert from 'node:assert/strict';
import { test } from 'node:test';

import { portionFactor, scaleQuantity, scaleMentionOverride } from './quantities';

test('scales original quantities without losing fractions, ranges or tiny amounts', () => {
    for (const [raw, factor, expected] of [
        ['1/2', 2, '1'],
        ['1 1/2', 2, '3'],
        ['½', 2, '1'],
        ['1½', 2, '3'],
        ['0,5', 2, '1'],
        ['0.5', 2, '1'],
        ['2–3', 2, '4–6'],
        ['2-3', 0.5, '1–1,5'],
        ['0,001', 2, '0,002'],
        ['1/2', 1, '1/2'],
        ['nach Geschmack', 2, 'nach Geschmack'],
        ['', 2, ''],
        ['1/0', 2, '1/0'],
        ['2', Infinity, '2'],
        ['2', 0, '2'],
        ['2', NaN, '2'],
        ['ca. 3', 2, 'ca. 3'],
        ['2 oder 3', 2, '2 oder 3'],
        ['0', 2, '0'],
    ] as const)
        assert.equal(scaleQuantity(raw, factor), expected, `${raw} × ${factor}`);
    assert.notEqual(scaleQuantity('0.0000001', 0.1), '0');
});
test('scales explicit partial amounts but leaves free text untouched', () => {
    assert.equal(scaleMentionOverride('100 ml', 2), '200 ml');
    assert.equal(scaleMentionOverride('1/2 TL', 2), '1 TL');
    assert.equal(scaleMentionOverride('2–3 g', 2), '4–6 g');
    assert.equal(scaleMentionOverride('nach Geschmack', 2), 'nach Geschmack');
    assert.equal(scaleMentionOverride('zum Frittieren', 2), 'zum Frittieren');
    assert.equal(scaleMentionOverride('100 ml', 1), '100 ml');
});
test('portion factors reject invalid values', () => {
    assert.equal(portionFactor(10, 5), 2);
    for (const [a, b] of [
        [10, 0],
        [0, 5],
        [-1, 5],
        [Infinity, 5],
        [5, NaN],
    ])
        assert.equal(portionFactor(a, b), 1);
});
