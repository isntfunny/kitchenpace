import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyQuietHours, isQuietMinute, parseQuietHours } from './quiet';
import { zonedTimeToUtc } from './time';

const BERLIN = 'Europe/Berlin';
const night = parseQuietHours('22:00', '07:00');
const at = (date: string, time: string) => zonedTimeToUtc(date, time, BERLIN);

test('parse: needs both, valid and different', () => {
    assert.deepEqual(night, { start: '22:00', end: '07:00' });
    assert.equal(parseQuietHours(null, '07:00'), null);
    assert.equal(parseQuietHours('08:00', '08:00'), null);
    assert.equal(parseQuietHours('25:00', '07:00'), null);
});

test('wrapping window: 22:00 inclusive, 07:00 exclusive', () => {
    assert.equal(isQuietMinute(22 * 60, night), true);
    assert.equal(isQuietMinute(23 * 60 + 59, night), true);
    assert.equal(isQuietMinute(3 * 60, night), true);
    assert.equal(isQuietMinute(7 * 60, night), false);
    assert.equal(isQuietMinute(12 * 60, night), false);
});

test('a send time in the morning quiet part moves to the window end, same day', () => {
    const result = applyQuietHours(
        at('2026-11-21', '05:30'),
        at('2026-11-21', '09:00'),
        night,
        BERLIN,
    );
    assert.equal(result?.toISOString(), at('2026-11-21', '07:00').toISOString());
});

test('a send time in the evening part moves to tomorrow morning, which is usually too late', () => {
    const late = applyQuietHours(
        at('2026-11-21', '23:00'),
        at('2026-11-22', '06:30'),
        night,
        BERLIN,
    );
    assert.equal(late, null);
    const ok = applyQuietHours(at('2026-11-21', '23:00'), at('2026-11-22', '09:00'), night, BERLIN);
    assert.equal(ok?.toISOString(), at('2026-11-22', '07:00').toISOString());
});

test('outside the window nothing changes; no window means no change', () => {
    const noon = at('2026-11-21', '12:00');
    assert.equal(applyQuietHours(noon, at('2026-11-21', '13:00'), night, BERLIN), noon);
    assert.equal(
        applyQuietHours(
            at('2026-11-21', '03:00'),
            at('2026-11-21', '04:00'),
            null,
            BERLIN,
        )?.toISOString(),
        at('2026-11-21', '03:00').toISOString(),
    );
});

test('same-day window (13:00–15:00) and DST day', () => {
    const nap = parseQuietHours('13:00', '15:00');
    const result = applyQuietHours(
        at('2026-03-29', '13:30'),
        at('2026-03-29', '18:00'),
        nap,
        BERLIN,
    );
    assert.equal(result?.toISOString(), at('2026-03-29', '15:00').toISOString());
    // On the DST day the window 01:00-04:00 ends at the right instant (03:00 and 04:00 exist, 02:xx not)
    const dst = parseQuietHours('01:00', '04:00');
    const shifted = applyQuietHours(
        at('2026-03-29', '01:30'),
        at('2026-03-29', '09:00'),
        dst,
        BERLIN,
    );
    assert.equal(shifted?.toISOString(), at('2026-03-29', '04:00').toISOString());
});
