import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seasonOf } from './season';

test('seasonOf uses the month of the date', () => {
    assert.equal(seasonOf('2026-04-01'), 'fruehling');
    assert.equal(seasonOf('2026-11-23'), 'herbst');
    assert.equal(seasonOf('2026-12-24'), 'winter');
});
