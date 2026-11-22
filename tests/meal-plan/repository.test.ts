import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    addMealPlanEntry,
    deleteMealPlanEntry,
    getMealPlanSettings,
    listMealPlanEntries,
    restoreMealPlanEntry,
    updateMealPlanEntry,
    updateMealPlanSettings,
} from '../../src/lib/meal-plan/repository';
import {
    getSharedMealPlanWeek,
    revokeMealPlanShare,
    shareMealPlanWeek,
} from '../../src/lib/meal-plan/share';
import {
    addPantryItem,
    setPantryItemStatus,
    updatePantryItem,
} from '../../src/lib/pantry/repository';
import {
    addShoppingItems,
    deleteShoppingItem,
    setShoppingItemStatus,
    snoozeShoppingSuggestion,
    updateShoppingItem,
} from '../../src/lib/shopping/repository';

import { createFakeDb } from './fake-db';

const recipe = (id: string, extra = {}) => ({
    id,
    title: id,
    status: 'PUBLISHED',
    moderationStatus: 'APPROVED',
    authorId: 'someone',
    ...extra,
});

function seed() {
    return createFakeDb({
        profile: [
            {
                userId: 'alice',
                householdSize: 3,
                weekStartDay: 1,
                timezone: 'Europe/Berlin',
                mealPlanSlots: null,
            },
            {
                userId: 'bob',
                householdSize: null,
                weekStartDay: 7,
                timezone: 'Europe/Berlin',
                mealPlanSlots: null,
            },
        ],
        recipe: [
            recipe('pasta'),
            recipe('curry'),
            recipe('draft-of-bob', { status: 'DRAFT', authorId: 'bob' }),
            recipe('rejected', { moderationStatus: 'REJECTED' }),
        ],
        ingredient: [{ id: 'onion' }, { id: 'cream' }],
        unit: [
            { shortName: 'g', gramsDefault: 1 },
            { shortName: 'EL', gramsDefault: 15 },
            { shortName: 'Stk', gramsDefault: null },
        ],
        ingredientUnit: [{ ingredientId: 'onion', grams: 80, unit: { shortName: 'Stk' } }],
    });
}

const notFound = { name: 'DataAccessError', code: 'NOT_FOUND' };

test('entries default to household servings and append within a slot', async () => {
    const db = seed();
    const first = await addMealPlanEntry(db, 'alice', {
        recipeId: 'pasta',
        date: '2026-11-24',
        slot: 'DINNER',
    });
    const side = await addMealPlanEntry(db, 'alice', {
        recipeId: 'curry',
        date: '2026-11-24',
        slot: 'DINNER',
    });
    assert.equal(first.servings, 3);
    assert.deepEqual([first.position, side.position], [0, 1]);
    assert.equal(first.slot, 'DINNER');
    assert.equal(first.mealType, 'DINNER');
    assert.equal(first.customMealType, null);

    const bobs = await addMealPlanEntry(db, 'bob', {
        recipeId: 'pasta',
        date: '2026-11-24',
        slot: 'c_brunch',
    });
    assert.equal(bobs.servings, 2);
    assert.deepEqual([bobs.mealType, bobs.customMealType], [null, 'c_brunch']);
});

test('other users can neither read nor change entries', async () => {
    const db = seed();
    const entry = await addMealPlanEntry(db, 'alice', {
        recipeId: 'pasta',
        date: '2026-11-24',
        slot: 'LUNCH',
    });
    assert.equal(
        (await listMealPlanEntries(db, 'bob', { from: '2026-11-23', to: '2026-11-29' })).length,
        0,
    );
    await assert.rejects(updateMealPlanEntry(db, 'bob', entry.id, { servings: 8 }), notFound);
    await assert.rejects(deleteMealPlanEntry(db, 'bob', entry.id), notFound);
    await assert.rejects(
        addMealPlanEntry(db, 'bob', {
            recipeId: 'curry',
            date: '2026-11-24',
            slot: 'LUNCH',
            leftoverOfId: entry.id,
        }),
        notFound,
    );
    assert.equal(
        (await listMealPlanEntries(db, 'alice', { from: '2026-11-24', to: '2026-11-24' }))[0]
            .servings,
        3,
    );
});

test('only visible recipes can be planned and input is validated', async () => {
    const db = seed();
    await assert.rejects(
        addMealPlanEntry(db, 'alice', {
            recipeId: 'draft-of-bob',
            date: '2026-11-24',
            slot: 'LUNCH',
        }),
        notFound,
    );
    await assert.rejects(
        addMealPlanEntry(db, 'alice', { recipeId: 'rejected', date: '2026-11-24', slot: 'LUNCH' }),
        notFound,
    );
    assert.ok(
        await addMealPlanEntry(db, 'bob', {
            recipeId: 'draft-of-bob',
            date: '2026-11-24',
            slot: 'LUNCH',
        }),
    );
    await assert.rejects(
        addMealPlanEntry(db, 'alice', { recipeId: 'pasta', date: '2026-02-30', slot: 'LUNCH' }),
        {
            name: 'ZodError',
        },
    );
    await assert.rejects(
        addMealPlanEntry(db, 'alice', { recipeId: 'pasta', date: '2026-11-24', slot: 'BRUNCH' }),
        {
            name: 'ZodError',
        },
    );
    await assert.rejects(
        addMealPlanEntry(db, 'alice', {
            recipeId: 'pasta',
            date: '2026-11-24',
            slot: 'LUNCH',
            servings: 0,
        }),
        { name: 'ZodError' },
    );
});

test('moving appends to the target slot, delete can be undone', async () => {
    const db = seed();
    await addMealPlanEntry(db, 'alice', { recipeId: 'curry', date: '2026-11-25', slot: 'LUNCH' });
    const entry = await addMealPlanEntry(db, 'alice', {
        recipeId: 'pasta',
        date: '2026-11-24',
        slot: 'LUNCH',
    });
    const moved = await updateMealPlanEntry(db, 'alice', entry.id, { date: '2026-11-25' });
    assert.equal(moved.position, 1);

    const snapshot = await deleteMealPlanEntry(db, 'alice', entry.id);
    assert.equal(
        (await listMealPlanEntries(db, 'alice', { from: '2026-11-25', to: '2026-11-25' })).length,
        1,
    );
    const restored = await restoreMealPlanEntry(db, 'alice', JSON.parse(JSON.stringify(snapshot)));
    assert.equal(restored.id, entry.id);
    await assert.rejects(restoreMealPlanEntry(db, 'alice', snapshot), { code: 'CONFLICT' });
});

test('settings are validated and stored per user', async () => {
    const db = seed();
    await updateMealPlanSettings(db, 'alice', { weekStartDay: 6, timezone: 'Europe/Vienna' });
    assert.equal((await getMealPlanSettings(db, 'alice')).weekStartDay, 6);
    assert.equal((await getMealPlanSettings(db, 'bob')).weekStartDay, 7);
    await assert.rejects(updateMealPlanSettings(db, 'alice', { weekStartDay: 8 }), {
        name: 'ZodError',
    });
    await assert.rejects(updateMealPlanSettings(db, 'alice', { timezone: 'Mars/Olympus' }), {
        name: 'ZodError',
    });
    await assert.rejects(updateMealPlanSettings(db, 'alice', { userId: 'bob' }), {
        name: 'ZodError',
    });
    await assert.rejects(updateMealPlanSettings(db, 'nobody', { weekStartDay: 1 }), notFound);
    // Without profile the defaults apply
    assert.equal((await getMealPlanSettings(db, 'nobody')).slots.length, 4);
});

test('a shared week shows no notes and stops working after revoking', async () => {
    const db = seed();
    await addMealPlanEntry(db, 'alice', {
        recipeId: 'pasta',
        date: '2026-11-24',
        slot: 'DINNER',
        notes: 'private',
        time: '18:45',
    });
    const { shareToken } = await shareMealPlanWeek(db, 'alice', '2026-11-23');
    const shared = await getSharedMealPlanWeek(db, shareToken!);
    assert.equal(shared!.entries.length, 1);
    assert.deepEqual(Object.keys(shared!.entries[0]).sort(), [
        'date',
        'position',
        'recipe',
        'servings',
        'slot',
        'time',
    ]);
    assert.equal((await revokeMealPlanShare(db, 'bob', '2026-11-23')).revoked, false);
    assert.ok(await getSharedMealPlanWeek(db, shareToken!));
    assert.equal((await revokeMealPlanShare(db, 'alice', '2026-11-23')).revoked, true);
    assert.equal(await getSharedMealPlanWeek(db, shareToken!), null);
    assert.equal(await getSharedMealPlanWeek(db, 'short'), null);
});

test('an ingredient is on the list exactly once and amounts are merged', async () => {
    const db = seed();
    const monday = await addMealPlanEntry(db, 'alice', {
        recipeId: 'pasta',
        date: '2026-11-23',
        slot: 'DINNER',
    });
    await addShoppingItems(db, 'alice', [
        {
            ingredientId: 'onion',
            name: 'Zwiebel',
            amount: '2',
            unit: 'Stk',
            mealPlanRecipeId: monday.id,
        },
        {
            ingredientId: 'onion',
            name: 'Zwiebel',
            amount: '100',
            unit: 'g',
            recipeId: 'curry',
            kind: 'RECIPE',
        },
    ]);
    // Adding the same plan entry again does not double the amount
    await addShoppingItems(db, 'alice', [
        {
            ingredientId: 'onion',
            name: 'Zwiebel',
            amount: '2',
            unit: 'Stk',
            mealPlanRecipeId: monday.id,
        },
    ]);
    const items = db.tables.shoppingItem;
    assert.equal(items.length, 1);
    assert.deepEqual([items[0].quantity, items[0].baseUnit, items[0].status], [260, 'G', 'OPEN']);
    assert.equal(db.tables.shoppingItemSource.length, 2);
    assert.equal(db.tables.shoppingHistory.filter((h: any) => h.event === 'ADDED').length, 2);

    // Free text is unique by normalized name
    await addShoppingItems(db, 'alice', [{ name: 'Spülmittel' }, { name: '  SPÜLMITTEL ' }]);
    assert.equal(db.tables.shoppingItem.filter((i: any) => i.itemKey === 't:spülmittel').length, 1);
});

test('re-adding a purchased item moves it back to open with a fresh amount', async () => {
    const db = seed();
    const [item] = await addShoppingItems(db, 'alice', [
        { ingredientId: 'cream', name: 'Sahne', amount: '200', unit: 'g' },
    ]);
    const { history } = await setShoppingItemStatus(db, 'alice', item.id, { status: 'PURCHASED' });
    assert.deepEqual(
        [history!.event, history!.quantity, history!.itemKey],
        ['PURCHASED', 200, 'i:cream'],
    );
    const [again] = await addShoppingItems(db, 'alice', [
        { ingredientId: 'cream', name: 'Sahne', amount: '100', unit: 'g' },
    ]);
    assert.equal(again.id, item.id);
    assert.deepEqual([again.status, again.quantity], ['OPEN', 100]);
    assert.equal(db.tables.shoppingItem.length, 1);
});

test('lists are private per user', async () => {
    const db = seed();
    const [item] = await addShoppingItems(db, 'alice', [
        { ingredientId: 'onion', name: 'Zwiebel' },
    ]);
    const [bobsItem] = await addShoppingItems(db, 'bob', [
        { ingredientId: 'onion', name: 'Zwiebel' },
    ]);
    assert.notEqual(item.id, bobsItem.id);
    assert.notEqual(item.shoppingListId, bobsItem.shoppingListId);
    await assert.rejects(updateShoppingItem(db, 'bob', item.id, { note: 'x' }), notFound);
    await assert.rejects(
        setShoppingItemStatus(db, 'bob', item.id, { status: 'PURCHASED' }),
        notFound,
    );
    await assert.rejects(deleteShoppingItem(db, 'bob', item.id), notFound);
    // Plan entries of others cannot be used as a source
    const entry = await addMealPlanEntry(db, 'alice', {
        recipeId: 'pasta',
        date: '2026-11-24',
        slot: 'LUNCH',
    });
    await assert.rejects(
        addShoppingItems(db, 'bob', [
            { ingredientId: 'onion', name: 'Zwiebel', mealPlanRecipeId: entry.id },
        ]),
        notFound,
    );
    await assert.rejects(
        addShoppingItems(db, 'alice', [{ ingredientId: 'unknown', name: 'X' }]),
        notFound,
    );
    await assert.rejects(updateShoppingItem(db, 'alice', item.id, { quantity: 5 }), {
        name: 'ZodError',
    });
});

test('snoozes count up and pantry items are private', async () => {
    const db = seed();
    const until = new Date('2026-12-01T00:00:00Z');
    await snoozeShoppingSuggestion(db, 'alice', { itemKey: 'i:onion', until });
    const second = await snoozeShoppingSuggestion(db, 'alice', { itemKey: 'i:onion', until });
    assert.equal(second.dismissCount, 2);

    const pantry = await addPantryItem(db, 'alice', {
        ingredientId: 'cream',
        name: 'Sahne',
        quantity: 100,
        baseUnit: 'ML',
        source: 'PURCHASE',
    });
    await assert.rejects(setPantryItemStatus(db, 'bob', pantry.id, 'USED_UP'), notFound);
    await assert.rejects(
        updatePantryItem(db, 'alice', pantry.id, { quantity: 5, baseUnit: null }),
        {
            name: 'ZodError',
        },
    );
    assert.equal(
        (await setPantryItemStatus(db, 'alice', pantry.id, 'DISCARDED')).status,
        'DISCARDED',
    );
});
