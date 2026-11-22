import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeShelfLife, suggestShelfLifeOrder } from '../../../shared/meal-planning/shelf-life';
import {
    buildPlannedSlots,
    freshnessMarkers,
    leftoverPlanSlot,
    movesToEntryUpdates,
    purchaseDateFor,
    type PlanEntryLite,
} from '../../../src/lib/meal-plan/intelligence/mappers';

let n = 0;
const entry = (over: Partial<PlanEntryLite>): PlanEntryLite => ({
    id: `e${++n}`,
    recipeId: 'r',
    date: '2026-03-09',
    slot: 'DINNER',
    position: 0,
    time: null,
    pinned: false,
    status: 'PLANNED',
    ...over,
});

describe('buildPlannedSlots', () => {
    const days = ['2026-03-09', '2026-03-10'];
    it('has one slot per day and enabled fixed slot; custom slots are skipped', () => {
        const slots = buildPlannedSlots(days, ['LUNCH', 'DINNER', 'c_snack'], []);
        assert.equal(slots.length, 4);
        assert.ok(slots.every((s) => !s.recipeId));
    });

    it('fills with the main dish and marks fixed entries', () => {
        const main = entry({ recipeId: 'main', position: 0 });
        const side = entry({ recipeId: 'side', position: 1 });
        const timed = entry({ recipeId: 'timed', date: '2026-03-10', time: '18:00' });
        const pinned = entry({ recipeId: 'pin', date: '2026-03-10', slot: 'LUNCH', pinned: true });
        const done = entry({
            recipeId: 'done',
            date: '2026-03-09',
            slot: 'LUNCH',
            status: 'COMPLETED',
        });
        const cancelled = entry({
            recipeId: 'x',
            date: '2026-03-10',
            slot: 'DINNER',
            status: 'CANCELLED',
        });
        const slots = buildPlannedSlots(
            days,
            ['LUNCH', 'DINNER'],
            [side, main, timed, pinned, done, cancelled],
        );
        const find = (date: string, slot: string) =>
            slots.find((s) => s.date === date && s.slot === slot)!;
        assert.equal(find('2026-03-09', 'DINNER').recipeId, 'main');
        assert.equal(find('2026-03-09', 'DINNER').fixedTime, undefined);
        assert.equal(find('2026-03-10', 'DINNER').recipeId, 'timed');
        assert.equal(find('2026-03-10', 'DINNER').fixedTime, '18:00');
        assert.ok(find('2026-03-10', 'LUNCH').fixedTime);
        assert.ok(find('2026-03-09', 'LUNCH').fixedTime);
    });
});

describe('shelf-life moves and markers', () => {
    const recipes = [
        {
            id: 'fish',
            title: 'Fisch',
            ingredients: [{ ingredientId: 'lachs', name: 'Lachs', days: 1 }],
        },
        {
            id: 'rice',
            title: 'Reis',
            ingredients: [{ ingredientId: 'reis', name: 'Reis', days: 300 }],
        },
        {
            id: 'stew',
            title: 'Eintopf',
            ingredients: [{ ingredientId: 'kohl', name: 'Kohl', days: 7 }],
        },
    ];
    const entries = [
        entry({ id: 'a', recipeId: 'rice', date: '2026-03-09' }),
        entry({ id: 'a-side', recipeId: 'salat', date: '2026-03-09', position: 1 }),
        entry({ id: 'b', recipeId: 'stew', date: '2026-03-10' }),
        entry({ id: 'c', recipeId: 'fish', date: '2026-03-11' }),
    ];
    const slots = buildPlannedSlots(
        ['2026-03-09', '2026-03-10', '2026-03-11'],
        ['DINNER'],
        entries,
    );
    const input = { slots, recipes, purchaseDate: '2026-03-09' };

    it('marks tight and warning dishes only', () => {
        const markers = freshnessMarkers(analyzeShelfLife(input), entries);
        assert.deepEqual(Object.keys(markers), ['c']);
        assert.equal(markers.c[0].tone, 'warn');
        assert.match(markers.c[0].label, /Lachs/);
    });

    it('turns a proposal into entry updates that move whole cells', () => {
        const proposal = suggestShelfLifeOrder(input);
        assert.equal(proposal.changed, true);
        const updates = movesToEntryUpdates(proposal.moves, entries);
        // the fish moves to the first day; the rice cell (with its side dish) moves away
        const fish = updates.find((u) => u.entryId === 'c');
        assert.equal(fish?.date, '2026-03-09');
        const ricePair = updates.filter((u) => u.entryId === 'a' || u.entryId === 'a-side');
        assert.equal(ricePair.length, 2);
        assert.equal(ricePair[0].date, ricePair[1].date);
        assert.notEqual(ricePair[0].date, '2026-03-09');
    });
});

describe('leftoverPlanSlot', () => {
    it('prefers a free dinner, then lunch', () => {
        const date = '2026-03-10';
        assert.equal(leftoverPlanSlot(date, ['LUNCH', 'DINNER'], []), 'DINNER');
        assert.equal(
            leftoverPlanSlot(
                date,
                ['LUNCH', 'DINNER'],
                [{ date, slot: 'DINNER', status: 'PLANNED' }],
            ),
            'LUNCH',
        );
        assert.equal(
            leftoverPlanSlot(
                date,
                ['LUNCH', 'DINNER'],
                [
                    { date, slot: 'DINNER', status: 'PLANNED' },
                    { date, slot: 'LUNCH', status: 'PLANNED' },
                ],
            ),
            'DINNER',
        );
    });
});

describe('purchaseDateFor', () => {
    it('is the next shopping day on or after today, else today', () => {
        // 2026-03-10 is a Tuesday
        assert.equal(purchaseDateFor('2026-03-10', 6), '2026-03-14');
        assert.equal(purchaseDateFor('2026-03-10', 2), '2026-03-10');
        assert.equal(purchaseDateFor('2026-03-10', 1), '2026-03-16');
        assert.equal(purchaseDateFor('2026-03-10', null), '2026-03-10');
    });
});

describe('buildPlannedSlots with today', () => {
    it('leaves out empty slots of past days but keeps filled ones', () => {
        const past = entry({ date: '2026-03-09', recipeId: 'old' });
        const slots = buildPlannedSlots(['2026-03-09', '2026-03-10'], ['DINNER', 'LUNCH'], [past], {
            today: '2026-03-10',
        });
        assert.deepEqual(
            slots.map((s) => `${s.date}|${s.slot}`),
            ['2026-03-09|DINNER', '2026-03-10|DINNER', '2026-03-10|LUNCH'],
        );
    });
});
