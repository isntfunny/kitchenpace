import assert from 'node:assert/strict';
import { test } from 'node:test';

import { portionFactor } from '../../src/lib/ingredients/quantities';
import {
    buildShoppingInputs,
    scaledAmount,
    selectRecipeLines,
    type RecipeLine,
} from '../../src/lib/shopping/recipe-items';
import { addMealPlanEntriesToList, addRecipeToList } from '../../src/lib/shopping/recipe-to-list';
import { addShoppingItems, setShoppingItemStatus } from '../../src/lib/shopping/repository';

import { createFakeDb } from './fake-db';

const line = (extra: Partial<RecipeLine> & { id: string }): RecipeLine => ({
    ingredientId: extra.id,
    name: extra.id,
    amount: '1',
    unit: 'Stk',
    isOptional: false,
    position: 0,
    ...extra,
});

// ── Pure logic ──────────────────────────────────────────────────────────

test('amounts scale with the servings; ranges and free text are handled', () => {
    const factor = portionFactor(8, 4);
    assert.equal(scaledAmount({ amount: '200' }, factor), '400');
    assert.equal(scaledAmount({ amount: '1/2' }, factor), '1');
    assert.equal(scaledAmount({ amount: '2-3' }, factor), '4–6');
    assert.equal(scaledAmount({ amount: '1,5' }, factor), '3');
    assert.equal(scaledAmount({ amount: 'nach Geschmack' }, factor), 'nach Geschmack');
    assert.equal(scaledAmount({ amount: '200' }, portionFactor(0, 4)), '200', 'invalid servings');
});

test('lines are shopped in recipe order, optionally limited and without optional ones', () => {
    const lines = [
        line({ id: 'c', position: 2 }),
        line({ id: 'a', position: 0 }),
        line({ id: 'b', position: 1, isOptional: true }),
    ];
    assert.deepEqual(
        selectRecipeLines(lines).map((l) => l.id),
        ['a', 'b', 'c'],
    );
    assert.deepEqual(
        selectRecipeLines(lines, { includeOptional: false }).map((l) => l.id),
        ['a', 'c'],
    );
    assert.deepEqual(
        selectRecipeLines(lines, { lineIds: ['c', 'b'] }).map((l) => l.id),
        ['b', 'c'],
    );
    assert.deepEqual(selectRecipeLines(lines, { lineIds: [] }), []);
});

test('inputs carry recipe, servings and the plan entry as source', () => {
    const inputs = buildShoppingInputs([line({ id: 'x', amount: '100', unit: 'g' })], {
        recipeId: 'r1',
        recipeServings: 2,
        servings: 6,
        mealPlanRecipeId: 'e1',
    });
    assert.deepEqual(inputs, [
        {
            ingredientId: 'x',
            name: 'x',
            amount: '300',
            unit: 'g',
            kind: 'MEAL_PLAN',
            recipeId: 'r1',
            mealPlanRecipeId: 'e1',
            servings: 6,
        },
    ]);
    const plain = buildShoppingInputs([line({ id: 'x' })], {
        recipeId: 'r1',
        recipeServings: 2,
        servings: 2,
    });
    assert.equal(plain[0].kind, 'RECIPE');
    assert.equal(plain[0].mealPlanRecipeId, null);
});

// ── With the fake database ──────────────────────────────────────────────

const ri = (
    id: string,
    recipeId: string,
    ingredientId: string,
    amount: string,
    unit: string | null,
    extra: Record<string, unknown> = {},
) => ({
    id,
    recipeId,
    ingredientId,
    amount,
    isOptional: false,
    position: 0,
    ingredient: { name: ingredientId, normalizedName: null },
    unit: unit ? { shortName: unit } : null,
    ...extra,
});

function seed() {
    return createFakeDb({
        profile: [{ userId: 'alice', householdSize: 2, timezone: 'Europe/Berlin' }],
        recipe: [
            { id: 'pasta', status: 'PUBLISHED', authorId: 'x', servings: 2 },
            { id: 'soup', status: 'PUBLISHED', authorId: 'x', servings: 4 },
            { id: 'bobs-draft', status: 'DRAFT', authorId: 'bob', servings: 2 },
        ],
        ingredient: [{ id: 'flour' }, { id: 'onion' }, { id: 'salt' }, { id: 'egg' }],
        unit: [
            { shortName: 'g', gramsDefault: 1 },
            { shortName: 'kg', gramsDefault: 1000 },
            { shortName: 'Stk', gramsDefault: null },
        ],
        recipeIngredient: [
            ri('p1', 'pasta', 'flour', '200', 'g', { position: 0 }),
            ri('p2', 'pasta', 'egg', '2', 'Stk', { position: 1 }),
            ri('p3', 'pasta', 'salt', 'nach Geschmack', null, { position: 2 }),
            ri('p4', 'pasta', 'onion', '1', 'Stk', { position: 3 }),
            ri('p5', 'pasta', 'onion', '2', 'Stk', { position: 4, isOptional: true }),
            ri('s1', 'soup', 'flour', '0.3', 'kg'),
            ri('s2', 'soup', 'onion', '4', 'Stk'),
            ri('d1', 'bobs-draft', 'egg', '1', 'Stk'),
        ],
        mealPlanRecipe: [
            { id: 'mon', userId: 'alice', recipeId: 'pasta', servings: 4 },
            { id: 'tue', userId: 'alice', recipeId: 'soup', servings: 4 },
            { id: 'foreign', userId: 'bob', recipeId: 'pasta', servings: 2 },
        ],
    });
}

const item = (db: any, key: string) => db.tables.shoppingItem.find((i: any) => i.itemKey === key);

test('a recipe lands on the list scaled to the servings, one entry per ingredient', async () => {
    const db = seed();
    const result = await addRecipeToList(db, 'alice', 'pasta', 4);
    assert.equal(result.added, 5);
    assert.deepEqual([item(db, 'i:flour').quantity, item(db, 'i:flour').baseUnit], [400, 'G']);
    assert.equal(item(db, 'i:egg').quantity, 4);
    assert.equal(item(db, 'i:salt').quantityText, 'nach Geschmack');
    // The same ingredient twice in a recipe is one entry: (1 + 2) * 2 pieces
    assert.equal(db.tables.shoppingItem.filter((i: any) => i.itemKey === 'i:onion').length, 1);
    assert.equal(item(db, 'i:onion').quantity, 6);
    assert.equal(db.tables.shoppingItem.length, 4);
});

test('selection and optional filter limit what is added', async () => {
    const db = seed();
    await addRecipeToList(db, 'alice', 'pasta', 2, { includeOptional: false });
    assert.equal(item(db, 'i:onion').quantity, 1);
    const other = seed();
    const result = await addRecipeToList(other, 'alice', 'pasta', 2, { lineIds: ['p1'] });
    assert.equal(result.added, 1);
    assert.equal(other.tables.shoppingItem.length, 1);
    assert.deepEqual(await addRecipeToList(other, 'alice', 'pasta', 2, { lineIds: [] }), {
        added: 0,
        itemIds: [],
    });
});

test('amounts of several recipes are merged when units convert safely', async () => {
    const db = seed();
    await addRecipeToList(db, 'alice', 'pasta', 2); // 200 g flour
    await addRecipeToList(db, 'alice', 'soup', 4); // 0.3 kg flour
    assert.equal(db.tables.shoppingItem.filter((i: any) => i.itemKey === 'i:flour').length, 1);
    assert.deepEqual([item(db, 'i:flour').quantity, item(db, 'i:flour').baseUnit], [500, 'G']);
});

test('a bought ingredient returns to open with a fresh amount when needed again', async () => {
    const db = seed();
    await addRecipeToList(db, 'alice', 'pasta', 2);
    const flour = item(db, 'i:flour');
    await setShoppingItemStatus(db, 'alice', flour.id, { status: 'PURCHASED' });
    assert.equal(item(db, 'i:flour').status, 'PURCHASED');
    await addRecipeToList(db, 'alice', 'soup', 4);
    assert.equal(item(db, 'i:flour').status, 'OPEN');
    assert.equal(item(db, 'i:flour').quantity, 300);
    assert.equal(db.tables.shoppingItem.filter((i: any) => i.itemKey === 'i:flour').length, 1);
});

test('recipes the user may not see are reported as missing; servings are validated', async () => {
    const db = seed();
    await assert.rejects(addRecipeToList(db, 'alice', 'bobs-draft', 2), { code: 'NOT_FOUND' });
    await assert.rejects(addRecipeToList(db, 'alice', 'nope', 2), { code: 'NOT_FOUND' });
    await assert.rejects(addRecipeToList(db, 'alice', 'pasta', 0));
    await assert.rejects(addRecipeToList(db, 'alice', 'pasta', 1.5));
    assert.equal(db.tables.shoppingItem?.length ?? 0, 0);
    // The own draft is visible
    const own = await addRecipeToList(db, 'bob', 'bobs-draft', 2);
    assert.equal(own.added, 1);
});

test('plan entries are added with their servings and the entry as source', async () => {
    const db = seed();
    const result = await addMealPlanEntriesToList(db, 'alice', ['mon', 'tue']);
    assert.equal(result.added, 5 + 2);
    // flour: 200 g for 4 of 2 servings = 400 g, soup 0.3 kg for 4 of 4 = 300 g
    assert.equal(item(db, 'i:flour').quantity, 700);
    const sources = db.tables.shoppingItemSource.filter(
        (s: any) => s.shoppingItemId === item(db, 'i:flour').id,
    );
    assert.deepEqual(
        sources.map((s: any) => [s.kind, s.mealPlanRecipeId, s.servings, s.quantity]),
        [
            ['MEAL_PLAN', 'mon', 4, 400],
            ['MEAL_PLAN', 'tue', 4, 300],
        ],
    );
});

test('two lines of one ingredient in a plan entry add up under one source', async () => {
    const db = seed();
    await addMealPlanEntriesToList(db, 'alice', ['mon']);
    // onion: 1 + 2 pieces at 2x = 6 pieces, one source with the full share
    assert.equal(item(db, 'i:onion').quantity, 6);
    const sources = db.tables.shoppingItemSource.filter(
        (s: any) => s.shoppingItemId === item(db, 'i:onion').id,
    );
    assert.equal(sources.length, 1);
    assert.equal(sources[0].quantity, 6);
    assert.equal(db.tables.shoppingHistory.filter((h: any) => h.itemKey === 'i:onion').length, 1);
});

test('the same plan entry never adds its amounts twice', async () => {
    const db = seed();
    await addMealPlanEntriesToList(db, 'alice', ['mon']);
    await addMealPlanEntriesToList(db, 'alice', ['mon']);
    assert.equal(item(db, 'i:flour').quantity, 400);
    assert.equal(item(db, 'i:onion').quantity, 6);
});

test('plan entries of other users and unknown ids are rejected before anything is written', async () => {
    const db = seed();
    await assert.rejects(addMealPlanEntriesToList(db, 'alice', ['mon', 'foreign']), {
        code: 'NOT_FOUND',
    });
    await assert.rejects(addMealPlanEntriesToList(db, 'alice', ['nope']), { code: 'NOT_FOUND' });
    await assert.rejects(addMealPlanEntriesToList(db, 'alice', []));
    assert.equal(db.tables.shoppingItem?.length ?? 0, 0);
});

test('manual and recipe adds share the same entry per ingredient', async () => {
    const db = seed();
    await addShoppingItems(db, 'alice', [
        { ingredientId: 'egg', name: 'egg', amount: '6', unit: 'Stk' },
    ]);
    await addRecipeToList(db, 'alice', 'pasta', 2);
    assert.equal(db.tables.shoppingItem.filter((i: any) => i.itemKey === 'i:egg').length, 1);
    assert.equal(item(db, 'i:egg').quantity, 8);
});
