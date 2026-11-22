import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mealKindQuery } from '../../shared/meal-planning/meal-kind';
import { buildRecipeTextQuery } from '../../shared/opensearch/client';
import { buildRecipeFilterQuery } from '../../src/lib/recipeFilters';
import {
    appendRecipeSearchContext,
    buildRecipeBoolQuery,
    parseRecipeSearchContext,
} from '../../src/lib/recipeSearchQuery';

const roundTrip = (ctx: Parameters<typeof appendRecipeSearchContext>[1]) => {
    const params = new URLSearchParams();
    appendRecipeSearchContext(params, ctx);
    return parseRecipeSearchContext(params);
};

test('context round trip, limits and validation', () => {
    const ctx = {
        kind: 'main' as const,
        excludeIds: ['a1', 'b2'],
        pickIds: ['a1'],
        week: '2026-11-23',
    };
    assert.deepEqual(roundTrip(ctx), ctx);

    const many = Array.from({ length: 250 }, (_, i) => `id${i}`);
    assert.equal(roundTrip({ excludeIds: many })?.excludeIds?.length, 200);

    const params = new URLSearchParams('kind=sauce&exclude=ok1,bad%20id&week=23.11.2026');
    assert.deepEqual(parseRecipeSearchContext(params), { excludeIds: ['ok1'] });
    assert.equal(parseRecipeSearchContext(new URLSearchParams('query=x')), undefined);
});

test('the base filter stays out of the visible filters', () => {
    const query = buildRecipeFilterQuery({ tags: ['Vegan'] }).toString();
    assert.equal(query, 'tags=Vegan');
    assert.ok(!query.includes('kind') && !query.includes('exclude'));
});

test('base filter is in filter even in OR mode', () => {
    const q = buildRecipeBoolQuery(
        { tags: ['Vegan'], maxTotalTime: 30, filterMode: 'or' },
        { kind: 'main', excludeIds: ['x1'] },
    ) as { bool: Record<string, unknown[]> };
    assert.deepEqual(q.bool.filter, [{ term: { status: 'PUBLISHED' } }, mealKindQuery('main')]);
    assert.equal(q.bool.should.length, 2);
    assert.deepEqual(q.bool.must_not, [{ terms: { id: ['x1'] } }]);
});

test('same clauses as before without context', () => {
    const q = buildRecipeBoolQuery({
        query: 'curry',
        tags: ['Vegan', 'Schnell'],
        excludeIngredients: ['Kartoffel'],
        minTotalTime: 10,
        maxTotalTime: 30,
    });
    assert.deepEqual(q, {
        bool: {
            must: [{ bool: { should: buildRecipeTextQuery('curry'), minimum_should_match: 1 } }],
            filter: [
                { term: { status: 'PUBLISHED' } },
                { bool: { must: [{ term: { tags: 'Vegan' } }, { term: { tags: 'Schnell' } }] } },
                { range: { totalTime: { gte: 10, lte: 30 } } },
            ],
            should: [],
            must_not: [{ terms: { ingredients: ['Kartoffel'] } }],
        },
    });
    const withIngredients = buildRecipeBoolQuery({
        ingredients: ['Reis'],
        difficulty: ['easy'],
        minRating: 4,
    }) as {
        bool: { filter: unknown[] };
    };
    assert.deepEqual(withIngredients.bool.filter.slice(1), [
        { bool: { must: [{ term: { ingredients: 'Reis' } }] } },
        { terms: { difficulty: ['EASY'] } },
        { range: { rating: { gte: 4 } } },
    ]);
});
