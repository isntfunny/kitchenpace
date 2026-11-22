import assert from 'node:assert/strict';
import { test } from 'node:test';

import { itemKeyFor, normalizeItemName } from '../../shared/shopping/item-key';
import {
    expiresAfterOpening,
    isLeftoverHintEligible,
    remainingAfterUse,
} from '../../src/lib/pantry/rules';
import {
    addToQuantity,
    EMPTY_QUANTITY,
    formatQuantity,
    parseShoppingAmount,
    sumQuantities,
    toBaseQuantity,
} from '../../src/lib/shopping/quantity';

const units = { EL: 15, TL: 5, Prise: 0.5, Bund: null, Stk: null };
const onion = { unitDefaults: units, ingredientGrams: { Stk: 80 } };

test('amounts parse fractions and use the upper end of ranges', () => {
    assert.equal(parseShoppingAmount('1/2'), 0.5);
    assert.equal(parseShoppingAmount('1,5'), 1.5);
    assert.equal(parseShoppingAmount('2–3'), 3);
    assert.equal(parseShoppingAmount('nach Geschmack'), null);
    assert.equal(parseShoppingAmount('0'), null);
});

test('units convert into g, ml or pieces', () => {
    assert.deepEqual(toBaseQuantity('1,5', 'kg'), { quantity: 1500, baseUnit: 'G' });
    assert.deepEqual(toBaseQuantity('0,2', 'l'), { quantity: 200, baseUnit: 'ML' });
    assert.deepEqual(toBaseQuantity('2', 'EL', onion), { quantity: 30, baseUnit: 'G' });
    assert.deepEqual(toBaseQuantity('3', ''), { quantity: 3, baseUnit: 'PIECE' });
    assert.deepEqual(toBaseQuantity('2', 'Stk', onion), { quantity: 2, baseUnit: 'PIECE' });
    assert.equal(toBaseQuantity('1', 'Bund', onion), null);
    // Ingredient-specific grams win over the unit default
    assert.deepEqual(
        toBaseQuantity('1', 'EL', { unitDefaults: units, ingredientGrams: { EL: 10 } }),
        {
            quantity: 10,
            baseUnit: 'G',
        },
    );
});

test('amounts of several recipes add up in the base unit', () => {
    const cream = sumQuantities([
        { amount: '200', unit: 'ml' },
        { amount: '0,1', unit: 'l' },
    ]);
    assert.deepEqual([cream.quantity, cream.baseUnit, cream.displayUnit], [300, 'ML', 'ml']);
    assert.equal(formatQuantity(cream), '300 ml');

    // Same display unit stays; mixed units fall back to the base unit
    const salt = sumQuantities(
        [
            { amount: '1', unit: 'EL' },
            { amount: '1', unit: 'EL' },
        ],
        onion,
    );
    assert.equal(formatQuantity(salt, onion), '2 EL');
    const mixed = sumQuantities(
        [
            { amount: '1', unit: 'EL' },
            { amount: '1', unit: 'TL' },
        ],
        onion,
    );
    assert.equal(formatQuantity(mixed, onion), '20 g');
});

test('pieces and grams combine only with a known piece weight', () => {
    const onions = sumQuantities(
        [
            { amount: '2', unit: 'Stk' },
            { amount: '100', unit: 'g' },
        ],
        onion,
    );
    assert.deepEqual([onions.quantity, onions.baseUnit], [260, 'G']);

    const unknown = sumQuantities([
        { amount: '2', unit: 'Stk' },
        { amount: '100', unit: 'g' },
    ]);
    assert.deepEqual(
        [unknown.quantity, unknown.baseUnit, unknown.quantityText],
        [2, 'PIECE', '100 g'],
    );
    assert.equal(formatQuantity(unknown), '2 Stk + 100 g');
});

test('amounts without safe conversion stay as text', () => {
    const parsley = addToQuantity(
        addToQuantity(EMPTY_QUANTITY, '200', 'g', onion),
        '1',
        'Bund',
        onion,
    );
    assert.equal(formatQuantity(parsley, onion), '200 g + 1 Bund');
    const taste = addToQuantity(EMPTY_QUANTITY, 'etwas', null);
    assert.deepEqual([taste.quantity, taste.quantityText], [null, 'etwas']);
    const volumeAndMass = sumQuantities([
        { amount: '100', unit: 'ml' },
        { amount: '50', unit: 'g' },
    ]);
    assert.equal(formatQuantity(volumeAndMass), '100 ml + 50 g');
});

test('item keys make each ingredient and free-text name unique', () => {
    assert.equal(itemKeyFor({ ingredientId: 'ing1', name: 'Zwiebel' }), 'i:ing1');
    assert.equal(itemKeyFor({ name: '  Spül  Mittel ' }), 't:spül mittel');
    assert.equal(itemKeyFor({ name: 'SPÜL MITTEL' }), itemKeyFor({ name: 'spül mittel' }));
    assert.equal(normalizeItemName('Küchenrolle'), 'küchenrolle');
    assert.throws(() => itemKeyFor({ name: '   ' }));
});

test('pantry leftovers need reliable data', () => {
    const opened = new Date('2026-11-20T10:00:00Z');
    assert.equal(expiresAfterOpening(opened, 3)!.toISOString(), '2026-11-23T10:00:00.000Z');
    assert.equal(expiresAfterOpening(opened, null), null);
    const cream = { openSensitive: true, openedShelfLifeDays: 3, packSize: 200 };
    const base = {
        status: 'AVAILABLE' as const,
        openedAt: opened,
        quantity: 100,
        ingredient: cream,
    };
    assert.equal(isLeftoverHintEligible(base), true);
    assert.equal(
        isLeftoverHintEligible({ ...base, ingredient: { ...cream, packSize: null } }),
        false,
    );
    assert.equal(
        isLeftoverHintEligible({ ...base, ingredient: { ...cream, openSensitive: false } }),
        false,
    );
    assert.equal(isLeftoverHintEligible({ ...base, leftoverHintDismissedAt: opened }), false);
    assert.equal(isLeftoverHintEligible({ ...base, ingredient: null }), false);
    assert.equal(remainingAfterUse(200, 150), 50);
    assert.equal(remainingAfterUse(100, 150), 0);
    assert.equal(remainingAfterUse(null, 10), null);
});
