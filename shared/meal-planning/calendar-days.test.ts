import assert from 'node:assert/strict';
import test from 'node:test';

import {
    addMonths,
    calendarMonth,
    monthGridRange,
    monthTitle,
    suggestSlot,
    type CalendarEntry,
} from './calendar-days';

const entry = (date: string, slot: string, recipeId = 'other'): CalendarEntry => ({
    date,
    slot,
    recipeId,
});

const flat = (weeks: ReturnType<typeof calendarMonth>) => weeks.flat();
const find = (weeks: ReturnType<typeof calendarMonth>, date: string) =>
    flat(weeks).find((day) => day.date === date)!;

// 2026-11-23 is a Monday; November 2026 starts on a Sunday
const base = { month: '2026-11', weekStartDay: 1, today: '2026-11-23', recipeId: 'r1' };

test('counts the entries per day over all recipes', () => {
    const weeks = calendarMonth({
        ...base,
        entries: [entry('2026-11-25', 'LUNCH'), entry('2026-11-25', 'DINNER', 'r1')],
    });
    assert.equal(find(weeks, '2026-11-25').count, 2);
    assert.equal(find(weeks, '2026-11-26').count, 0);
});

test('marks only days that hold this recipe', () => {
    const weeks = calendarMonth({
        ...base,
        entries: [entry('2026-11-25', 'LUNCH'), entry('2026-11-27', 'DINNER', 'r1')],
    });
    assert.equal(find(weeks, '2026-11-25').hasRecipe, false);
    assert.equal(find(weeks, '2026-11-27').hasRecipe, true);
});

test('marks today and locks past days, but not today', () => {
    const weeks = calendarMonth({ ...base, entries: [] });
    assert.equal(find(weeks, '2026-11-23').isToday, true);
    assert.equal(find(weeks, '2026-11-23').disabled, false);
    assert.equal(find(weeks, '2026-11-22').disabled, true);
    assert.equal(find(weeks, '2026-11-24').disabled, false);
    assert.equal(flat(weeks).filter((day) => day.isToday).length, 1);
});

test('a month fully in the past is locked entirely', () => {
    const weeks = calendarMonth({ ...base, month: '2026-10', entries: [] });
    assert.ok(flat(weeks).every((day) => day.disabled));
});

test('a future month is open and shows no today', () => {
    const weeks = calendarMonth({ ...base, month: '2027-02', entries: [] });
    assert.ok(flat(weeks).every((day) => !day.disabled && !day.isToday));
});

test('the grid starts on the user week start and has full weeks', () => {
    const monday = calendarMonth({ ...base, entries: [] });
    assert.equal(monday[0][0].date, '2026-10-26');
    assert.equal(monday.at(-1)!.at(-1)!.date, '2026-12-06');
    assert.ok(monday.every((week) => week.length === 7));

    const sunday = calendarMonth({ ...base, weekStartDay: 7, entries: [] });
    assert.equal(sunday[0][0].date, '2026-11-01');
    assert.equal(sunday.at(-1)!.at(-1)!.date, '2026-12-05');
});

test('days of the neighbouring months are flagged and still counted', () => {
    const weeks = calendarMonth({ ...base, entries: [entry('2026-12-01', 'DINNER', 'r1')] });
    const december = find(weeks, '2026-12-01');
    assert.equal(december.inMonth, false);
    assert.equal(december.count, 1);
    assert.equal(december.hasRecipe, true);
    assert.equal(find(weeks, '2026-11-30').inMonth, true);
    assert.equal(flat(weeks).filter((day) => day.inMonth).length, 30);
});

test('month boundaries: leap February, year change', () => {
    assert.equal(
        flat(calendarMonth({ ...base, month: '2028-02', entries: [] })).filter((d) => d.inMonth)
            .length,
        29,
    );
    assert.deepEqual(monthGridRange('2026-12', 1), { from: '2026-11-30', to: '2027-01-03' });
    assert.equal(addMonths('2026-12', 1), '2027-01');
    assert.equal(addMonths('2027-01', -1), '2026-12');
    assert.equal(addMonths('2026-11', 14), '2028-01');
    assert.equal(addMonths('2026-01', -13), '2024-12');
    assert.equal(monthTitle('2026-03'), 'März 2026');
    assert.throws(() => addMonths('2026-13x', 1));
});

test('a month that starts on the week start has no leading days', () => {
    // 2026-06-01 is a Monday
    const weeks = calendarMonth({ ...base, month: '2026-06', entries: [] });
    assert.equal(weeks[0][0].date, '2026-06-01');
    assert.equal(weeks.length, 5);
});

test('suggests the wanted meal when free, else the first free enabled one', () => {
    const slots = [
        { key: 'BREAKFAST', enabled: true },
        { key: 'LUNCH', enabled: true },
        { key: 'SNACK', enabled: false },
        { key: 'DINNER', enabled: true },
    ];
    assert.equal(suggestSlot(slots, [], 'DINNER'), 'DINNER');
    assert.equal(suggestSlot(slots, ['DINNER'], 'DINNER'), 'BREAKFAST');
    assert.equal(suggestSlot(slots, ['BREAKFAST', 'DINNER'], 'DINNER'), 'LUNCH');
    assert.equal(suggestSlot(slots, ['BREAKFAST', 'LUNCH', 'DINNER'], 'DINNER'), 'DINNER');
    assert.equal(suggestSlot(slots, ['BREAKFAST', 'LUNCH', 'DINNER'], null), 'BREAKFAST');
});

test('never suggests a meal the user switched off', () => {
    const slots = [
        { key: 'BREAKFAST', enabled: true },
        { key: 'LUNCH', enabled: true },
        { key: 'DINNER', enabled: false },
    ];
    assert.equal(suggestSlot(slots, [], 'DINNER'), 'BREAKFAST');
    assert.equal(suggestSlot(slots, ['BREAKFAST', 'LUNCH'], 'DINNER'), 'BREAKFAST');
});
