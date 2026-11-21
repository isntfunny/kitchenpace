import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    addDays,
    isoWeekNumber,
    isoWeekday,
    parseIsoDate,
    todayIn,
    weekDays,
    weekRange,
    weekStartFor,
    zonedTimeToUtc,
} from '../../src/lib/meal-plan/week';

test('dates parse strictly and reject impossible days', () => {
    assert.ok(parseIsoDate('2026-02-28'));
    assert.equal(parseIsoDate('2026-02-29'), null);
    assert.ok(parseIsoDate('2028-02-29'));
    assert.equal(parseIsoDate('2026-13-01'), null);
    assert.equal(parseIsoDate('2026-1-01'), null);
    assert.equal(parseIsoDate('kw47'), null);
});

test('week start follows the user setting, not the calendar week', () => {
    // 2026-11-21 is a Saturday
    assert.equal(isoWeekday('2026-11-21'), 6);
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
    assert.equal(addDays('2026-01-01', -1), '2025-12-31');
    assert.equal(isoWeekNumber('2026-12-31'), 53);
    assert.equal(isoWeekNumber('2027-01-04'), 1);
    assert.equal(isoWeekNumber('2026-11-21'), 47);
});

test('today is computed in the user timezone', () => {
    const instant = new Date('2026-11-21T23:30:00Z');
    assert.equal(todayIn('Europe/Berlin', instant), '2026-11-22');
    assert.equal(todayIn('America/New_York', instant), '2026-11-21');
});

test('local slot times convert to UTC across daylight saving changes', () => {
    const tz = 'Europe/Berlin';
    assert.equal(
        zonedTimeToUtc('2026-03-28', '19:00', tz).toISOString(),
        '2026-03-28T18:00:00.000Z',
    );
    assert.equal(
        zonedTimeToUtc('2026-03-29', '19:00', tz).toISOString(),
        '2026-03-29T17:00:00.000Z',
    );
    // 02:30 does not exist on the spring change: resolves after the gap (03:30 CEST)
    assert.equal(
        zonedTimeToUtc('2026-03-29', '02:30', tz).toISOString(),
        '2026-03-29T01:30:00.000Z',
    );
    // 02:30 happens twice on the autumn change: first occurrence (CEST)
    assert.equal(
        zonedTimeToUtc('2026-10-25', '02:30', tz).toISOString(),
        '2026-10-25T00:30:00.000Z',
    );
    assert.equal(
        zonedTimeToUtc('2026-10-25', '19:00', tz).toISOString(),
        '2026-10-25T18:00:00.000Z',
    );
    assert.equal(
        zonedTimeToUtc('2026-07-01', '00:00', 'UTC').toISOString(),
        '2026-07-01T00:00:00.000Z',
    );
});
