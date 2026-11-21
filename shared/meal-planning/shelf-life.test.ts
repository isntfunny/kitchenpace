import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    analyzeShelfLife,
    suggestShelfLifeOrder,
    type ShelfLifeInput,
    type ShelfLifeRecipe,
} from './shelf-life';
import type { PlannedSlot } from './types';

const PURCHASE = '2026-11-23'; // Monday
const day = (n: number) => `2026-11-${String(23 + n).padStart(2, '0')}`;

const recipes: ShelfLifeRecipe[] = [
    {
        id: 'spinat',
        title: 'Spinatlasagne',
        ingredients: [
            { ingredientId: 'spinat', name: 'Spinat', days: 2 },
            { ingredientId: 'nudeln', name: 'Nudeln', days: 365 },
        ],
    },
    {
        id: 'karotten',
        title: 'Karottensuppe',
        ingredients: [{ ingredientId: 'karotte', name: 'Karotten', days: 14 }],
    },
    {
        id: 'mystery',
        title: 'Überraschung',
        ingredients: [{ ingredientId: 'x' }, { ingredientId: 'y', days: null }],
    },
    {
        id: 'fisch',
        title: 'Lachs',
        ingredients: [{ ingredientId: 'lachs', name: 'Lachs', days: 1 }],
    },
];

const dinner = (n: number, recipeId?: string, fixedTime?: string): PlannedSlot => ({
    date: day(n),
    slot: 'DINNER',
    recipeId,
    fixedTime,
});

const input = (slots: PlannedSlot[], extra: ShelfLifeRecipe[] = []): ShelfLifeInput => ({
    slots,
    recipes: [...recipes, ...extra],
    purchaseDate: PURCHASE,
});

test('the dish takes the earliest deadline of its raw ingredients', () => {
    const [dish] = analyzeShelfLife(input([dinner(0, 'spinat')]));
    assert.equal(dish.shelfLifeDays, 2);
    assert.equal(dish.limitingIngredient?.ingredientId, 'spinat');
    assert.equal(dish.status, 'ok');
});

test('warning after the last usable day, tight on it, ok before; German messages', () => {
    assert.equal(analyzeShelfLife(input([dinner(1, 'spinat')]))[0].status, 'ok'); // day 1 of 2

    const tight = analyzeShelfLife(input([dinner(2, 'spinat')]))[0];
    assert.equal(tight.status, 'tight');
    assert.match(tight.message!, /Spinat.*Mittwoch.*letzten Tag/);

    const late = analyzeShelfLife(input([dinner(4, 'spinat')]))[0];
    assert.equal(late.status, 'warning');
    assert.match(late.message!, /Spinat hält nur etwa 2 Tage.*Freitag/);
});

test('ingredients without a shelf life are never critical and never throw', () => {
    const [unknown, missingRecipe] = analyzeShelfLife(
        input([dinner(6, 'mystery'), { date: day(5), slot: 'LUNCH', recipeId: 'does-not-exist' }]),
    ).sort((a, b) => b.date.localeCompare(a.date));
    assert.equal(unknown.status, 'unknown');
    assert.equal(unknown.shelfLifeDays, null);
    assert.equal(unknown.message, undefined);
    assert.equal(missingRecipe.status, 'unknown');

    const mixed = analyzeShelfLife(
        input(
            [dinner(0, 'x1')],
            [
                {
                    id: 'x1',
                    ingredients: [
                        { ingredientId: 'a' },
                        { ingredientId: 'b', days: 5 },
                        { ingredientId: 'c', days: 0 },
                    ],
                },
            ],
        ),
    )[0];
    assert.equal(mixed.shelfLifeDays, 5); // unknown and invalid values are skipped
});

test('shared ingredients get the same (shortest) deadline in every dish', () => {
    const shared: ShelfLifeRecipe[] = [
        { id: 'a', ingredients: [{ ingredientId: 'milch', name: 'Milch', days: 3 }] },
        { id: 'b', ingredients: [{ ingredientId: 'milch', name: 'Milch', days: 7 }] },
    ];
    const result = analyzeShelfLife({
        slots: [dinner(1, 'a'), dinner(5, 'b')],
        recipes: shared,
        purchaseDate: PURCHASE,
    });
    assert.deepEqual(
        result.map((d) => d.shelfLifeDays),
        [3, 3],
    );
    assert.deepEqual(
        result.map((d) => d.status),
        ['ok', 'warning'],
    );
});

test('days before the purchase day count as day 0', () => {
    const [dish] = analyzeShelfLife({
        slots: [{ date: '2026-11-20', slot: 'DINNER', recipeId: 'fisch' }],
        recipes,
        purchaseDate: PURCHASE,
    });
    assert.equal(dish.daysAfterPurchase, 0);
    assert.equal(dish.status, 'ok');
});

test('ordering moves perishable dishes forward and proposes without mutating', () => {
    const slots = [dinner(0, 'karotten'), dinner(1, 'mystery'), dinner(4, 'spinat')];
    const data = input(slots);
    const snapshot = JSON.stringify(data);

    const result = suggestShelfLifeOrder(data);

    assert.equal(JSON.stringify(data), snapshot);
    assert.equal(result.changed, true);
    assert.equal(result.warningsBefore, 1);
    assert.equal(result.warningsAfter, 0);
    const bySlot = new Map(result.proposed.map((s) => [s.date, s.recipeId]));
    assert.equal(bySlot.get(day(0)), 'spinat');
    assert.equal(bySlot.get(day(1)), 'mystery', 'dish without data stays');
    assert.equal(bySlot.get(day(4)), 'karotten');
    assert.deepEqual(
        result.moves.map((m) => [m.recipeId, m.from.date, m.to.date]),
        [
            ['spinat', day(4), day(0)],
            ['karotten', day(0), day(4)],
        ],
    );
    assert.ok(
        result.reasons.some((r) =>
            /Spinatlasagne rückt von Freitag auf Montag vor.*Spinat/.test(r),
        ),
    );
    assert.ok(result.reasons.some((r) => /Warnungen von 1 auf 0/.test(r)));
});

test('slots with a fixed time stay, even if that leaves a warning', () => {
    const slots = [dinner(0, 'karotten', '19:00'), dinner(4, 'spinat')];
    const result = suggestShelfLifeOrder(input(slots));
    assert.equal(result.changed, false);
    assert.deepEqual(
        result.proposed.map((s) => s.recipeId),
        ['karotten', 'spinat'],
    );
    assert.equal(result.remaining.length, 1);
    assert.equal(result.remaining[0].recipeId, 'spinat');
});

test('a fixed slot is skipped while the movable ones are still ordered', () => {
    const slots = [dinner(0, 'karotten', '19:00'), dinner(2, 'karotten2'), dinner(5, 'spinat')];
    const result = suggestShelfLifeOrder(
        input(slots, [{ id: 'karotten2', ingredients: [{ ingredientId: 'k2', days: 10 }] }]),
    );
    const bySlot = new Map(result.proposed.map((s) => [s.date, s.recipeId]));
    assert.equal(bySlot.get(day(0)), 'karotten');
    assert.equal(bySlot.get(day(2)), 'spinat');
    assert.equal(bySlot.get(day(5)), 'karotten2');
});

test('meal types are never mixed: lunch stays lunch', () => {
    const slots: PlannedSlot[] = [
        { date: day(0), slot: 'LUNCH', recipeId: 'karotten' },
        { date: day(4), slot: 'DINNER', recipeId: 'spinat' },
    ];
    const result = suggestShelfLifeOrder(input(slots));
    assert.equal(result.changed, false);
    assert.equal(result.warningsAfter, 1);
});

test('nothing to do: durable or unknown dishes never shuffle, empty plans are fine', () => {
    const calm = suggestShelfLifeOrder(
        input(
            [dinner(0, 'karotten'), dinner(3, 'mystery'), dinner(5, 'nudeln-only')],
            [{ id: 'nudeln-only', ingredients: [{ ingredientId: 'n', days: 365 }] }],
        ),
    );
    assert.equal(calm.changed, false);
    assert.deepEqual(calm.moves, []);
    assert.match(calm.reasons[0], /passt bereits/);

    const empty = suggestShelfLifeOrder(input([dinner(0), dinner(1)]));
    assert.equal(empty.changed, false);
    assert.equal(empty.proposed.length, 2);
});

test('dishes sharing a perishable ingredient are ordered by the same deadline', () => {
    const extra: ShelfLifeRecipe[] = [
        { id: 'a', title: 'A', ingredients: [{ ingredientId: 'sahne', name: 'Sahne', days: 2 }] },
        { id: 'b', title: 'B', ingredients: [{ ingredientId: 'sahne', name: 'Sahne', days: 6 }] },
        { id: 'c', title: 'C', ingredients: [{ ingredientId: 'reis', days: 300 }] },
    ];
    const result = suggestShelfLifeOrder(
        input([dinner(1, 'c'), dinner(4, 'a'), dinner(5, 'b')], extra),
    );
    const order = [...result.proposed]
        .sort((x, y) => x.date.localeCompare(y.date))
        .map((s) => s.recipeId);
    // Both Sahne dishes share the deadline (2 days), so both go before the durable rice dish.
    // Only one slot lies within the deadline, so one warning stays: better than two before.
    assert.deepEqual(order, ['a', 'b', 'c']);
    assert.equal(result.warningsBefore, 2);
    assert.equal(result.warningsAfter, 1);
    assert.equal(result.remaining.length, 1);
});
