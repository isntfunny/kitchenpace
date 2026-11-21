import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setShoppingItemStatus } from '../../src/lib/shopping/repository';
import { createFakeDb } from '../meal-plan/fake-db';

const USER = 'user-1';

function seed() {
    return createFakeDb({
        shoppingList: [{ id: 'l1', userId: USER }],
        shoppingItem: [
            {
                id: 'i-sahne',
                shoppingListId: 'l1',
                ingredientId: 'sahne',
                itemKey: 'i:sahne',
                name: 'Sahne',
                status: 'OPEN',
                quantity: 400,
                baseUnit: 'ML',
                quantityText: null,
            },
            {
                id: 'i-toast',
                shoppingListId: 'l1',
                ingredientId: null,
                itemKey: 't:toast',
                name: 'Toast',
                status: 'OPEN',
                quantity: null,
                baseUnit: null,
                quantityText: null,
            },
        ],
    });
}

describe('shopping purchase → pantry', () => {
    it('creates a pantry post with the bought amount and the history link', async () => {
        const db = seed();
        const at = new Date('2026-03-10T10:00:00Z');
        const { history } = await setShoppingItemStatus(db, USER, 'i-sahne', {
            status: 'PURCHASED',
            at,
        });
        const [post] = db.tables.pantryItem;
        assert.equal(db.tables.pantryItem.length, 1);
        assert.equal(post.ingredientId, 'sahne');
        assert.equal(post.quantity, 400);
        assert.equal(post.baseUnit, 'ML');
        assert.equal(post.source, 'PURCHASE');
        assert.equal(post.shoppingHistoryId, history!.id);
        assert.deepEqual(post.purchasedAt, at);
    });

    it('marks Bring! purchases with source BRING', async () => {
        const db = seed();
        await setShoppingItemStatus(db, USER, 'i-sahne', { status: 'PURCHASED', origin: 'BRING' });
        assert.equal(db.tables.pantryItem[0].source, 'BRING');
    });

    it('does not create posts for free-text items', async () => {
        const db = seed();
        await setShoppingItemStatus(db, USER, 'i-toast', { status: 'PURCHASED' });
        assert.equal(db.tables.pantryItem?.length ?? 0, 0);
    });

    it('does not create a second post when ticking off twice', async () => {
        const db = seed();
        await setShoppingItemStatus(db, USER, 'i-sahne', { status: 'PURCHASED' });
        await setShoppingItemStatus(db, USER, 'i-sahne', { status: 'PURCHASED' });
        assert.equal(db.tables.pantryItem.length, 1);
    });

    it('resetting the purchase takes the unused post out again', async () => {
        const db = seed();
        await setShoppingItemStatus(db, USER, 'i-sahne', { status: 'PURCHASED' });
        await setShoppingItemStatus(db, USER, 'i-sahne', { status: 'OPEN' });
        assert.equal(db.tables.pantryItem.length, 0);
    });

    it('keeps a post that a cooked entry already used', async () => {
        const db = seed();
        await setShoppingItemStatus(db, USER, 'i-sahne', { status: 'PURCHASED' });
        db.tables.pantryItem[0].mealPlanRecipeId = 'e1';
        await setShoppingItemStatus(db, USER, 'i-sahne', { status: 'OPEN' });
        assert.equal(db.tables.pantryItem.length, 1);
    });
});
