import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mealKindQuery } from '../../shared/meal-planning/meal-kind';
import { buildRecipeTextQuery } from '../../shared/opensearch/client';
import { buildRecipeFilterQuery, parseRecipeFilterParams } from '../../shared/recipe-filters';
import {
    appendRecipeSearchContext,
    buildRecipeBoolQuery,
    parseRecipeSearchContext,
    semanticPrependAllowed,
    weekPlanClauses,
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

test('semantic hits are never prepended under a base filter (week selection)', () => {
    const base = { query: 'schnelles abendessen mit hähnchen', userId: 'u1', page: 1 };
    assert.equal(semanticPrependAllowed(base), true);
    assert.equal(semanticPrependAllowed({ ...base, context: { kind: 'main' } }), false);
    assert.equal(semanticPrependAllowed({ ...base, context: { excludeIds: ['r1'] } }), false);
    assert.equal(semanticPrependAllowed({ ...base, query: 'hähnchen curry' }), false);
    assert.equal(semanticPrependAllowed({ ...base, page: 2 }), false);
    assert.equal(semanticPrependAllowed({ ...base, userId: undefined }), false);
});

test('week plan quick filter: parsed from the URL, data only from the server (KUC-131)', () => {
    const filters = parseRecipeFilterParams(new URLSearchParams('weekPlan=with&tags=Vegan'));
    assert.equal(filters.weekPlan, 'with');
    assert.equal(buildRecipeFilterQuery(filters).get('weekPlan'), 'with');
    assert.equal(parseRecipeFilterParams(new URLSearchParams('weekPlan=Hack')).weekPlan, undefined);

    const week = { mainIngredients: ['Hackfleisch', 'Spaghetti'], recipeIds: ['r1'] };
    const withWeek = buildRecipeBoolQuery(
        { weekPlan: 'with', filterMode: 'or' },
        undefined,
        week,
    ) as {
        bool: Record<string, unknown[]>;
    };
    assert.deepEqual(withWeek.bool.filter, [
        { term: { status: 'PUBLISHED' } },
        { terms: { ingredients: ['Hackfleisch', 'Spaghetti'] } },
    ]);
    assert.deepEqual(withWeek.bool.must_not, [{ terms: { id: ['r1'] } }]);

    const without = buildRecipeBoolQuery({ weekPlan: 'without' }, undefined, week) as {
        bool: Record<string, unknown[]>;
    };
    assert.deepEqual(without.bool.must_not, [
        { terms: { mainIngredients: ['Hackfleisch', 'Spaghetti'] } },
    ]);

    // Empty plan or no server data: the filter does nothing
    assert.deepEqual(weekPlanClauses('with', { mainIngredients: [], recipeIds: [] }), {
        filter: [],
        mustNot: [],
    });
    assert.deepEqual(weekPlanClauses('without', undefined), { filter: [], mustNot: [] });
});

test('no semantic hits under a personal filter', () => {
    const base = { query: 'schnelles abendessen mit hähnchen', userId: 'u1', page: 1 };
    assert.equal(semanticPrependAllowed({ ...base, personal: true }), false);
});
