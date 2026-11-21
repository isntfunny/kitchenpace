import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    addDays,
    diffDays,
    isoWeekday,
    isWeekend,
    seasonOf,
    toBerlinDate,
    weekdayNameDe,
} from './dates';

test('addDays and diffDays work across months, years, leap days and DST changes', () => {
    assert.equal(addDays('2026-11-30', 1), '2026-12-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
    assert.equal(addDays('2026-03-28', 2), '2026-03-30'); // DST starts 2026-03-29
    assert.equal(diffDays('2026-03-30', '2026-03-28'), 2);
    assert.equal(diffDays('2026-10-26', '2026-10-24'), 2); // DST ends 2026-10-25
    assert.equal(diffDays('2026-11-23', '2026-11-30'), -7);
});

test('weekday helpers follow ISO (Monday = 1) and German names', () => {
    assert.equal(isoWeekday('2026-11-23'), 1);
    assert.equal(isoWeekday('2026-11-29'), 7);
    assert.equal(isWeekend('2026-11-27'), false);
    assert.equal(isWeekend('2026-11-28'), true);
    assert.equal(weekdayNameDe('2026-11-26'), 'Donnerstag');
});

test('toBerlinDate converts instants to the Berlin calendar day', () => {
    assert.equal(toBerlinDate(new Date('2026-11-21T23:30:00Z')), '2026-11-22'); // CET, UTC+1
    assert.equal(toBerlinDate(new Date('2026-06-30T22:30:00Z')), '2026-07-01'); // CEST, UTC+2
    assert.equal(toBerlinDate(new Date('2026-11-21T10:00:00Z')), '2026-11-21');
});

test('seasonOf uses the month of the date', () => {
    assert.equal(seasonOf('2026-04-01'), 'fruehling');
    assert.equal(seasonOf('2026-11-23'), 'herbst');
    assert.equal(seasonOf('2026-12-24'), 'winter');
});

test('invalid dates throw', () => {
    assert.throws(() => addDays('2026-02-30', 1), /Invalid date/);
    assert.throws(() => addDays('23.11.2026', 1), /Invalid date/);
});
