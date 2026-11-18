import assert from 'node:assert/strict';
import { test } from 'node:test';

import { perishability, perishabilityForDays } from './perishability';

test('thresholds: sofort ≤ 2, hoch 3–4, mittel 5–21, unkritisch longer', () => {
    assert.equal(perishabilityForDays(1), 'IMMEDIATE');
    assert.equal(perishabilityForDays(2), 'IMMEDIATE');
    assert.equal(perishabilityForDays(3), 'HIGH');
    assert.equal(perishabilityForDays(4), 'HIGH');
    assert.equal(perishabilityForDays(5), 'MEDIUM');
    assert.equal(perishabilityForDays(21), 'MEDIUM');
    assert.equal(perishabilityForDays(22), 'LOW');
    assert.equal(perishabilityForDays(3650), 'LOW');
});

test('uses the days of the default storage, not the longest', () => {
    const minced = [
        { storage: 'FRIDGE' as const, days: 2 },
        { storage: 'FREEZER' as const, days: 90 },
    ];
    assert.equal(perishability('FRIDGE', minced), 'IMMEDIATE');
    assert.equal(perishability('FREEZER', minced), 'LOW');
});

test('no default storage or no row for it gives null instead of failing', () => {
    assert.equal(perishability(null, []), null);
    assert.equal(perishability(undefined, []), null);
    assert.equal(perishability('PANTRY', [{ storage: 'FRIDGE', days: 2 }]), null);
});
