import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { planShelfLifeUpdate, type IngredientShelfLifeState } from './plan';
import type { ShelfLifeItem } from './schema';

const items: ShelfLifeItem[] = JSON.parse(
    readFileSync(new URL('./fixtures/results-sample.json', import.meta.url), 'utf8'),
);
const byName = (name: string) => {
    const item = items.find((entry) => entry.normalizedName === name);
    assert.ok(item, name);
    return item;
};

const blank = (overrides: Partial<IngredientShelfLifeState> = {}): IngredientShelfLifeState => ({
    id: 'ing',
    name: 'Original, roh',
    pluralName: null,
    normalizedName: null,
    normalizedNameManual: false,
    needsReview: false,
    defaultStorage: null,
    openedShelfLifeDays: null,
    openSensitive: false,
    packSize: null,
    packUnit: null,
    shelfLifeSource: null,
    shelfLifeConfidence: null,
    storageLives: [],
    ...overrides,
});

const applyLocally = (state: IngredientShelfLifeState, item: ShelfLifeItem) => {
    const plan = planShelfLifeUpdate(state, item);
    return {
        plan,
        next: {
            ...state,
            ...plan.changes,
            storageLives: plan.storageLives ?? state.storageLives,
        } as IngredientShelfLifeState,
    };
};

test('fresh ingredient gets all fields, name stays', () => {
    const gambas = byName('Gambas');
    const { plan } = applyLocally(blank(), gambas);
    assert.equal(plan.changed, true);
    assert.equal(plan.changes.shelfLifeSource, 'AI');
    assert.equal(plan.changes.defaultStorage, 'FRIDGE');
    assert.equal(plan.changes.normalizedName, 'Gambas');
    assert.equal(plan.changes.pluralName, 'Gambas');
    assert.equal('name' in plan.changes, false);
    assert.deepEqual(plan.storageLives, [
        { storage: 'FRIDGE', days: 2 },
        { storage: 'FREEZER', days: 90 },
    ]);
    // raw shrimp: no PANTRY row
    assert.equal(
        plan.storageLives?.some((life) => life.storage === 'PANTRY'),
        false,
    );
});

test('second run is idempotent', () => {
    for (const item of items.slice(0, 8)) {
        const { next } = applyLocally(blank(), item);
        const second = planShelfLifeUpdate(next, item);
        assert.equal(second.changed, false, item.normalizedName);
    }
});

test('MANUAL shelf life is never overwritten', () => {
    const state = blank({
        shelfLifeSource: 'MANUAL',
        defaultStorage: 'FRIDGE',
        storageLives: [{ storage: 'FRIDGE', days: 5 }],
        openSensitive: true,
    });
    const plan = planShelfLifeUpdate(state, byName('Milch'));
    assert.equal(plan.manualShelfLifeKept, true);
    assert.equal(plan.storageLives, null);
    assert.deepEqual(Object.keys(plan.changes), ['normalizedName']);
});

test('manual normalizedName and existing pluralName are kept', () => {
    const state = blank({
        normalizedName: 'Garnele',
        normalizedNameManual: true,
        pluralName: 'Garnelen',
    });
    const plan = planShelfLifeUpdate(state, byName('Gambas'));
    assert.equal('normalizedName' in plan.changes, false);
    assert.equal('pluralName' in plan.changes, false);
});

test('not applicable: source AI without rows, old rows removed', () => {
    const state = blank({
        defaultStorage: 'FRIDGE',
        storageLives: [{ storage: 'FRIDGE', days: 3 }],
        packSize: 200,
        packUnit: 'G',
    });
    const plan = planShelfLifeUpdate(state, byName('Armer Ritter'));
    assert.equal(plan.changes.shelfLifeSource, 'AI');
    assert.deepEqual(plan.storageLives, []);
    assert.equal(plan.changes.defaultStorage, null);
    assert.equal(plan.changes.packSize, null);
    assert.equal(plan.changes.packUnit, null);
});

test('LOW confidence sets needsReview, other levels never clear it', () => {
    const low = { ...byName('Kefe'), confidence: 'LOW' as const };
    assert.equal(planShelfLifeUpdate(blank(), low).changes.needsReview, true);
    const high = planShelfLifeUpdate(blank({ needsReview: true }), byName('Salz'));
    assert.equal('needsReview' in high.changes, false);
});

test('changed storage set replaces rows', () => {
    const state = blank({
        shelfLifeSource: 'AI',
        storageLives: [
            { storage: 'PANTRY', days: 3 },
            { storage: 'FRIDGE', days: 2 },
        ],
    });
    const plan = planShelfLifeUpdate(state, byName('Gambas'));
    assert.deepEqual(plan.storageLives, [
        { storage: 'FRIDGE', days: 2 },
        { storage: 'FREEZER', days: 90 },
    ]);
});
