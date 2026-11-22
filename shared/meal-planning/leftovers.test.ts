import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RankingRecipe } from '../recipe-ranking/features';

import {
    isReliableLeftover,
    neededAmount,
    suggestLeftoverRecipes,
    tasteScoreOf,
    type Leftover,
} from './leftovers';

const TODAY = '2026-11-24'; // Tuesday
const cream: Leftover = {
    id: 'left-1',
    ingredientId: 'sahne',
    name: 'Sahne',
    amountBase: 100,
    unitBase: 'ml',
    expiresOn: '2026-11-26', // Thursday
};

/** Unit taste profile; a recipe embedding at angle acos(2t − 1) has the taste score t. */
const PROFILE = [1, 0];
const embeddingFor = (taste: number) => {
    const cos = 2 * taste - 1;
    return [cos, Math.sqrt(1 - cos * cos)];
};
/** Household = the recipes' servings, so the amounts are taken as they are. */
const SETUP = { profile: PROFILE, household: 4 };

function dish(
    id: string,
    amount: number | undefined,
    patch: { taste?: number; totalTime?: number; servings?: number } = {},
    unit: 'ml' | 'g' = 'ml',
): RankingRecipe {
    return {
        id,
        title: id,
        categorySlugs: [],
        tags: [],
        ingredients: [
            {
                id: 'sahne',
                name: 'sahne',
                root: null,
                optional: false,
                ...(amount !== undefined && { amount, unit }),
            },
        ],
        servings: patch.servings ?? 4,
        rating: 0,
        ratingCount: 0,
        totalTime: patch.totalTime ?? 30,
        difficulty: 'MEDIUM',
        stepCount: 3,
        embedding: patch.taste === undefined ? null : embeddingFor(patch.taste),
    };
}

test('offers up to three recipes whose need fits the leftover, best use first', () => {
    const [hint] = suggestLeftoverRecipes({
        leftovers: [cream],
        today: TODAY,
        ...SETUP,
        recipes: [
            dish('full', 100),
            dish('half', 50),
            dish('quarter', 25),
            dish('tenth', 10),
            dish('too-much', 200),
            dish('no-amount', undefined),
            dish('wrong-unit', 100, {}, 'g'),
            {
                ...dish('unrelated', undefined, { totalTime: 20 }),
                ingredients: [
                    {
                        id: 'mehl',
                        name: 'mehl',
                        root: null,
                        optional: false,
                        amount: 100,
                        unit: 'g',
                    },
                ],
            },
        ],
    });
    assert.ok(hint);
    assert.deepEqual(
        hint.recipes.map((r) => r.recipeId),
        ['full', 'half', 'quarter'],
    );
    assert.match(hint.recipes[0].reasons[0], /Verbraucht Sahne komplett \(100 ml\)/);
    assert.match(hint.recipes[1].reasons[0], /100 ml Sahne reichen, es werden 50 ml gebraucht/);
    assert.ok(hint.recipes.every((r) => r.reasons.length >= 1 && r.reasons.length <= 2));
});

test('the hint targets the day before the expiry and names the leftover in German', () => {
    const [hint] = suggestLeftoverRecipes({
        leftovers: [cream],
        today: TODAY,
        ...SETUP,
        recipes: [dish('a', 50)],
    });
    assert.equal(hint.suggestedDate, '2026-11-25');
    assert.equal(hint.expiresOn, '2026-11-26');
    assert.match(hint.message, /ca\. 100 ml Sahne, die Donnerstag ablaufen/);

    const [soon] = suggestLeftoverRecipes({
        leftovers: [{ ...cream, expiresOn: TODAY }],
        today: TODAY,
        ...SETUP,
        recipes: [dish('a', 50)],
    });
    assert.equal(soon.suggestedDate, TODAY, 'never in the past');
    assert.match(soon.message, /heute ablaufen/);
});

test('taste and duration break ties between equally fitting recipes', () => {
    const [hint] = suggestLeftoverRecipes({
        leftovers: [cream],
        today: TODAY,
        ...SETUP,
        recipes: [
            dish('meh', 50, { taste: 0.2 }),
            dish('fav', 50, { taste: 0.95 }),
            dish('slow', 50, { taste: 0.95, totalTime: 120 }),
        ],
    });
    assert.deepEqual(
        hint.recipes.map((r) => r.recipeId),
        ['fav', 'slow', 'meh'],
    );
    assert.match(hint.recipes[0].reasons.join(' '), /Geschmack/);
});

test('no hint without reliable data', () => {
    const recipes = [dish('a', 50)];
    const cases: Leftover[] = [
        { ...cream, amountBase: undefined },
        { ...cream, amountBase: 0 },
        { ...cream, unitBase: undefined },
        { ...cream, expiresOn: undefined },
    ];
    for (const leftover of cases) {
        assert.equal(isReliableLeftover(leftover), false);
        assert.deepEqual(
            suggestLeftoverRecipes({ ...SETUP, leftovers: [leftover], today: TODAY, recipes }),
            [],
        );
    }
    assert.equal(isReliableLeftover(cream), true);
});

test('rejected leftovers never come back', () => {
    const input = { ...SETUP, leftovers: [cream], today: TODAY, recipes: [dish('a', 50)] };
    assert.equal(suggestLeftoverRecipes(input).length, 1);
    assert.deepEqual(suggestLeftoverRecipes({ ...input, rejectedLeftoverIds: ['left-1'] }), []);
    // another leftover of the same ingredient is a different leftover
    const other = { ...cream, id: 'left-2' };
    const hints = suggestLeftoverRecipes({
        ...input,
        leftovers: [cream, other],
        rejectedLeftoverIds: ['left-1'],
    });
    assert.deepEqual(
        hints.map((h) => h.leftoverId),
        ['left-2'],
    );
});

test('only soon-expiring leftovers, never expired ones; most urgent first', () => {
    const base = { ...SETUP, today: TODAY, recipes: [dish('a', 50)] };
    assert.deepEqual(
        suggestLeftoverRecipes({ ...base, leftovers: [{ ...cream, expiresOn: '2026-11-23' }] }),
        [],
    );
    assert.deepEqual(
        suggestLeftoverRecipes({ ...base, leftovers: [{ ...cream, expiresOn: '2026-12-10' }] }),
        [],
    );
    assert.equal(
        suggestLeftoverRecipes({
            ...base,
            leftovers: [{ ...cream, expiresOn: '2026-11-30' }],
            windowDays: 7,
        }).length,
        1,
    );

    const order = suggestLeftoverRecipes({
        ...base,
        leftovers: [
            { ...cream, id: 'late', expiresOn: '2026-11-27' },
            { ...cream, id: 'early', expiresOn: '2026-11-25' },
        ],
    });
    assert.deepEqual(
        order.map((h) => h.leftoverId),
        ['early', 'late'],
    );
});

test('maxRecipes is respected and no match means no hint', () => {
    const many = Array.from({ length: 6 }, (_, i) => dish(`d${i}`, 50));
    const [hint] = suggestLeftoverRecipes({
        leftovers: [cream],
        today: TODAY,
        ...SETUP,
        recipes: many,
        maxRecipes: 2,
    });
    assert.equal(hint.recipes.length, 2);
    assert.deepEqual(
        suggestLeftoverRecipes({
            leftovers: [cream],
            today: TODAY,
            ...SETUP,
            recipes: [dish('big', 500)],
        }),
        [],
    );
});

test('amounts are scaled from the recipe servings to the household; the first line decides', () => {
    const recipe = dish('r', 100, { servings: 4 });
    assert.deepEqual(neededAmount(recipe, 'sahne', 2), { amount: 50, unit: 'ml' });
    assert.deepEqual(neededAmount(recipe, 'sahne', 3), { amount: 75, unit: 'ml' });
    assert.deepEqual(neededAmount({ ...recipe, servings: 0 }, 'sahne', 2), {
        amount: 100,
        unit: 'ml',
    });
    // Two lines of one ingredient: the first counts, even without an amount
    const twice: RankingRecipe = {
        ...recipe,
        ingredients: [
            { id: 'sahne', name: 'sahne', root: null, optional: false },
            { id: 'sahne', name: 'sahne', root: null, optional: false, amount: 50, unit: 'ml' },
        ],
    };
    assert.equal(neededAmount(twice, 'sahne', 4), null);
    // Optional lines are not needed
    const optional: RankingRecipe = {
        ...recipe,
        ingredients: [{ ...recipe.ingredients[0]!, optional: true }],
    };
    assert.equal(neededAmount(optional, 'sahne', 4), null);

    // 200 ml for 4 is 100 ml for 2: fits the leftover exactly
    const [hint] = suggestLeftoverRecipes({
        leftovers: [cream],
        today: TODAY,
        profile: null,
        household: 2,
        recipes: [dish('big', 200)],
    });
    assert.match(hint!.recipes[0]!.reasons[0]!, /Verbraucht Sahne komplett/);
});

test('taste is the cosine of profile and embedding mapped to 0..1; unknown is undefined', () => {
    assert.equal(tasteScoreOf(PROFILE, [1, 0]), 1);
    assert.equal(tasteScoreOf(PROFILE, [-1, 0]), 0);
    assert.equal(tasteScoreOf(PROFILE, [0, 1]), 0.5);
    assert.ok(Math.abs(tasteScoreOf(PROFILE, embeddingFor(0.8))! - 0.8) < 1e-9);
    assert.equal(tasteScoreOf(null, [1, 0]), undefined);
    assert.equal(tasteScoreOf(PROFILE, null), undefined);
    assert.equal(tasteScoreOf(PROFILE, []), undefined);
    assert.equal(tasteScoreOf(PROFILE, [1, 0, 0]), 0.5, 'other lengths compare as cosine 0');
});
