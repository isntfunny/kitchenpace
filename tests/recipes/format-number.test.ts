import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatNumber, scaleQuantity } from '../../src/lib/ingredients/quantities';
import { formatQuantity } from '../../src/lib/shopping/quantity';

test('formatNumber: German decimals, no grouping, at most two decimals', () => {
    assert.equal(formatNumber(1.25), '1,25');
    assert.equal(formatNumber(1.256), '1,26');
    assert.equal(formatNumber(12000), '12000');
    assert.equal(formatNumber(0), '0');
    assert.equal(formatNumber(0.004), '0');
    assert.equal(formatNumber(0.004, { keepSmall: true }), '0,004');
    assert.equal(formatNumber(0.0123, { keepSmall: true }), '0,01');
    assert.equal(formatNumber(0.00456, { keepSmall: true }), '0,0046');
});

test('recipe scaling keeps tiny amounts visible; ranges stay ranges', () => {
    assert.equal(scaleQuantity('1/8', 1 / 20), '0,0063');
    assert.equal(scaleQuantity('2-3', 1.5), '3–4,5');
    assert.equal(scaleQuantity('1/2', 3), '1,5');
});

test('shopping amounts round tiny values like any other', () => {
    assert.equal(
        formatQuantity({ quantity: 0.004, baseUnit: 'G', displayUnit: null, quantityText: null }),
        '0 g',
    );
    assert.equal(
        formatQuantity({ quantity: 1250, baseUnit: 'G', displayUnit: 'kg', quantityText: null }),
        '1,25 kg',
    );
});
