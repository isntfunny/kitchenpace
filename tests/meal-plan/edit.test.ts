// KUC-101 editing and KUC-103 "Gekocht": pure copy planning and the data access
// against the in-memory fake (no database).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    cookMealPlanEntry,
    linkCookToPlan,
    uncookMealPlanEntry,
} from '../../src/lib/meal-plan/cook';
import { planCopy, type CopySource } from '../../src/lib/meal-plan/copy';
import {
    applyMealPlanTemplate,
    cookForTwoMeals,
    copyMealPlanDays,
    moveMealPlanEntry,
    previewCopyDays,
    removeLeftover,
    saveMealPlanTemplate,
    swapMealPlanCells,
} from '../../src/lib/meal-plan/edit';
import { deleteMealPlanEntry, restoreMealPlanEntry } from '../../src/lib/meal-plan/repository';
import { builtInMarkers } from '../../src/lib/meal-plan/view';

import { createFakeDb } from './fake-db';

type Row = Record<string, any>;

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const source = (id: string, extra: Partial<CopySource> = {}): CopySource => ({
    id,
    recipeId: `r-${id}`,
    dayOffset: 0,
    slot: 'DINNER',
    position: 0,
    time: null,
    servings: 2,
    notes: null,
    leftoverOfId: null,
    ...extra,
});

test('planCopy appends after taken cells, skips or replaces them', () => {
    const sources = [source('a'), source('b', { dayOffset: 1, slot: 'LUNCH' })];
    const targets = [{ id: 't1', date: '2026-11-30', slot: 'DINNER', position: 3 }];

    const add = planCopy(sources, '2026-11-30', targets, 'add');
    assert.deepEqual(add.conflicts, ['2026-11-30|DINNER']);
    assert.equal(add.creates.find((c) => c.sourceId === 'a')?.position, 4);
    assert.equal(add.creates.find((c) => c.sourceId === 'b')?.date, '2026-12-01');
    assert.deepEqual(add.deleteIds, []);

    const skip = planCopy(sources, '2026-11-30', targets, 'skip');
    assert.deepEqual(
        skip.creates.map((c) => c.sourceId),
        ['b'],
    );
    assert.equal(skip.skipped, 1);

    const replace = planCopy(sources, '2026-11-30', targets, 'replace');
    assert.deepEqual(replace.deleteIds, ['t1']);
    assert.equal(replace.creates.find((c) => c.sourceId === 'a')?.position, 0);
});

test('planCopy keeps leftover links, drops orphans and orders origins first', () => {
    const sources = [
        source('rest', { dayOffset: 1, slot: 'LUNCH', leftoverOfId: 'cook' }),
        source('cook', { servings: 4 }),
        source('orphan', { dayOffset: 0, slot: 'LUNCH', leftoverOfId: 'last-week' }),
    ];
    const plan = planCopy(sources, '2026-11-30', [], 'add');
    assert.deepEqual(
        plan.creates.map((c) => c.sourceId),
        ['cook', 'rest'],
    );
    assert.equal(plan.creates[1].leftoverOfSourceId, 'cook');
    assert.equal(plan.skipped, 1);

    // The origin's cell is taken and skipped: its leftover goes too
    const taken = [{ id: 'x', date: '2026-11-30', slot: 'DINNER', position: 0 }];
    assert.deepEqual(planCopy(sources, '2026-11-30', taken, 'skip').creates, []);
});

test('builtInMarkers asks "Gekocht?" for past dishes and shows leftovers', () => {
    const base = { recipeAvailable: true, date: '2026-11-23' };
    assert.deepEqual(builtInMarkers({ ...base, status: 'PLANNED' }, '2026-11-24'), [
        { tone: 'warn', label: 'Gekocht?' },
    ]);
    assert.deepEqual(builtInMarkers({ ...base, status: 'PLANNED' }, '2026-11-23'), []);
    assert.equal(
        builtInMarkers({ ...base, status: 'CANCELLED' }, '2026-11-24')[0].label,
        'Nicht gekocht',
    );
    assert.equal(
        builtInMarkers({ ...base, status: 'PLANNED', leftoverForDate: '2026-11-26' })[0].label,
        'reicht für Do',
    );
});

function seed() {
    return createFakeDb({
        profile: [
            { userId: 'alice', householdSize: 2, weekStartDay: 1, timezone: 'Europe/Berlin' },
        ],
        recipe: [
            {
                id: 'chili',
                title: 'Chili',
                status: 'PUBLISHED',
                moderationStatus: 'APPROVED',
                authorId: 'bob',
                cookCount: 0,
            },
            {
                id: 'soup',
                title: 'Suppe',
                status: 'ARCHIVED',
                moderationStatus: 'APPROVED',
                authorId: 'bob',
                cookCount: 0,
            },
        ],
        mealPlanRecipe: [
            {
                id: 'e1',
                userId: 'alice',
                recipeId: 'chili',
                date: day('2026-11-23'),
                mealType: 'DINNER',
                customMealType: null,
                servings: 2,
                status: 'PLANNED',
                position: 0,
                time: null,
                notes: null,
                pinned: false,
                cookedAt: null,
                cookHistoryId: null,
                pantryBookedAt: null,
                leftoverOfId: null,
            },
        ],
    });
}

test('cookMealPlanEntry counts once, also on repeated taps', async () => {
    const db = seed();
    const now = new Date('2026-11-23T19:30:00.000Z');
    const first = await cookMealPlanEntry(db as any, 'alice', 'e1', now, '2026-11-23');
    const second = await cookMealPlanEntry(db as any, 'alice', 'e1', now, '2026-11-23');
    assert.equal(first.counted, true);
    assert.equal(second.alreadyCooked, true);
    assert.equal(db.tables.userCookHistory.length, 1);
    assert.equal(db.tables.recipe[0].cookCount, 1);
    assert.equal(db.tables.mealPlanRecipe[0].cookHistoryId, first.cookHistoryId);
    await assert.rejects(cookMealPlanEntry(db as any, 'bob', 'e1', now), /nicht gefunden/);

    const undone = await uncookMealPlanEntry(db as any, 'alice', 'e1');
    assert.equal(undone.removedCook, true);
    assert.equal(db.tables.userCookHistory.length, 0);
    assert.equal(db.tables.recipe[0].cookCount, 0);
    assert.equal(db.tables.mealPlanRecipe[0].status, 'PLANNED');
});

test('a recipe-page cook is linked to the plan, never counted twice', async () => {
    const db = seed();
    db.tables.userCookHistory = [
        {
            id: 'h1',
            userId: 'alice',
            recipeId: 'chili',
            cookedAt: new Date('2026-11-23T18:00:00Z'),
        },
    ];
    // Plan "Gekocht" after the recipe page: reuses h1
    const result = await cookMealPlanEntry(
        db as any,
        'alice',
        'e1',
        new Date('2026-11-23T19:00:00Z'),
        '2026-11-23',
    );
    assert.equal(result.counted, false);
    assert.equal(result.cookHistoryId, 'h1');
    assert.equal(db.tables.recipe[0].cookCount, 0);

    // Recipe page after the plan: linkCookToPlan finds no open entry
    const linked = await linkCookToPlan(db as any, 'alice', {
        cookHistoryId: 'h2',
        recipeId: 'chili',
        cookedAt: new Date('2026-11-23T20:00:00Z'),
        today: '2026-11-23',
    });
    assert.equal(linked, null);
});

test('linkCookToPlan marks the planned dish of today', async () => {
    const db = seed();
    const linked = await linkCookToPlan(db as any, 'alice', {
        cookHistoryId: 'h9',
        recipeId: 'chili',
        cookedAt: new Date('2026-11-23T20:00:00Z'),
        today: '2026-11-23',
    });
    assert.equal(linked, 'e1');
    assert.equal(db.tables.mealPlanRecipe[0].status, 'COMPLETED');
    assert.equal(db.tables.mealPlanRecipe[0].cookHistoryId, 'h9');
});

test('cookForTwoMeals doubles the servings; the leftover is eaten without a second cook', async () => {
    const db = seed();
    const result = await cookForTwoMeals(db as any, 'alice', 'e1', {
        date: '2026-11-24',
        slot: 'LUNCH',
    });
    assert.equal(db.tables.mealPlanRecipe[0].servings, 4);
    const leftover = db.tables.mealPlanRecipe.find((e: Row) => e.id === result.leftoverId)!;
    assert.equal(leftover.leftoverOfId, 'e1');
    assert.equal(leftover.servings, 2);

    await assert.rejects(
        cookForTwoMeals(db as any, 'alice', 'e1', { date: '2026-11-22', slot: 'LUNCH' }),
        /vor dem Kochen/,
    );
    await assert.rejects(
        cookForTwoMeals(db as any, 'alice', leftover.id, { date: '2026-11-25', slot: 'LUNCH' }),
        /Rest/,
    );

    const eaten = await cookMealPlanEntry(
        db as any,
        'alice',
        leftover.id,
        new Date('2026-11-24T12:00:00Z'),
    );
    assert.equal(eaten.counted, false);
    assert.equal(db.tables.userCookHistory?.length ?? 0, 0);

    await removeLeftover(db as any, 'alice', leftover.id, result.originServings);
    assert.equal(db.tables.mealPlanRecipe.length, 1);
    assert.equal(db.tables.mealPlanRecipe[0].servings, 2);
});

test('move, copy and swap entries', async () => {
    const db = seed();
    const copy = await moveMealPlanEntry(db as any, 'alice', 'e1', {
        date: '2026-11-25',
        slot: 'LUNCH',
        copy: true,
    });
    assert.notEqual(copy.id, 'e1');
    assert.equal(copy.status, 'PLANNED');
    assert.equal(db.tables.mealPlanRecipe.length, 2);

    await swapMealPlanCells(db as any, 'alice', {
        a: { date: '2026-11-23', slot: 'DINNER' },
        b: { date: '2026-11-25', slot: 'LUNCH' },
    });
    const original = db.tables.mealPlanRecipe.find((e: Row) => e.id === 'e1')!;
    assert.equal(original.mealType, 'LUNCH');
    assert.equal(original.date.toISOString().slice(0, 10), '2026-11-25');
    const copied = db.tables.mealPlanRecipe.find((e: Row) => e.id === copy.id)!;
    assert.equal(copied.mealType, 'DINNER');
    assert.equal(copied.date.toISOString().slice(0, 10), '2026-11-23');

    await moveMealPlanEntry(db as any, 'alice', 'e1', { date: '2026-11-26', slot: 'BREAKFAST' });
    assert.equal(original.mealType, 'BREAKFAST');
});

test('copying a week carries leftover links and leaves out unavailable recipes', async () => {
    const db = seed();
    const { leftoverId } = await cookForTwoMeals(db as any, 'alice', 'e1', {
        date: '2026-11-24',
        slot: 'LUNCH',
    });
    db.tables.mealPlanRecipe.push({
        id: 'gone',
        userId: 'alice',
        recipeId: 'soup',
        date: day('2026-11-25'),
        mealType: 'LUNCH',
        customMealType: null,
        servings: 2,
        status: 'PLANNED',
        position: 0,
        leftoverOfId: null,
        time: null,
        notes: null,
    });
    db.tables.mealPlanRecipe[0].status = 'COMPLETED';

    const preview = await previewCopyDays(db as any, 'alice', {
        from: '2026-11-23',
        to: '2026-11-30',
        days: 7,
    });
    assert.deepEqual(preview, { count: 2, conflicts: [] });

    const result = await copyMealPlanDays(db as any, 'alice', {
        from: '2026-11-23',
        to: '2026-11-30',
        days: 7,
    });
    assert.equal(result.created, 2);
    assert.equal(result.skipped, 1);
    const copies = db.tables.mealPlanRecipe.filter((e: Row) => e.date >= day('2026-11-30'));
    const origin = copies.find((e: Row) => !e.leftoverOfId)!;
    const rest = copies.find((e: Row) => e.leftoverOfId)!;
    assert.equal(origin.status, 'PLANNED');
    assert.equal(rest.leftoverOfId, origin.id);
    assert.notEqual(rest.id, leftoverId);

    // A second copy shows the taken cells
    const again = await previewCopyDays(db as any, 'alice', {
        from: '2026-11-23',
        to: '2026-11-30',
        days: 7,
    });
    assert.equal(again.conflicts.length, 2);
    assert.deepEqual(again.conflicts[0].titles, ['Chili']);
});

test('templates leave out leftovers and apply to another week', async () => {
    const db = seed();
    await cookForTwoMeals(db as any, 'alice', 'e1', { date: '2026-11-24', slot: 'LUNCH' });
    const saved = await saveMealPlanTemplate(db as any, 'alice', {
        startDate: '2026-11-23',
        name: 'Chili-Woche',
    });
    assert.equal(saved.count, 1);
    assert.equal(db.tables.mealPlanTemplateEntry[0].servings, 4);

    const applied = await applyMealPlanTemplate(db as any, 'alice', {
        templateId: saved.id,
        startDate: '2026-12-07',
    });
    assert.equal(applied.created, 1);
    await assert.rejects(
        applyMealPlanTemplate(db as any, 'bob', { templateId: saved.id, startDate: '2026-12-07' }),
        /nicht gefunden/,
    );
    await assert.rejects(
        saveMealPlanTemplate(db as any, 'alice', { startDate: '2027-01-04', name: 'Leer' }),
        /leer/,
    );
});

test('undo of deleting an origin relinks its leftovers', async () => {
    const db = seed();
    const { leftoverId } = await cookForTwoMeals(db as any, 'alice', 'e1', {
        date: '2026-11-24',
        slot: 'LUNCH',
    });
    const snapshot = await deleteMealPlanEntry(db as any, 'alice', 'e1');
    assert.deepEqual((snapshot as { leftoverIds?: string[] }).leftoverIds, [leftoverId]);
    // The database sets the link to null on delete
    db.tables.mealPlanRecipe.find((e: Row) => e.id === leftoverId)!.leftoverOfId = null;
    await restoreMealPlanEntry(db as any, 'alice', snapshot);
    assert.equal(
        db.tables.mealPlanRecipe.find((e: Row) => e.id === leftoverId)!.leftoverOfId,
        'e1',
    );
});
