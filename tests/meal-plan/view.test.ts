import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    builtInMarkers,
    dayCalories,
    formatKcal,
    resolveWeekStart,
    weekNumber,
    weekParam,
    weekRangeLabel,
} from '../../src/lib/meal-plan/view';

test('week parameter accepts ISO weeks and dates, rejects garbage', () => {
    const today = '2026-11-21';
    assert.equal(resolveWeekStart(undefined, 1, today), '2026-11-16');
    assert.equal(resolveWeekStart('2026-W48', 1, today), '2026-11-23');
    assert.equal(resolveWeekStart('2026-11-26', 1, today), '2026-11-23');
    assert.equal(resolveWeekStart('2026-W48', 7, today), '2026-11-22');
    assert.equal(resolveWeekStart('2026-W53', 1, today), '2026-12-28');
    assert.equal(resolveWeekStart('2027-W53', 1, today), null);
    assert.equal(resolveWeekStart('2026-W00', 1, today), null);
    assert.equal(resolveWeekStart('2026-02-30', 1, today), null);
    assert.equal(resolveWeekStart('morgen', 1, today), null);
});

test('week parameter and label round-trip for every week start', () => {
    for (const weekStartDay of [1, 2, 3, 4, 5, 6, 7]) {
        for (const date of ['2026-11-21', '2026-12-31', '2027-01-01', '2026-01-01', '2020-12-31']) {
            const start = resolveWeekStart(date, weekStartDay, date)!;
            assert.equal(
                resolveWeekStart(weekParam(start), weekStartDay, date),
                start,
                `${date}/${weekStartDay}`,
            );
        }
    }
    assert.equal(weekParam('2026-11-23'), '2026-W48');
    assert.equal(weekParam('2026-11-22'), '2026-W48');
    assert.equal(weekParam('2026-12-28'), '2026-W53');
    assert.equal(weekParam('2027-01-04'), '2027-W01');
    assert.equal(weekNumber('2026-11-23'), 48);
});

test('range labels cover month and year changes', () => {
    assert.equal(weekRangeLabel('2026-11-23'), '23.–29. November 2026');
    assert.equal(weekRangeLabel('2026-11-30'), '30. November – 6. Dezember 2026');
    assert.equal(weekRangeLabel('2026-12-28'), '28. Dez 2026 – 3. Jan 2027');
});

test('day calories are per person and flag gaps', () => {
    const dish = (kcal: number | null, completeness = 1) => ({
        servings: 4,
        recipe: { caloriesPerServing: kcal, nutritionCompleteness: completeness },
    });
    assert.deepEqual(dayCalories([dish(600), dish(240)]), { kcal: 840, incomplete: false });
    assert.deepEqual(dayCalories([dish(600), dish(null)]), { kcal: 600, incomplete: true });
    assert.deepEqual(dayCalories([dish(600, 0.7)]), { kcal: 600, incomplete: true });
    assert.deepEqual(dayCalories([dish(null)]), { kcal: null, incomplete: true });
    assert.deepEqual(dayCalories([]), { kcal: null, incomplete: false });
    assert.equal(formatKcal(1840), '1 840');
});

test('built-in markers for cooked, unavailable and leftover dishes', () => {
    assert.deepEqual(builtInMarkers({ status: 'PLANNED', recipeAvailable: true }), []);
    assert.deepEqual(
        builtInMarkers({
            status: 'COMPLETED',
            recipeAvailable: false,
            leftoverOfDate: '2026-11-23',
        }).map((m) => m.label),
        ['nicht mehr verfügbar', 'Gekocht', 'Rest von Mo'],
    );
});
