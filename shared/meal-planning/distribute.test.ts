import assert from 'node:assert/strict';
import test from 'node:test';

import {
    distributeSelection,
    leftoverDays,
    type SelectionPick,
    type SelectionSlot,
} from './distribute';
import { effortOf } from './effort';
import type { MealKind } from './meal-kind';

const MO = '2026-11-23';
const DI = '2026-11-24';
const MI = '2026-11-25';
const DO = '2026-11-26';
const SA = '2026-11-28';

let seq = 0;
function pick(over: Partial<SelectionPick> = {}): SelectionPick {
    const n = seq++;
    return {
        recipeId: `r${n}`,
        kind: 'main',
        servings: 2,
        effort: 0.5,
        totalTime: 30,
        mainCategory: null,
        dishType: `type${n}`,
        shortestShelfLifeDays: null,
        ...over,
    };
}
const slot = (date: string, slotKey = 'DINNER', kind: MealKind = 'main'): SelectionSlot => ({
    date,
    slotKey,
    kind,
});
const ctx = { household: 2, purchaseDate: MO };
const place = (r: ReturnType<typeof distributeSelection>, recipeId: string) =>
    r.entries.find(
        (e) => e.recipeId === recipeId && e.leftoverOf === undefined && e.sideOf === undefined,
    );

test('effort and leftover days', () => {
    assert.equal(effortOf({ stepCount: 1, totalTime: 0, difficulty: 'EASY' }), 0);
    assert.equal(effortOf({ stepCount: 16, totalTime: 120, difficulty: 'HARD' }), 1);
    assert.equal(effortOf({ stepCount: 1, totalTime: 60, difficulty: 'MEDIUM' }), 0.33);
    assert.equal(leftoverDays(2, 2), 0);
    assert.equal(leftoverDays(3, 2), 0);
    assert.equal(leftoverDays(4, 2), 1);
    assert.equal(leftoverDays(6, 2), 2);
    assert.equal(leftoverDays(1, 2), 0);
});

test('leftover day', () => {
    const p = pick({ servings: 4 });
    const r = distributeSelection([p], [slot(MO), slot(DI)], ctx);
    assert.equal(r.entries.length, 2);
    assert.deepEqual(r.entries[0], {
        date: MO,
        slotKey: 'DINNER',
        recipeId: p.recipeId,
        servings: 4,
    });
    assert.deepEqual(r.entries[1], {
        date: DI,
        slotKey: 'DINNER',
        recipeId: p.recipeId,
        servings: 2,
        leftoverOf: 0,
    });
    const three = distributeSelection([pick({ servings: 3 })], [slot(MO), slot(DI)], ctx);
    assert.equal(three.entries.length, 1);
});

test('leftover prefers the same slot on the next day', () => {
    const p = pick({ servings: 4 });
    const r = distributeSelection([p], [slot(MO), slot(DI, 'LUNCH'), slot(DI, 'DINNER')], ctx);
    assert.equal(r.entries[1]!.slotKey, 'DINNER');
    assert.equal(r.entries[1]!.date, DI);
});

test('leftover moves to next free slot of the kind', () => {
    const p = pick({ servings: 4 });
    // Tuesday is not chosen, Wednesday is
    const r = distributeSelection([p], [slot(MO), slot(MI)], ctx);
    assert.equal(r.entries[0]!.date, MO);
    assert.equal(r.entries[1]!.date, MI);
    assert.equal(r.entries[1]!.leftoverOf, 0);
    // a slot of another kind is never used
    const other = distributeSelection(
        [pick({ servings: 4 })],
        [slot(MO), slot(DI, 'SNACK', 'snack')],
        ctx,
    );
    assert.deepEqual(other.unplaced.length, 1);
    assert.equal(other.entries.length, 0);
});

test('heavy dish goes to the weekend', () => {
    const heavy = pick({ effort: 0.9 });
    const light = pick({ effort: 0.1 });
    const r = distributeSelection([heavy, light], [slot(MI), slot(SA)], ctx);
    assert.equal(place(r, heavy.recipeId)!.date, SA);
    assert.equal(place(r, light.recipeId)!.date, MI);
});

test('perishable goes early', () => {
    // Fish keeps 2 days. Without freshness it would take Saturday (high effort), with it Monday.
    const fish = pick({ effort: 0.95, shortestShelfLifeDays: 2 });
    const lentils = pick({ effort: 0.9, shortestShelfLifeDays: null });
    const r = distributeSelection([fish, lentils], [slot(MO), slot(SA)], ctx);
    assert.equal(place(r, fish.recipeId)!.date, MO);
    assert.equal(place(r, lentils.recipeId)!.date, SA);
});

test('no same category on neighbour days', () => {
    const pasta1 = pick({ dishType: 'Nudeln' });
    const pasta2 = pick({ dishType: 'Nudeln' });
    const rice = pick({ dishType: 'Reis' });
    const r = distributeSelection([pasta1, pasta2, rice], [slot(MO), slot(DI), slot(MI)], ctx);
    assert.equal(r.entries.length, 3);
    assert.equal(place(r, rice.recipeId)!.date, DI);

    const sameCategory = [pick({ mainCategory: 'fisch' }), pick({ mainCategory: 'fisch' }), pick()];
    const r2 = distributeSelection(sameCategory, [slot(MO), slot(DI), slot(MI)], ctx);
    assert.equal(place(r2, sameCategory[2]!.recipeId)!.date, DI);
});

test('only matching kind', () => {
    const breakfast = pick({ kind: 'breakfast' });
    const r = distributeSelection(
        [breakfast],
        [slot(MO, 'DINNER'), slot(DI, 'BREAKFAST', 'breakfast')],
        ctx,
    );
    assert.deepEqual(
        r.entries.map((e) => [e.date, e.slotKey]),
        [[DI, 'BREAKFAST']],
    );
    const none = distributeSelection([breakfast], [slot(MO, 'DINNER')], ctx);
    assert.deepEqual(none.entries, []);
    assert.deepEqual(none.unplaced, [breakfast.recipeId]);
});

test('fewer picks than slots', () => {
    const r = distributeSelection([pick(), pick()], [slot(MO), slot(DI), slot(MI), slot(DO)], ctx);
    assert.equal(r.entries.length, 2);
    assert.deepEqual(r.unplaced, []);
    assert.equal(new Set(r.entries.map((e) => `${e.date}|${e.slotKey}`)).size, 2);
});

test('too many leftovers', () => {
    const big = pick({ servings: 6 });
    const r = distributeSelection([big], [slot(MO), slot(DI)], ctx);
    assert.deepEqual(r.unplaced, [big.recipeId]);
    assert.deepEqual(r.entries, []);
});

test('a slot is never used twice, leftovers included', () => {
    const a = pick({ servings: 4 });
    const b = pick({ servings: 4 });
    const r = distributeSelection([a, b], [slot(MO), slot(DI), slot(MI), slot(DO)], ctx);
    assert.equal(r.entries.length, 4);
    assert.equal(new Set(r.entries.map((e) => `${e.date}|${e.slotKey}`)).size, 4);
    assert.deepEqual(r.unplaced, []);
});

test('side dish', () => {
    const p = pick({ servings: 3, sideRecipeId: 'side1' });
    const r = distributeSelection([p], [slot(MO), slot(DI)], ctx);
    const side = r.entries.find((e) => e.sideOf !== undefined)!;
    assert.equal(side.recipeId, 'side1');
    assert.equal(side.sideOf, 0);
    assert.equal(side.date, MO);
    assert.equal(side.slotKey, 'DINNER');
    assert.equal(side.servings, 3);
    assert.equal(r.entries[0]!.recipeId, p.recipeId);
});

test('side dish only on the main entry, not on leftovers', () => {
    const p = pick({ servings: 4, sideRecipeId: 'side1' });
    const r = distributeSelection([p], [slot(MO), slot(DI)], ctx);
    assert.equal(r.entries.length, 3);
    assert.equal(r.entries.filter((e) => e.sideOf !== undefined).length, 1);
    const leftover = r.entries.find((e) => e.leftoverOf !== undefined)!;
    assert.equal(r.entries[leftover.leftoverOf!]!.recipeId, p.recipeId);
});

test('is deterministic', () => {
    const picks = [pick(), pick(), pick({ effort: 0.9 })];
    const slots = [slot(MO), slot(DI), slot(SA)];
    assert.deepEqual(
        distributeSelection(picks, slots, ctx),
        distributeSelection(picks, slots, ctx),
    );
});
