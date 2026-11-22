import assert from 'node:assert/strict';
import { test } from 'node:test';

import { zonedTimeToUtc } from '../dates';

import { nextWeekStart, weeklyReminder, weeklyReminderNeeded, weeklyReminderSlot } from './weekly';

const BERLIN = 'Europe/Berlin';
const at = (date: string, time: string) => zonedTimeToUtc(date, time, BERLIN);

test('next week start is strictly after today', () => {
    // 2026-11-21 is a Saturday, 2026-11-23 a Monday
    assert.equal(nextWeekStart(at('2026-11-21', '10:00'), 1, BERLIN), '2026-11-23');
    assert.equal(nextWeekStart(at('2026-11-23', '10:00'), 1, BERLIN), '2026-11-30');
    assert.equal(nextWeekStart(at('2026-11-21', '10:00'), 6, BERLIN), '2026-11-28');
    assert.equal(nextWeekStart(at('2026-11-21', '10:00'), 7, BERLIN), '2026-11-22');
});

test('due the day before the week start at 17:00 local, within horizon only', () => {
    const options = { timeZone: BERLIN, weekStartDay: 1, quiet: null };
    const slot = weeklyReminderSlot({ ...options, now: at('2026-11-22', '09:00') });
    assert.equal(slot?.weekStart, '2026-11-23');
    assert.equal(slot?.sendAt.toISOString(), at('2026-11-22', '17:00').toISOString());
    assert.equal(weeklyReminderSlot({ ...options, now: at('2026-11-18', '09:00') }), null);
    // Slightly late still counts, much later does not
    assert.ok(weeklyReminderSlot({ ...options, now: at('2026-11-22', '17:10') }));
    assert.equal(weeklyReminderSlot({ ...options, now: at('2026-11-22', '19:00') }), null);
});

test('summer time: 17:00 local is 15:00Z', () => {
    const slot = weeklyReminderSlot({
        timeZone: BERLIN,
        weekStartDay: 1,
        quiet: null,
        now: at('2026-06-20', '12:00'),
    });
    assert.equal(slot?.sendAt.toISOString(), '2026-06-21T15:00:00.000Z');
});

test('only for active planners with an empty coming week', () => {
    assert.equal(weeklyReminderNeeded({ recentEntries: 5, nextWeekEntries: 0 }), true);
    assert.equal(weeklyReminderNeeded({ recentEntries: 0, nextWeekEntries: 0 }), false);
    assert.equal(weeklyReminderNeeded({ recentEntries: 5, nextWeekEntries: 1 }), false);
});

test('quiet hours around 17:00 shift the reminder, and the content names the week', () => {
    const slot = weeklyReminderSlot({
        timeZone: BERLIN,
        weekStartDay: 1,
        quiet: { start: '16:00', end: '18:00' },
        now: at('2026-11-22', '09:00'),
    });
    assert.equal(slot?.sendAt.toISOString(), at('2026-11-22', '18:00').toISOString());
    const reminder = weeklyReminder(slot!, BERLIN);
    assert.equal(reminder.kind, 'WEEKLY_PLAN');
    assert.equal(reminder.slotKey, '');
    assert.match(reminder.body, /23\.11\./);
});
