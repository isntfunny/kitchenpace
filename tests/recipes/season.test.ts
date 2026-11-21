import assert from 'node:assert/strict';
import { test } from 'node:test';

import { detectSeason, isSeasonalFilterSetHighlighted } from '../../src/lib/fits-now/season';

test('detectSeason maps every month (0-indexed) to its season', () => {
    const expected = [
        'winter',
        'winter',
        'fruehling',
        'fruehling',
        'fruehling',
        'sommer',
        'sommer',
        'sommer',
        'herbst',
        'herbst',
        'herbst',
        'winter',
    ];
    assert.deepEqual(
        expected.map((_, month) => detectSeason(month)),
        expected,
    );
});

test('only TIME_SEASON sets of the current season are highlighted', () => {
    assert.equal(
        isSeasonalFilterSetHighlighted({ type: 'TIME_SEASON', season: 'winter' }, 'winter'),
        true,
    );
    assert.equal(
        isSeasonalFilterSetHighlighted({ type: 'TIME_SEASON', season: 'sommer' }, 'winter'),
        false,
    );
    assert.equal(
        isSeasonalFilterSetHighlighted({ type: 'TIME_SEASON', season: '*' }, 'winter'),
        false,
    );
    assert.equal(
        isSeasonalFilterSetHighlighted({ type: 'FOOD_PERIOD', season: null }, 'winter'),
        false,
    );
});
