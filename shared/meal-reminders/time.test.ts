import assert from 'node:assert/strict';
import { test } from 'node:test';

import { toLocalParts, zonedTimeToUtc } from './time';

const BERLIN = 'Europe/Berlin';

test('winter and summer offsets', () => {
    assert.equal(
        zonedTimeToUtc('2026-01-15', '18:30', BERLIN).toISOString(),
        '2026-01-15T17:30:00.000Z',
    );
    assert.equal(
        zonedTimeToUtc('2026-07-15', '18:30', BERLIN).toISOString(),
        '2026-07-15T16:30:00.000Z',
    );
});

test('spring forward: 2026-03-29, 02:30 does not exist and lands after the gap, never earlier', () => {
    const gap = zonedTimeToUtc('2026-03-29', '02:30', BERLIN);
    assert.equal(gap.toISOString(), '2026-03-29T01:30:00.000Z');
    assert.equal(toLocalParts(gap, BERLIN).time, '03:30');
    // Before and after the change
    assert.equal(
        zonedTimeToUtc('2026-03-29', '01:30', BERLIN).toISOString(),
        '2026-03-29T00:30:00.000Z',
    );
    assert.equal(
        zonedTimeToUtc('2026-03-29', '07:30', BERLIN).toISOString(),
        '2026-03-29T05:30:00.000Z',
    );
});

test('fall back: 2026-10-25, 02:30 happens twice and the first occurrence wins', () => {
    assert.equal(
        zonedTimeToUtc('2026-10-25', '02:30', BERLIN).toISOString(),
        '2026-10-25T00:30:00.000Z',
    );
    assert.equal(
        zonedTimeToUtc('2026-10-25', '03:30', BERLIN).toISOString(),
        '2026-10-25T02:30:00.000Z',
    );
    assert.equal(
        zonedTimeToUtc('2026-10-25', '07:30', BERLIN).toISOString(),
        '2026-10-25T06:30:00.000Z',
    );
});

test('toLocalParts round-trips and handles midnight', () => {
    const instant = zonedTimeToUtc('2026-07-01', '00:05', BERLIN);
    assert.deepEqual(toLocalParts(instant, BERLIN), {
        date: '2026-07-01',
        minutes: 5,
        time: '00:05',
    });
});

test('other zones work the same way', () => {
    assert.equal(
        zonedTimeToUtc('2026-11-21', '12:00', 'America/New_York').toISOString(),
        '2026-11-21T17:00:00.000Z',
    );
});
