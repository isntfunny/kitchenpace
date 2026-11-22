// KUC-126: "Übernehmen" of the week selection against the in-memory fake (no database).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DataAccessError } from '../../src/lib/meal-plan/db';
import { planWeekSelection, type PickInfo } from '../../src/lib/meal-plan/selection';

import { createFakeDb } from './fake-db';

const recipe = (id: string) => ({
    id,
    title: id,
    status: 'PUBLISHED',
    moderationStatus: 'APPROVED',
    authorId: 'someone',
});

const info = (categorySlugs: string[], extra: Partial<PickInfo> = {}): PickInfo => ({
    categorySlugs,
    tags: [],
    totalTime: 30,
    difficulty: 'EASY',
    stepCount: 5,
    mainCategory: categorySlugs[0] ?? null,
    dishType: 'Gemüse/Sonstiges',
    shortestShelfLifeDays: null,
    ...extra,
});

const INFO: Record<string, PickInfo> = {
    curry: info(['hauptgericht'], { dishType: 'Reis' }),
    pasta: info(['hauptgericht'], { dishType: 'Nudeln' }),
    sauce: info(['beilage']),
    mash: info(['beilage']),
};
const loadPicks = async (ids: string[]) =>
    new Map(ids.filter((id) => INFO[id]).map((id) => [id, INFO[id]]));

function seed(entries: Record<string, unknown>[] = []) {
    return createFakeDb({
        profile: [
            {
                userId: 'alice',
                householdSize: 2,
                weekStartDay: 1,
                timezone: 'Europe/Berlin',
                mealPlanSlots: null,
                shoppingDay: null,
            },
        ],
        recipe: ['curry', 'pasta', 'sauce', 'mash'].map(recipe),
        mealPlanRecipe: entries,
    });
}

const WEEK = '2026-11-23';
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function entriesOf(db: ReturnType<typeof seed>) {
    return (db as any).mealPlanRecipe.findMany({ where: { userId: 'alice' } }) as Promise<
        Record<string, any>[]
    >;
}

test('writes picks into the chosen slots', async () => {
    const db = seed();
    const result = await planWeekSelection(
        db as any,
        'alice',
        {
            startDate: WEEK,
            slots: ['2026-11-23|DINNER', '2026-11-24|DINNER'],
            picks: [
                { recipeId: 'curry', kind: 'main', servings: 2 },
                { recipeId: 'pasta', kind: 'main', servings: 2 },
            ],
        },
        loadPicks,
    );
    assert.equal(result.planned, 2);
    assert.equal(result.skipped, 0);
    const entries = await entriesOf(db);
    assert.equal(entries.length, 2);
    assert.deepEqual(entries.map((e) => e.mealType).sort(), ['DINNER', 'DINNER']);
});

test('writes leftover entries linked to the main entry', async () => {
    const db = seed();
    await planWeekSelection(
        db as any,
        'alice',
        {
            startDate: WEEK,
            slots: ['2026-11-23|DINNER', '2026-11-24|DINNER'],
            picks: [{ recipeId: 'curry', kind: 'main', servings: 4 }],
        },
        loadPicks,
    );
    const entries = await entriesOf(db);
    const main = entries.find((e) => !e.leftoverOfId)!;
    const rest = entries.find((e) => e.leftoverOfId)!;
    assert.equal(rest.leftoverOfId, main.id);
    assert.equal(main.servings, 4);
    assert.equal(rest.servings, 2);
    assert.ok(rest.date.getTime() > main.date.getTime());
});

test('skips slots taken meanwhile', async () => {
    const db = seed([
        {
            id: 'taken',
            userId: 'alice',
            recipeId: 'pasta',
            date: day('2026-11-23'),
            mealType: 'DINNER',
            customMealType: null,
            servings: 2,
            position: 0,
        },
    ]);
    const result = await planWeekSelection(
        db as any,
        'alice',
        {
            startDate: WEEK,
            slots: ['2026-11-23|DINNER', '2026-11-24|DINNER'],
            picks: [{ recipeId: 'curry', kind: 'main', servings: 2 }],
        },
        loadPicks,
    );
    assert.equal(result.skipped, 1);
    assert.equal(result.planned, 1);
    const curry = (await entriesOf(db)).filter((e) => e.recipeId === 'curry');
    assert.equal(curry.length, 1);
    assert.equal(curry[0].date.getTime(), day('2026-11-24').getTime());
});

test('rejects a recipe not allowed for its kind and writes nothing', async () => {
    const db = seed();
    await assert.rejects(
        planWeekSelection(
            db as any,
            'alice',
            {
                startDate: WEEK,
                slots: ['2026-11-23|DINNER'],
                picks: [{ recipeId: 'sauce', kind: 'main', servings: 2 }],
            },
            loadPicks,
        ),
        (error: unknown) => error instanceof DataAccessError && error.code === 'INVALID',
    );
    assert.equal((await entriesOf(db)).length, 0);
});

test('a side dish lands at position 1 with the main servings', async () => {
    const db = seed();
    await planWeekSelection(
        db as any,
        'alice',
        {
            startDate: WEEK,
            slots: ['2026-11-25|DINNER'],
            picks: [{ recipeId: 'curry', kind: 'main', servings: 3, sideRecipeId: 'mash' }],
        },
        loadPicks,
    );
    const entries = await entriesOf(db);
    const side = entries.find((e) => e.recipeId === 'mash')!;
    const main = entries.find((e) => e.recipeId === 'curry')!;
    assert.equal(main.position, 0);
    assert.equal(side.position, 1);
    assert.equal(side.servings, 3);
});
