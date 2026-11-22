import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clamp01, jaccard } from './math';
import { plural } from './text';

test('clamp01 keeps values between 0 and 1', () => {
    assert.deepEqual([-1, 0, 0.4, 1, 2].map(clamp01), [0, 0, 0.4, 1, 1]);
});

test('jaccard on arrays and sets; the caller decides about two empty sets', () => {
    assert.equal(jaccard(['a', 'b'], ['b', 'c'], { bothEmpty: 0 }), 1 / 3);
    assert.equal(jaccard(new Set(['a', 'a', 'b']), new Set(['a', 'b']), { bothEmpty: 0 }), 1);
    assert.equal(jaccard(['a'], [], { bothEmpty: 1 }), 0);
    assert.equal(jaccard([], [], { bothEmpty: 1 }), 1);
    assert.equal(jaccard(new Set<string>(), new Set<string>(), { bothEmpty: 0 }), 0);
});

test('plural picks the noun by count', () => {
    assert.equal(plural(1, 'Tag', 'Tage'), '1 Tag');
    assert.equal(plural(0, 'Tag', 'Tage'), '0 Tage');
    assert.equal(plural(3, 'Tag', 'Tage'), '3 Tage');
});
