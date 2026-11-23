import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RankingRecipe } from '../recipe-ranking/features';

import {
    convertAmount,
    leftoverReason,
    rankByLeftovers,
    scoreLeftoverUse,
    urgencyWeight,
    type PantryStock,
} from './leftover-score';

const TODAY = '2026-11-24';
const OPTIONS = { household: 4, today: TODAY };

const mince: PantryStock = {
    ingredientId: 'hack',
    name: 'Hackfleisch',
    amountBase: 300,
    unitBase: 'g',
};

function recipe(
    id: string,
    lines: { id: string; amount?: number; unit?: 'g' | 'ml' | 'Stk'; optional?: boolean }[],
    servings = 4,
): RankingRecipe {
    return {
        id,
        title: id,
        categorySlugs: [],
        tags: [],
        ingredients: lines.map((line) => ({
            id: line.id,
            name: line.id,
            root: null,
            optional: line.optional ?? false,
            ...(line.amount !== undefined && { amount: line.amount, unit: line.unit ?? 'g' }),
        })),
        servings,
        rating: 0,
        ratingCount: 0,
        totalTime: 30,
        difficulty: 'MEDIUM',
        stepCount: 3,
        embedding: null,
    };
}

test('whole use: needing all of it or more uses the leftover up completely', () => {
    const exact = scoreLeftoverUse(
        recipe('exact', [{ id: 'hack', amount: 300 }]),
        [mince],
        OPTIONS,
    );
    assert.equal(exact.score, 1);
    assert.deepEqual(exact.uses[0], {
        ingredientId: 'hack',
        name: 'Hackfleisch',
        amount: 300,
        unit: 'g',
        share: 1,
        urgency: 1,
    });
    const more = scoreLeftoverUse(recipe('more', [{ id: 'hack', amount: 500 }]), [mince], OPTIONS);
    assert.equal(more.score, 1, 'a recipe never uses more than is left');
    assert.equal(more.uses[0]!.amount, 300);
    assert.equal(leftoverReason(more.uses), 'Verbraucht 300 g Hackfleisch');
});

test('partial use counts by share; household scaling applies', () => {
    const half = scoreLeftoverUse(recipe('half', [{ id: 'hack', amount: 150 }]), [mince], OPTIONS);
    assert.equal(half.score, 0.5);
    // 300 g for 4 servings are 150 g for a household of 2
    const scaled = scoreLeftoverUse(recipe('scaled', [{ id: 'hack', amount: 300 }]), [mince], {
        ...OPTIONS,
        household: 2,
    });
    assert.equal(scaled.score, 0.5);
    // Several pantry items add up; the best use comes first in the reason
    const cream: PantryStock = {
        ingredientId: 'sahne',
        name: 'Sahne',
        amountBase: 200,
        unitBase: 'ml',
    };
    const both = scoreLeftoverUse(
        recipe('both', [
            { id: 'sahne', amount: 50, unit: 'ml' },
            { id: 'hack', amount: 300 },
        ]),
        [mince, cream],
        OPTIONS,
    );
    assert.equal(both.score, 1.25);
    assert.equal(leftoverReason(both.uses), 'Verbraucht 300 g Hackfleisch und 50 ml Sahne');
});

test('unknown amounts, optional lines and other ingredients add nothing', () => {
    const none = recipe('none', [
        { id: 'hack' },
        { id: 'hack-opt', amount: 300, optional: true },
        { id: 'mehl', amount: 300 },
    ]);
    assert.deepEqual(
        scoreLeftoverUse(none, [mince, { ...mince, ingredientId: 'hack-opt' }], OPTIONS),
        {
            score: 0,
            uses: [],
        },
    );
});

test('urgency: expiring today counts three times, falling to 1 at a week; expired = 0', () => {
    assert.equal(urgencyWeight(TODAY, undefined), 1);
    assert.equal(urgencyWeight(TODAY, TODAY), 3);
    assert.ok(Math.abs(urgencyWeight(TODAY, '2026-11-27') - (1 + (2 * 4) / 7)) < 1e-9);
    assert.equal(urgencyWeight(TODAY, '2026-12-01'), 1);
    assert.equal(urgencyWeight(TODAY, '2026-12-20'), 1);
    assert.equal(urgencyWeight(TODAY, '2026-11-23'), 0);

    // The same half use is worth more when the leftover expires sooner
    const dish = recipe('r', [{ id: 'hack', amount: 150 }]);
    const soon = scoreLeftoverUse(dish, [{ ...mince, expiresOn: TODAY }], OPTIONS);
    const later = scoreLeftoverUse(dish, [{ ...mince, expiresOn: '2026-12-10' }], OPTIONS);
    assert.equal(soon.score, 1.5);
    assert.equal(later.score, 0.5);
    const expired = scoreLeftoverUse(dish, [{ ...mince, expiresOn: '2026-11-20' }], OPTIONS);
    assert.equal(expired.score, 0);
});

test('unit conversion: pieces and grams via the piece weight; ml and grams never mix', () => {
    assert.equal(convertAmount(2, 'Stk', 'g', 80), 160);
    assert.equal(convertAmount(160, 'g', 'Stk', 80), 2);
    assert.equal(convertAmount(2, 'Stk', 'g', null), null);
    assert.equal(convertAmount(100, 'ml', 'g', 80), null);

    // Pantry has 400 g onions (80 g each); the recipe needs 2 pieces = 160 g
    const onions: PantryStock = {
        ingredientId: 'zwiebel',
        name: 'Zwiebeln',
        amountBase: 400,
        unitBase: 'g',
        gramsPerPiece: 80,
    };
    const dish = recipe('r', [{ id: 'zwiebel', amount: 2, unit: 'Stk' }]);
    const used = scoreLeftoverUse(dish, [onions], OPTIONS);
    assert.equal(used.score, 0.4);
    assert.equal(leftoverReason(used.uses), 'Verbraucht 160 g Zwiebeln');
    // Without a piece weight the amounts do not compare
    assert.equal(scoreLeftoverUse(dish, [{ ...onions, gramsPerPiece: null }], OPTIONS).score, 0);
    // Two posts of one ingredient (pieces and grams) add up, the earliest expiry counts
    const posts: PantryStock[] = [
        { ...onions, amountBase: 240, expiresOn: '2026-12-10' },
        { ...onions, amountBase: 2, unitBase: 'Stk', expiresOn: TODAY },
    ];
    const merged = scoreLeftoverUse(dish, posts, OPTIONS);
    assert.equal(merged.uses[0]!.share, 0.4);
    assert.equal(merged.uses[0]!.urgency, 3);
});

test('ranking: best use first, unused recipes left out, ties keep the input order', () => {
    const ranked = rankByLeftovers(
        [
            recipe('a-half', [{ id: 'hack', amount: 150 }]),
            recipe('unrelated', [{ id: 'mehl', amount: 300 }]),
            recipe('b-full', [{ id: 'hack', amount: 300 }]),
            recipe('c-half', [{ id: 'hack', amount: 150 }]),
        ],
        [mince],
        OPTIONS,
    );
    assert.deepEqual(
        ranked.map((r) => r.id),
        ['b-full', 'a-half', 'c-half'],
    );
    assert.equal(ranked[0]!.reason, 'Verbraucht 300 g Hackfleisch');
    assert.deepEqual(rankByLeftovers([recipe('x', [{ id: 'hack', amount: 1 }])], [], OPTIONS), []);
});
