import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseSpec, specFromItem } from '@app/lib/bring/sync-spec';

const empty = { quantity: null, baseUnit: null, displayUnit: null, quantityText: null, note: null };

test('spec joins amount and note', () => {
    assert.equal(
        specFromItem({ ...empty, quantity: 400, baseUnit: 'G', displayUnit: 'g', note: 'Bio' }),
        '400 g · Bio',
    );
    assert.equal(specFromItem({ ...empty, note: 'Bio' }), 'Bio');
    assert.equal(specFromItem(empty), '');
});

test('spec is read back into amount and note', () => {
    const parsed = parseSpec('400 g · Bio');
    assert.equal(parsed.quantity, 400);
    assert.equal(parsed.baseUnit, 'G');
    assert.equal(parsed.note, 'Bio');
    assert.equal(parseSpec('Bio').note, 'Bio');
    assert.equal(parseSpec('Bio').quantity, null);
    assert.equal(parseSpec('2 Bund').quantityText, '2 Bund');
    assert.equal(parseSpec('1/2 TL').quantityText, '1/2 TL');
    assert.equal(parseSpec('450 g + 1 Bund').quantityText, '1 Bund');
    assert.deepEqual(parseSpec(''), empty);
});

test('reading a spec and writing it again is stable (no ping-pong between the apps)', () => {
    for (const spec of [
        '400 g',
        '0,5 kg',
        '2 Bund',
        '450 g + 1 Bund',
        'Bio',
        '3 Stk · fest',
        '1/2 TL',
        '',
    ]) {
        const once = specFromItem(parseSpec(spec));
        assert.equal(specFromItem(parseSpec(once)), once, spec);
    }
});
