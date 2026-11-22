import assert from 'node:assert/strict';
import test from 'node:test';

import { recipesForSlot } from '../../src/lib/meal-plan/picker';

const recipe = (title: string, categorySlugs: string[], tags: string[] = []) => ({
    id: title,
    title,
    categorySlugs,
    tags,
});

const favorites = [
    recipe('Bratensoße', ['beilage']),
    recipe('Gulasch', ['hauptgericht']),
    recipe('Apfelkuchen', ['backen'], ['Kaffee & Kuchen']),
    recipe('Pancakes', ['fruehstueck']),
];

test('picker lists hide sauces for dinner', () => {
    const titles = recipesForSlot(favorites, { slotKey: 'DINNER', time: '18:30' }).map(
        (r) => r.title,
    );
    assert.deepEqual(titles, ['Gulasch']);
});

test('a custom slot at 15:30 follows the snack rule', () => {
    const titles = recipesForSlot(favorites, { slotKey: 'custom:kaffee', time: '15:30' }).map(
        (r) => r.title,
    );
    assert.deepEqual(titles, ['Apfelkuchen']);
});

test('without a slot every recipe stays', () => {
    assert.equal(recipesForSlot(favorites, undefined).length, 4);
});

test('recipes without known categories stay (index not synced yet)', () => {
    const hits = [recipe('Unbekannt', []), recipe('Bratensoße', ['beilage'])];
    assert.deepEqual(
        recipesForSlot(hits, { slotKey: 'DINNER', time: '18:30' }, { keepUnknown: true }).map(
            (r) => r.title,
        ),
        ['Unbekannt'],
    );
});
