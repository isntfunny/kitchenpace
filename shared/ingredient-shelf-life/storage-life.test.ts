import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadShelfLifeDays, shelfLifeDaysByIngredient, type ShelfLifeDb } from './storage-life';

const lives = [
    { ingredientId: 'milk', storage: 'FRIDGE' as const, days: 5 },
    { ingredientId: 'milk', storage: 'FREEZER' as const, days: 90 },
    { ingredientId: 'flour', storage: 'PANTRY' as const, days: 180 },
    { ingredientId: 'bread', storage: 'PANTRY' as const, days: 3 },
    { ingredientId: 'bread', storage: 'FREEZER' as const, days: 60 },
    { ingredientId: 'guess', storage: 'FRIDGE' as const, days: 2 },
];

test('default storage first, then fridge, then pantry; unassessed counts as unknown', () => {
    const days = shelfLifeDaysByIngredient(
        [
            { id: 'milk', defaultStorage: null, shelfLifeSource: 'AI' },
            { id: 'flour', defaultStorage: 'FRIDGE', shelfLifeSource: 'AI' },
            { id: 'bread', defaultStorage: 'FREEZER', shelfLifeSource: 'MANUAL' },
            { id: 'guess', defaultStorage: 'FRIDGE', shelfLifeSource: null },
            { id: 'salt', defaultStorage: 'PANTRY', shelfLifeSource: 'AI' },
        ],
        lives,
    );
    assert.deepEqual(Object.fromEntries(days), { milk: 5, flour: 180, bread: 60 });
});

test('loadShelfLifeDays reads both tables only for the given ids', async () => {
    const queries: unknown[] = [];
    const db = {
        ingredient: {
            findMany: async (args: unknown) => {
                queries.push(args);
                return [{ id: 'milk', defaultStorage: 'FRIDGE', shelfLifeSource: 'AI' }];
            },
        },
        ingredientStorageLife: {
            findMany: async (args: unknown) => {
                queries.push(args);
                return lives;
            },
        },
    } as unknown as ShelfLifeDb;
    assert.deepEqual(Object.fromEntries(await loadShelfLifeDays(db, ['milk'])), { milk: 5 });
    assert.equal(queries.length, 2);
    assert.equal((await loadShelfLifeDays(db, [])).size, 0);
    assert.equal(queries.length, 2);
});
