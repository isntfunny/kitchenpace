import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { SHELF_LIFE_PROMPT } from './prompt';
import {
    getShelfLifeJsonSchema,
    IngredientShelfLifeInputSchema,
    ShelfLifeItemSchema,
    ShelfLifeWireResponseSchema,
} from './schema';

const fixture = (name: string) =>
    JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

test('generated JSON schema equals the tested schema v6e', () => {
    assert.deepStrictEqual(getShelfLifeJsonSchema(), fixture('schema-v6e.json'));
});

test('prompt is the unchanged v6e text', () => {
    const hash = createHash('sha256').update(SHELF_LIFE_PROMPT).digest('hex');
    assert.equal(hash, 'cc71959adfe07e543a31b0764df6ac5c419db781f496302b97b69d7d9dca5a68');
});

test('sample results validate, broken entries are rejected', () => {
    const items: unknown[] = fixture('results-sample.json');
    const results = items.map((item) => ShelfLifeItemSchema.safeParse(item));
    const invalidIds = items
        .filter((_, index) => !results[index].success)
        .map((item) => (item as { id: string }).id);
    assert.deepEqual(invalidIds, ['invalid-default-missing', 'invalid-days', 'invalid-shape']);
    assert.ok(ShelfLifeWireResponseSchema.safeParse({ items: items.slice(0, 8) }).success);
});

test('wrong enum value fails validation', () => {
    const [first] = fixture('results-sample.json');
    assert.equal(
        ShelfLifeItemSchema.safeParse({ ...first, defaultStorage: 'vorrat' }).success,
        false,
    );
    assert.equal(ShelfLifeItemSchema.safeParse({ ...first, confidence: 'hoch' }).success, false);
});

test('not applicable needs no storage data', () => {
    const result = ShelfLifeItemSchema.safeParse({
        id: 'x',
        applicable: false,
        normalizedName: 'Tzatziki',
        defaultStorage: null,
        storageLives: [],
        packSize: null,
        packUnit: null,
        shelfLifeOpenedDays: null,
        openSensitive: false,
        confidence: 'HIGH',
        note: '',
        pluralName: null,
    });
    assert.ok(result.success);
});

test('admin input: default storage needs days, pack size needs a unit', () => {
    const base = {
        storageDays: { FRIDGE: 2, PANTRY: null, FREEZER: 90 },
        defaultStorage: 'FRIDGE' as const,
        openedShelfLifeDays: 0,
        openSensitive: true,
        packSize: 500,
        packUnit: 'G' as const,
    };
    assert.ok(IngredientShelfLifeInputSchema.safeParse(base).success);
    assert.equal(
        IngredientShelfLifeInputSchema.safeParse({ ...base, defaultStorage: 'PANTRY' }).success,
        false,
    );
    assert.equal(
        IngredientShelfLifeInputSchema.safeParse({ ...base, packUnit: null }).success,
        false,
    );
    assert.equal(
        IngredientShelfLifeInputSchema.safeParse({
            ...base,
            storageDays: { ...base.storageDays, FREEZER: 0 },
        }).success,
        false,
    );
});
