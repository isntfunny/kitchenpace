import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    customSlotKey,
    DEFAULT_SLOTS,
    defaultServings,
    resolveSlots,
    slotColumns,
    slotKeyOf,
    slotLabel,
    visibleSlots,
} from '../../src/lib/meal-plan/slots';

test('missing or invalid configuration falls back to the defaults', () => {
    assert.deepEqual(
        resolveSlots(null).map((s) => [s.key, s.time, s.enabled]),
        DEFAULT_SLOTS.map((s) => [s.key, s.time, s.enabled]),
    );
    assert.equal(resolveSlots([{ key: 'BREAKFAST', time: '25:00', enabled: true }]).length, 4);
    assert.equal(resolveSlots('nonsense').length, 4);
});

test('custom slots need a name, keep their key and sort by time', () => {
    const slots = resolveSlots([
        { key: 'DINNER', time: '18:30', enabled: true },
        { key: 'c_brunch', name: 'Brunch', time: '10:30', enabled: true },
    ]);
    assert.deepEqual(
        slots.map((s) => s.key),
        ['BREAKFAST', 'c_brunch', 'LUNCH', 'SNACK', 'DINNER'],
    );
    // Fixed slots missing from the stored list come back disabled
    assert.equal(slots.find((s) => s.key === 'BREAKFAST')!.enabled, false);
    assert.equal(slotLabel(slots[1]), 'Brunch');
    assert.equal(slotLabel(slots[2]), 'Mittagessen');
    assert.equal(resolveSlots([{ key: 'c_x', time: '10:00', enabled: true }]).length, 4);
});

test('a week override replaces the user default only for that week', () => {
    const user = [{ key: 'LUNCH', time: '13:00', enabled: true }];
    const week = [{ key: 'LUNCH', time: '12:00', enabled: false }];
    assert.equal(resolveSlots(user).find((s) => s.key === 'LUNCH')!.time, '13:00');
    const overridden = resolveSlots(user, week).find((s) => s.key === 'LUNCH')!;
    assert.deepEqual([overridden.time, overridden.enabled], ['12:00', false]);
});

test('disabled slots with entries stay visible', () => {
    const slots = resolveSlots(null);
    assert.ok(!visibleSlots(slots, []).some((s) => s.key === 'SNACK'));
    assert.ok(visibleSlots(slots, ['SNACK']).some((s) => s.key === 'SNACK'));
});

test('slot keys map to exactly one DB column and back', () => {
    assert.deepEqual(slotColumns('DINNER'), { mealType: 'DINNER', customMealType: null });
    assert.deepEqual(slotColumns('c_brunch'), { mealType: null, customMealType: 'c_brunch' });
    assert.equal(slotKeyOf({ mealType: null, customMealType: 'c_brunch' }), 'c_brunch');
    assert.equal(customSlotKey('Spät-Snack', []), 'c_spaet-snack');
    assert.equal(customSlotKey('Brunch', ['c_brunch']), 'c_brunch-2');
    assert.equal(defaultServings(null), 2);
    assert.equal(defaultServings(4), 4);
});
