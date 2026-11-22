import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cookReminderFor, groupCookCells, joinDishes, planCookReminders } from './cook';
import { cookFingerprint } from './fingerprint';
import { parseQuietHours } from './quiet';
import { zonedTimeToUtc } from './time';
import type { CookCell, ReminderEntry } from './types';

const BERLIN = 'Europe/Berlin';
const SLOTS = { BREAKFAST: '07:30', LUNCH: '12:30', DINNER: '19:00' };
const at = (date: string, time: string) => zonedTimeToUtc(date, time, BERLIN);

function entry(partial: Partial<ReminderEntry> & { id: string }): ReminderEntry {
    return {
        recipeId: `r-${partial.id}`,
        title: `Gericht ${partial.id}`,
        date: '2026-11-21',
        slotKey: 'DINNER',
        time: null,
        status: 'PLANNED',
        cookedAt: null,
        leftoverOfId: null,
        durationMin: 30,
        ...partial,
    };
}

test('start = meal time - longest dish - 10 minutes, message names all dishes', () => {
    const entries = [
        entry({ id: 'a', title: 'Gulasch', durationMin: 90 }),
        entry({ id: 'b', title: 'Salat', durationMin: 15 }),
    ];
    const [reminder] = planCookReminders(entries, SLOTS, {
        timeZone: BERLIN,
        quiet: null,
        now: at('2026-11-21', '10:00'),
    });
    assert.equal(reminder.sendAt.toISOString(), at('2026-11-21', '17:20').toISOString());
    assert.equal(reminder.title, 'Zeit anzufangen');
    assert.match(reminder.body, /Gulasch und Salat/);
    assert.match(reminder.body, /19:00/);
    assert.equal(reminder.slotKey, 'DINNER');
});

test('one reminder per slot, however many dishes; separate slots separate reminders', () => {
    const entries = [entry({ id: 'a' }), entry({ id: 'b' }), entry({ id: 'c', slotKey: 'LUNCH' })];
    const cells = groupCookCells(entries, SLOTS);
    assert.equal(cells.length, 2);
    assert.equal(cells.find((cell) => cell.slotKey === 'DINNER')!.dishes.length, 2);
});

test('cooked, cancelled, started, leftover and timeless entries get nothing', () => {
    const entries = [
        entry({ id: 'a', cookedAt: new Date() }),
        entry({ id: 'b', status: 'CANCELLED' }),
        entry({ id: 'c', status: 'COMPLETED' }),
        entry({ id: 'd', status: 'IN_PROGRESS' }),
        entry({ id: 'e', leftoverOfId: 'x' }),
        entry({ id: 'f', slotKey: 'c_brunch' }),
    ];
    assert.deepEqual(groupCookCells(entries, SLOTS), []);
});

test('own time wins over the slot default, a custom slot uses its configured time, earliest time counts', () => {
    const cells = groupCookCells(
        [
            entry({ id: 'a', time: '18:15' }),
            entry({ id: 'b' }),
            entry({ id: 'c', slotKey: 'c_brunch' }),
        ],
        { ...SLOTS, c_brunch: '10:30' },
    );
    assert.equal(cells.find((cell) => cell.slotKey === 'DINNER')!.time, '18:15');
    assert.equal(cells.find((cell) => cell.slotKey === 'c_brunch')!.time, '10:30');
});

test('window: past beyond the grace and far future are not planned, within grace is', () => {
    const cell: CookCell = {
        date: '2026-11-21',
        slotKey: 'DINNER',
        time: '19:00',
        dishes: [{ entryId: 'a', recipeId: 'r', title: 'X', durationMin: 50 }],
    };
    const options = { timeZone: BERLIN, quiet: null };
    // send time is 18:00
    assert.ok(cookReminderFor(cell, { ...options, now: at('2026-11-21', '18:10') }));
    assert.equal(cookReminderFor(cell, { ...options, now: at('2026-11-21', '18:20') }), null);
    assert.ok(cookReminderFor(cell, { ...options, now: at('2026-11-20', '12:00') }));
    assert.equal(cookReminderFor(cell, { ...options, now: at('2026-11-19', '12:00') }), null);
});

test('quiet hours: an early start moves to the end of the quiet window, or is dropped when too late', () => {
    const quiet = parseQuietHours('22:00', '07:00');
    const breakfast: CookCell = {
        date: '2026-11-21',
        slotKey: 'BREAKFAST',
        time: '07:30',
        dishes: [{ entryId: 'a', recipeId: 'r', title: 'Brot', durationMin: 10 }],
    };
    // start 07:10 is outside of the window (it ends at 07:00)
    const early = cookReminderFor(breakfast, {
        timeZone: BERLIN,
        quiet,
        now: at('2026-11-21', '06:00'),
    });
    assert.equal(early?.sendAt.toISOString(), at('2026-11-21', '07:10').toISOString());

    const long: CookCell = {
        ...breakfast,
        time: '07:30',
        dishes: [{ ...breakfast.dishes[0], durationMin: 60 }],
    };
    // start 06:20 is quiet; the window ends at 07:00 which is before the meal -> shifted
    const shifted = cookReminderFor(long, {
        timeZone: BERLIN,
        quiet,
        now: at('2026-11-21', '06:00'),
    });
    assert.equal(shifted?.sendAt.toISOString(), at('2026-11-21', '07:00').toISOString());

    const tight: CookCell = {
        ...breakfast,
        time: '06:30',
        dishes: [{ ...breakfast.dishes[0], durationMin: 30 }],
    };
    // start 05:50, quiet until 07:00, meal at 06:30 -> no reminder
    assert.equal(
        cookReminderFor(tight, { timeZone: BERLIN, quiet, now: at('2026-11-21', '05:00') }),
        null,
    );
});

test('daylight saving: dinner on the day clocks go back and forward keeps the real lead time', () => {
    const base: CookCell = {
        date: '2026-10-25',
        slotKey: 'BREAKFAST',
        time: '03:30',
        dishes: [{ entryId: 'a', recipeId: 'r', title: 'Brot', durationMin: 110 }],
    };
    // 03:30 CET = 02:30Z; lead 120 min of real time -> 00:30Z (= 01:30 CEST, before the change at 01:00Z)
    const fallBack = cookReminderFor(base, {
        timeZone: BERLIN,
        quiet: null,
        now: at('2026-10-24', '20:00'),
    });
    assert.equal(fallBack?.sendAt.toISOString(), '2026-10-25T00:30:00.000Z');

    const spring: CookCell = { ...base, date: '2026-03-29', time: '06:00' };
    // 06:00 CEST = 04:00Z; 120 min earlier = 02:00Z = 04:00 CEST (not 04:00 CET)
    const forward = cookReminderFor(spring, {
        timeZone: BERLIN,
        quiet: null,
        now: at('2026-03-28', '20:00'),
    });
    assert.equal(forward?.sendAt.toISOString(), '2026-03-29T02:00:00.000Z');
});

test('fingerprint changes with time, dishes, recipe or duration; not with dish order', () => {
    const cell: CookCell = {
        date: '2026-11-21',
        slotKey: 'DINNER',
        time: '19:00',
        dishes: [
            { entryId: 'a', recipeId: 'r1', title: 'A', durationMin: 30 },
            { entryId: 'b', recipeId: 'r2', title: 'B', durationMin: 20 },
        ],
    };
    const base = cookFingerprint(cell, 40, BERLIN);
    assert.equal(base.length, 64);
    assert.equal(
        cookFingerprint({ ...cell, dishes: [...cell.dishes].reverse() }, 40, BERLIN),
        base,
    );
    assert.equal(cookFingerprint({ ...cell, title: 'ignored' } as CookCell, 40, BERLIN), base);
    assert.notEqual(cookFingerprint({ ...cell, time: '19:30' }, 40, BERLIN), base);
    assert.notEqual(cookFingerprint({ ...cell, dishes: [cell.dishes[0]] }, 40, BERLIN), base);
    assert.notEqual(
        cookFingerprint(
            { ...cell, dishes: [{ ...cell.dishes[0], recipeId: 'r9' }, cell.dishes[1]] },
            40,
            BERLIN,
        ),
        base,
    );
    assert.notEqual(cookFingerprint(cell, 50, BERLIN), base);
    assert.notEqual(cookFingerprint({ ...cell, date: '2026-11-22' }, 40, BERLIN), base);
});

test('joinDishes', () => {
    assert.equal(joinDishes(['A']), 'A');
    assert.equal(joinDishes(['A', 'B']), 'A und B');
    assert.equal(joinDishes(['A', 'B', 'C']), 'A, B und C');
});
