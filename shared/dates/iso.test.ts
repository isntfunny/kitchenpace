import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    addDays,
    assertWeekday,
    diffDays,
    formatIsoDate,
    isIsoDate,
    isoWeek,
    isoWeekday,
    isoWeekNumber,
    isWeekend,
    parseIsoDate,
    weekdayLong,
    weekdayNameLong,
    weekdayNameShort,
    weekdayShort,
} from './iso';

test('dates parse strictly and reject impossible days', () => {
    assert.ok(parseIsoDate('2026-02-28'));
    assert.equal(parseIsoDate('2026-02-29'), null);
    assert.ok(parseIsoDate('2028-02-29'));
    assert.equal(parseIsoDate('2026-13-01'), null);
    assert.equal(parseIsoDate('2026-1-01'), null);
    assert.equal(parseIsoDate('kw47'), null);
    assert.equal(isIsoDate('2026-11-22'), true);
    assert.equal(formatIsoDate(new Date('2026-11-22T00:00:00Z')), '2026-11-22');
});

test('addDays and diffDays work across months, years, leap days and DST changes', () => {
    assert.equal(addDays('2026-11-30', 1), '2026-12-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-01-01', -1), '2025-12-31');
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
    assert.equal(addDays('2026-03-28', 2), '2026-03-30'); // DST starts 2026-03-29
    // diffDays(from, to) = to − from
    assert.equal(diffDays('2026-03-28', '2026-03-30'), 2);
    assert.equal(diffDays('2026-10-24', '2026-10-26'), 2); // DST ends 2026-10-25
    assert.equal(diffDays('2026-11-30', '2026-11-23'), -7);
});

test('weekday helpers follow ISO (Monday = 1)', () => {
    assert.equal(isoWeekday('2026-11-23'), 1);
    assert.equal(isoWeekday('2026-11-21'), 6);
    assert.equal(isoWeekday('2026-11-29'), 7);
    assert.equal(isWeekend('2026-11-27'), false);
    assert.equal(isWeekend('2026-11-28'), true);
    assert.doesNotThrow(() => assertWeekday(7));
    assert.throws(() => assertWeekday(0), RangeError);
    assert.throws(() => assertWeekday(1.5), RangeError);
});

test('German weekday names, long and short, by date and by ISO weekday', () => {
    assert.equal(weekdayLong('2026-11-26'), 'Donnerstag');
    assert.equal(weekdayShort('2026-11-23'), 'Mo');
    assert.equal(weekdayShort('2026-11-22'), 'So');
    assert.equal(weekdayNameLong(7), 'Sonntag');
    assert.deepEqual([1, 2, 6, 7].map(weekdayNameShort), ['Mo', 'Di', 'Sa', 'So']);
});

test('ISO week numbers belong to the year of the Thursday', () => {
    assert.equal(isoWeekNumber('2026-12-31'), 53);
    assert.equal(isoWeekNumber('2027-01-04'), 1);
    assert.equal(isoWeekNumber('2026-11-21'), 47);
    assert.deepEqual(isoWeek('2027-01-01'), { year: 2026, week: 53 });
    assert.deepEqual(isoWeek('2025-12-29'), { year: 2026, week: 1 });
});

test('invalid dates throw', () => {
    assert.throws(() => addDays('2026-02-30', 1), /Invalid date/);
    assert.throws(() => addDays('23.11.2026', 1), /Invalid date/);
    assert.throws(() => isoWeekday('2026-02-30'), RangeError);
});
