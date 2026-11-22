import assert from 'node:assert/strict';
import { test } from 'node:test';

import { weekDays, weekRange, weekStartFor } from '../../src/lib/meal-plan/week';

test('week start follows the user setting, not the calendar week', () => {
    // 2026-11-21 is a Saturday
    assert.equal(weekStartFor('2026-11-21', 1), '2026-11-16');
    assert.equal(weekStartFor('2026-11-21', 6), '2026-11-21');
    assert.equal(weekStartFor('2026-11-21', 7), '2026-11-15');
    assert.equal(weekStartFor('2026-11-15', 7), '2026-11-15');
    assert.throws(() => weekStartFor('2026-11-21', 0));
});

test('weeks cross month and year boundaries', () => {
    assert.deepEqual(weekDays('2026-12-28'), [
        '2026-12-28',
        '2026-12-29',
        '2026-12-30',
        '2026-12-31',
        '2027-01-01',
        '2027-01-02',
        '2027-01-03',
    ]);
    assert.deepEqual(weekRange('2026-02-26'), { from: '2026-02-26', to: '2026-03-04' });
});
