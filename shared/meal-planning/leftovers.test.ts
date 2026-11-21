import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isReliableLeftover, suggestLeftoverRecipes, type Leftover } from './leftovers';
import type { Candidate } from './types';

const TODAY = '2026-11-24'; // Tuesday
const cream: Leftover = {
    id: 'left-1',
    ingredientId: 'sahne',
    name: 'Sahne',
    amountBase: 100,
    unitBase: 'ml',
    expiresOn: '2026-11-26', // Thursday
};

function dish(
    id: string,
    amount: number | undefined,
    patch: Partial<Candidate> = {},
    unit: 'ml' | 'g' = 'ml',
): Candidate {
    return {
        id,
        categoryId: 'c',
        totalTime: 30,
        tasteScore: 0.5,
        ingredients: [{ ingredientId: 'sahne', amountBase: amount, unitBase: unit }],
        ...patch,
    };
}

test('offers up to three recipes whose need fits the leftover, best use first', () => {
    const [hint] = suggestLeftoverRecipes({
        leftovers: [cream],
        today: TODAY,
        candidates: [
            dish('full', 100),
            dish('half', 50),
            dish('quarter', 25),
            dish('tenth', 10),
            dish('too-much', 200),
            dish('no-amount', undefined),
            dish('wrong-unit', 100, {}, 'g'),
            {
                id: 'unrelated',
                categoryId: 'c',
                totalTime: 20,
                ingredients: [{ ingredientId: 'mehl', amountBase: 100, unitBase: 'g' }],
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
        candidates: [dish('a', 50)],
    });
    assert.equal(hint.suggestedDate, '2026-11-25');
    assert.equal(hint.expiresOn, '2026-11-26');
    assert.match(hint.message, /ca\. 100 ml Sahne, die Donnerstag ablaufen/);

    const [soon] = suggestLeftoverRecipes({
        leftovers: [{ ...cream, expiresOn: TODAY }],
        today: TODAY,
        candidates: [dish('a', 50)],
    });
    assert.equal(soon.suggestedDate, TODAY, 'never in the past');
    assert.match(soon.message, /heute ablaufen/);
});

test('taste and duration break ties between equally fitting recipes', () => {
    const [hint] = suggestLeftoverRecipes({
        leftovers: [cream],
        today: TODAY,
        candidates: [
            dish('meh', 50, { tasteScore: 0.2 }),
            dish('fav', 50, { tasteScore: 0.95 }),
            dish('slow', 50, { tasteScore: 0.95, totalTime: 120 }),
        ],
    });
    assert.deepEqual(
        hint.recipes.map((r) => r.recipeId),
        ['fav', 'slow', 'meh'],
    );
    assert.match(hint.recipes[0].reasons.join(' '), /Geschmack/);
});

test('no hint without reliable data', () => {
    const candidates = [dish('a', 50)];
    const cases: Leftover[] = [
        { ...cream, amountBase: undefined },
        { ...cream, amountBase: 0 },
        { ...cream, unitBase: undefined },
        { ...cream, expiresOn: undefined },
    ];
    for (const leftover of cases) {
        assert.equal(isReliableLeftover(leftover), false);
        assert.deepEqual(
            suggestLeftoverRecipes({ leftovers: [leftover], today: TODAY, candidates }),
            [],
        );
    }
    assert.equal(isReliableLeftover(cream), true);
});

test('rejected leftovers never come back', () => {
    const input = { leftovers: [cream], today: TODAY, candidates: [dish('a', 50)] };
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
    const base = { today: TODAY, candidates: [dish('a', 50)] };
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
        candidates: many,
        maxRecipes: 2,
    });
    assert.equal(hint.recipes.length, 2);
    assert.deepEqual(
        suggestLeftoverRecipes({
            leftovers: [cream],
            today: TODAY,
            candidates: [dish('big', 500)],
        }),
        [],
    );
});
