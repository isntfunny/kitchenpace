import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    clearedFilters,
    countActiveFilters,
    toggleFilterSet,
    type FiltersWithSort,
} from '../../src/app/recipes/components/filter-state';
import type { FilterSetWithRelations } from '../../src/lib/fits-now/db-queries';

const filterSet = (id: string, tags: string[], categories: string[] = []) =>
    ({
        id,
        tags: tags.map((name) => ({ tag: { name } })),
        categories: categories.map((slug) => ({ category: { slug } })),
        ingredients: [],
    }) as unknown as FilterSetWithRelations;

test('clears every filter but keeps the sort', () => {
    const prev: FiltersWithSort = {
        sort: 'fastest',
        query: 'curry',
        tags: ['Vegan'],
        excludeIngredients: ['Kartoffel'],
        maxTotalTime: 30,
        filterSetId: 'fs1',
    };
    const next = clearedFilters(prev);
    assert.equal(next.sort, 'fastest');
    assert.equal(next.query, undefined);
    assert.equal(next.filterSetId, undefined);
    assert.equal(next.maxTotalTime, undefined);
    assert.deepEqual(next.tags, []);
    assert.deepEqual(next.excludeIngredients, []);
    assert.deepEqual(next.categories, []);
});

test('filter set on, switch, off', () => {
    const a = filterSet('A', ['Herbst'], ['suppe']);
    const b = filterSet('B', ['Schnell']);
    const all = [a, b];
    const start: FiltersWithSort = { sort: 'rating', tags: ['Vegan'] };

    const onA = toggleFilterSet(start, a, all);
    assert.equal(onA.filterSetId, 'A');
    assert.deepEqual(onA.tags, ['Vegan', 'Herbst']);
    assert.deepEqual(onA.categories, ['suppe']);

    const onB = toggleFilterSet(onA, b, all);
    assert.equal(onB.filterSetId, 'B');
    assert.deepEqual(onB.tags, ['Vegan', 'Schnell']);
    assert.deepEqual(onB.categories, []);

    const off = toggleFilterSet(onB, b, all);
    assert.equal(off.filterSetId, undefined);
    assert.deepEqual(off.tags, ['Vegan']);
});

test('counts arrays, numbers and query', () => {
    assert.equal(countActiveFilters({ tags: ['a', 'b'], minRating: 4, query: '  ' }), 3);
    assert.equal(countActiveFilters({ query: 'x', excludeIngredients: ['y'] }), 2);
});

test('history mode: first write, typing and restore replace; a discrete change pushes', async () => {
    const { historyModeFor } = await import('../../src/app/recipes/components/filter-state');
    assert.equal(historyModeFor('user', true), 'replace');
    assert.equal(historyModeFor('typing', false), 'replace');
    assert.equal(historyModeFor('restore', false), 'replace');
    assert.equal(historyModeFor('user', false), 'push');
});
