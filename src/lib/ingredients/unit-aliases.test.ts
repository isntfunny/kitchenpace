import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalUnitName } from './unit-aliases';

test('maps common abbreviations to existing unit names', () => {
    for (const [input, expected] of [
        ['Pck.', 'Päckchen'],
        [' pck. ', 'Päckchen'],
        ['Pkg.', 'Päckchen'],
        ['St.', 'Stk'],
        ['Bd.', 'Bund'],
        ['gr', 'g'],
        ['Messerspitze', 'Msp.'],
    ]) {
        assert.equal(canonicalUnitName(input), expected, input);
    }
});

test('keeps unknown or already canonical units unchanged (trimmed)', () => {
    assert.equal(canonicalUnitName(' EL '), 'EL');
    assert.equal(canonicalUnitName('Zehe'), 'Zehe');
    assert.equal(canonicalUnitName(''), '');
});
