import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bookCookedEntry, bookPastEntries } from '../../src/lib/pantry/book';
import { getLeftoverHints } from '../../src/lib/pantry/leftovers';
import { createFakeDb } from '../meal-plan/fake-db';

const USER = 'user-1';
const NOW = new Date('2026-03-10T08:00:00Z');

function seed(extra: Record<string, any[]> = {}) {
    return createFakeDb({
        recipe: [{ id: 'r1', servings: 4 }],
        unit: [
            { id: 'u-ml', shortName: 'ml', gramsDefault: null },
            { id: 'u-el', shortName: 'EL', gramsDefault: 15 },
        ],
        ingredient: [
            {
                id: 'sahne',
                name: 'Sahne',
                normalizedName: null,
                openSensitive: true,
                openedShelfLifeDays: 3,
                packSize: 200,
            },
            {
                id: 'mehl',
                name: 'Mehl',
                normalizedName: null,
                openSensitive: false,
                openedShelfLifeDays: null,
                packSize: null,
            },
        ],
        recipeIngredient: [
            {
                id: 'ri1',
                recipeId: 'r1',
                ingredientId: 'sahne',
                amount: '100',
                unitId: 'u-ml',
                isOptional: false,
                position: 0,
            },
            {
                id: 'ri2',
                recipeId: 'r1',
                ingredientId: 'mehl',
                amount: '2',
                unitId: 'u-el',
                isOptional: false,
                position: 1,
            },
        ],
        mealPlanRecipe: [
            {
                id: 'e1',
                userId: USER,
                recipeId: 'r1',
                servings: 4,
                date: new Date('2026-03-09T00:00:00Z'),
                status: 'PLANNED',
                pantryBookedAt: null,
                leftoverOfId: null,
            },
        ],
        pantryItem: [
            {
                id: 'pa-sahne',
                userId: USER,
                ingredientId: 'sahne',
                name: 'Sahne',
                quantity: 200,
                baseUnit: 'ML',
                approximate: false,
                status: 'AVAILABLE',
                openedAt: null,
                expiresAt: null,
                purchasedAt: new Date('2026-03-05T00:00:00Z'),
                createdAt: new Date('2026-03-05T00:00:00Z'),
                mealPlanRecipeId: null,
                leftoverHintDismissedAt: null,
            },
            {
                id: 'pa-mehl',
                userId: USER,
                ingredientId: 'mehl',
                name: 'Mehl',
                quantity: 1000,
                baseUnit: 'G',
                approximate: false,
                status: 'AVAILABLE',
                openedAt: null,
                expiresAt: null,
                purchasedAt: new Date('2026-03-05T00:00:00Z'),
                createdAt: new Date('2026-03-05T00:00:00Z'),
                mealPlanRecipeId: null,
                leftoverHintDismissedAt: null,
            },
        ],
        ...extra,
    });
}
const post = (db: any, id: string) => db.tables.pantryItem.find((p: any) => p.id === id);

describe('bookCookedEntry', () => {
    it('deducts, opens, sets the expiry and stamps the entry', async () => {
        const db = seed();
        const result = await bookCookedEntry(db, USER, 'e1', NOW);
        assert.equal(result.booked, true);
        const sahne = post(db, 'pa-sahne');
        assert.equal(sahne.quantity, 100);
        assert.deepEqual(sahne.openedAt, NOW);
        assert.deepEqual(sahne.expiresAt, new Date(NOW.getTime() + 3 * 86_400_000));
        assert.equal(sahne.mealPlanRecipeId, 'e1');
        const mehl = post(db, 'pa-mehl');
        assert.equal(mehl.quantity, 970);
        assert.equal(mehl.expiresAt, null); // no shelf life after opening: no hint, no error
        assert.deepEqual(db.tables.mealPlanRecipe[0].pantryBookedAt, NOW);
    });

    it('is idempotent', async () => {
        const db = seed();
        await bookCookedEntry(db, USER, 'e1', NOW);
        const again = await bookCookedEntry(db, USER, 'e1', new Date(NOW.getTime() + 1000));
        assert.equal(again.alreadyBooked, true);
        assert.equal(post(db, 'pa-sahne').quantity, 100);
        assert.deepEqual(db.tables.mealPlanRecipe[0].pantryBookedAt, NOW);
    });

    it('does nothing without pantry posts, and no error', async () => {
        const db = seed({ pantryItem: [] });
        const result = await bookCookedEntry(db, USER, 'e1', NOW);
        assert.deepEqual(result.updates, []);
        assert.deepEqual(db.tables.mealPlanRecipe[0].pantryBookedAt, NOW);
    });

    it('scales with the servings of the entry', async () => {
        const db = seed();
        db.tables.mealPlanRecipe[0].servings = 2;
        await bookCookedEntry(db, USER, 'e1', NOW);
        assert.equal(post(db, 'pa-sahne').quantity, 150);
    });

    it('skips leftover meals and reports foreign or missing entries as not found', async () => {
        const db = seed();
        db.tables.mealPlanRecipe[0].leftoverOfId = 'e0';
        await bookCookedEntry(db, USER, 'e1', NOW);
        assert.equal(post(db, 'pa-sahne').quantity, 200);
        await assert.rejects(bookCookedEntry(db, 'other', 'e1', NOW), { code: 'NOT_FOUND' });
        await assert.rejects(bookCookedEntry(db, USER, 'missing', NOW), { code: 'NOT_FOUND' });
    });

    it('a dry run writes nothing', async () => {
        const db = seed();
        const result = await bookCookedEntry(db, USER, 'e1', NOW, { dryRun: true });
        assert.equal(result.booked, false);
        assert.equal(result.updates.length, 2);
        assert.equal(post(db, 'pa-sahne').quantity, 200);
        assert.equal(db.tables.mealPlanRecipe[0].pantryBookedAt, null);
    });
});

describe('bookPastEntries', () => {
    it('books past, unbooked, uncancelled entries as used on the plan day', async () => {
        const db = seed();
        db.tables.mealPlanRecipe.push(
            {
                id: 'today',
                userId: USER,
                recipeId: 'r1',
                servings: 4,
                date: new Date('2026-03-10T00:00:00Z'),
                status: 'PLANNED',
                pantryBookedAt: null,
                leftoverOfId: null,
            },
            {
                id: 'cancelled',
                userId: USER,
                recipeId: 'r1',
                servings: 4,
                date: new Date('2026-03-08T00:00:00Z'),
                status: 'CANCELLED',
                pantryBookedAt: null,
                leftoverOfId: null,
            },
        );
        const report = await bookPastEntries(db, NOW);
        assert.deepEqual(report, { dryRun: false, entries: 1, updatedPosts: 2, failed: 0 });
        assert.deepEqual(post(db, 'pa-sahne').openedAt, new Date('2026-03-09T12:00:00Z'));
        assert.equal(
            db.tables.mealPlanRecipe.find((e: any) => e.id === 'today').pantryBookedAt,
            null,
        );
        // second run: nothing left to book
        assert.equal((await bookPastEntries(db, NOW)).entries, 0);
    });

    it('does not book twice after a confirmed "Gekocht"', async () => {
        const db = seed();
        await bookCookedEntry(db, USER, 'e1', NOW);
        const report = await bookPastEntries(db, new Date('2026-03-11T08:00:00Z'));
        assert.equal(report.entries, 0);
        assert.equal(post(db, 'pa-sahne').quantity, 100);
    });

    it('dry run reports without writing', async () => {
        const db = seed();
        const report = await bookPastEntries(db, NOW, { dryRun: true });
        assert.deepEqual(report, { dryRun: true, entries: 1, updatedPosts: 2, failed: 0 });
        assert.equal(post(db, 'pa-sahne').quantity, 200);
    });
});

describe('getLeftoverHints', () => {
    it('lists opened, open-sensitive posts with all data, soonest expiry first', async () => {
        const db = seed();
        await bookCookedEntry(db, USER, 'e1', NOW);
        const hints = await getLeftoverHints(db, USER, '2026-03-10');
        assert.deepEqual(hints, [
            {
                id: 'pa-sahne',
                ingredientId: 'sahne',
                name: 'Sahne',
                amountBase: 100,
                unitBase: 'ml',
                expiresOn: '2026-03-13',
            },
        ]);
    });

    it('leaves out dismissed, expired, unopened and incomplete posts', async () => {
        const db = seed();
        await bookCookedEntry(db, USER, 'e1', NOW);
        assert.equal((await getLeftoverHints(db, USER, '2026-03-14')).length, 0); // expired
        post(db, 'pa-sahne').leftoverHintDismissedAt = NOW;
        assert.equal((await getLeftoverHints(db, USER, '2026-03-10')).length, 0);
        post(db, 'pa-sahne').leftoverHintDismissedAt = null;
        db.tables.ingredient[0].packSize = null; // no pack size: no hint, no error
        assert.equal((await getLeftoverHints(db, USER, '2026-03-10')).length, 0);
    });
});
