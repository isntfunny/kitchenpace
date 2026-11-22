import assert from 'node:assert/strict';
import { test } from 'node:test';

import { weekdayShort } from '../../shared/dates';
import {
    groupItems,
    itemQuantityLabel,
    originBadges,
    packHint,
    relativeDays,
    sourceQuantityLabel,
    stepQuantity,
    type ShoppingItemView,
    type SourceView,
} from '../../src/lib/shopping/list-view';
import {
    addMissingLabel,
    computePlanStatus,
    planStateLabel,
    planStateShortLabel,
    type PlanEntryInput,
    type PlanLineInput,
} from '../../src/lib/shopping/plan-status';

const item = (id: string, extra: Partial<ShoppingItemView> = {}): ShoppingItemView => ({
    id,
    itemKey: `i:${id}`,
    name: id,
    status: 'OPEN',
    icon: 'fork-knife',
    quantity: null,
    baseUnit: null,
    displayUnit: null,
    quantityText: null,
    note: null,
    position: 0,
    statusChangedAt: '2026-11-20T10:00:00.000Z',
    pack: null,
    sources: [],
    ...extra,
});

const source = (extra: Partial<SourceView>): SourceView => ({
    id: 's',
    kind: 'MEAL_PLAN',
    recipeId: 'r1',
    recipeTitle: 'Pasta Alfredo',
    date: '2026-11-24',
    quantity: null,
    baseUnit: null,
    originalAmount: null,
    originalUnit: null,
    servings: null,
    ...extra,
});

// ── Grouping ────────────────────────────────────────────────────────────

test('open items keep the user order, bought and dormant ones are newest first', () => {
    const grouped = groupItems([
        item('b', { position: 2 }),
        item('a', { position: 1 }),
        item('c', { position: 1, statusChangedAt: '2026-11-21T10:00:00.000Z' }),
        item('old', { status: 'PURCHASED', statusChangedAt: '2026-11-01T10:00:00.000Z' }),
        item('new', { status: 'DORMANT', statusChangedAt: '2026-11-19T10:00:00.000Z' }),
    ]);
    assert.deepEqual(
        grouped.open.map((i) => i.id),
        ['c', 'a', 'b'],
    );
    assert.deepEqual(
        grouped.bought.map((i) => i.id),
        ['new', 'old'],
    );
    assert.equal(grouped.boughtTotal, 2);
});

test('the bought section is limited, the total is kept', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
        item(`p${i}`, { status: 'PURCHASED', statusChangedAt: `2026-11-0${i + 1}T10:00:00.000Z` }),
    );
    const grouped = groupItems(items, 3);
    assert.deepEqual(
        grouped.bought.map((i) => i.id),
        ['p4', 'p3', 'p2'],
    );
    assert.equal(grouped.boughtTotal, 5);
});

// ── Origins ─────────────────────────────────────────────────────────────

test('weekday of a calendar date', () => {
    assert.equal(weekdayShort('2026-11-24'), 'Di');
    assert.equal(weekdayShort('2026-11-22'), 'So');
    assert.equal(weekdayShort('2026-11-23'), 'Mo');
});

test('origin badges: plan days sorted and unique, recipes after them, manual has none', () => {
    const badges = originBadges([
        source({ id: '1', date: '2026-11-27', recipeId: 'gratin', recipeTitle: 'Gratin' }),
        source({ id: '2', date: '2026-11-24', recipeId: 'alfredo', recipeTitle: 'Alfredo' }),
        source({ id: '3', date: '2026-11-24', recipeId: 'alfredo', recipeTitle: 'Alfredo' }),
        source({
            id: '4',
            kind: 'RECIPE',
            date: null,
            recipeId: 'bruschetta',
            recipeTitle: 'Bruschetta',
        }),
        source({ id: '5', kind: 'MANUAL', date: null, recipeId: null, recipeTitle: null }),
    ]);
    assert.deepEqual(
        badges.map((b) => [b.kind, b.label, b.title]),
        [
            ['plan', 'Di', 'Di: Alfredo'],
            ['plan', 'Fr', 'Fr: Gratin'],
            ['recipe', null, 'Bruschetta'],
        ],
    );
    assert.deepEqual(originBadges([]), []);
});

// ── Quantities ──────────────────────────────────────────────────────────

test('quantity labels', () => {
    assert.equal(
        itemQuantityLabel(item('x', { quantity: 400, baseUnit: 'ML', displayUnit: 'ml' })),
        '400 ml',
    );
    assert.equal(
        itemQuantityLabel(item('x', { quantity: 1500, baseUnit: 'G', displayUnit: 'kg' })),
        '1,5 kg',
    );
    assert.equal(
        itemQuantityLabel(
            item('x', { quantity: 450, baseUnit: 'G', displayUnit: 'g', quantityText: '1 Bund' }),
        ),
        '450 g + 1 Bund',
    );
    assert.equal(itemQuantityLabel(item('x')), '');
    assert.equal(sourceQuantityLabel(source({ quantity: 200, baseUnit: 'ML' })), '200 ml');
    assert.equal(
        sourceQuantityLabel(source({ originalAmount: '1', originalUnit: 'Bund' })),
        '1 Bund',
    );
});

test('the stepper grows and shrinks in sensible steps and never reaches zero', () => {
    const grams = (quantity: number, displayUnit = 'g') => ({
        quantity,
        baseUnit: 'G' as const,
        displayUnit,
    });
    assert.equal(stepQuantity(grams(50), 1)?.quantity, 60);
    assert.equal(stepQuantity(grams(200), 1)?.quantity, 250);
    assert.equal(stepQuantity(grams(500), 1)?.quantity, 600);
    assert.equal(stepQuantity(grams(500), -1)?.quantity, 450);
    assert.equal(stepQuantity(grams(10), -1), null);
    assert.equal(stepQuantity({ quantity: 1, baseUnit: 'PIECE', displayUnit: 'Stk' }, -1), null);
    assert.equal(
        stepQuantity({ quantity: 3, baseUnit: 'PIECE', displayUnit: 'Stk' }, 1)?.quantity,
        4,
    );
    // a fixed display unit is kept, one that needs a conversion table falls back to the base unit
    assert.equal(stepQuantity(grams(1000, 'kg'), 1)?.displayUnit, 'kg');
    assert.equal(stepQuantity(grams(30, 'EL'), 1)?.displayUnit, 'g');
});

test('without an amount the stepper starts at one piece', () => {
    assert.deepEqual(stepQuantity({ quantity: null, baseUnit: null, displayUnit: null }, 1), {
        quantity: 1,
        baseUnit: 'PIECE',
        displayUnit: 'Stk',
    });
    assert.equal(stepQuantity({ quantity: null, baseUnit: null, displayUnit: null }, -1), null);
});

test('pack hint only when the pack size fits the unit', () => {
    const base = { quantity: 400, baseUnit: 'ML' as const };
    assert.equal(packHint({ ...base, pack: { size: 200, unit: 'ML' } }), '200 ml Packung · 2×');
    assert.equal(packHint({ ...base, pack: { size: 250, unit: 'ML' } }), '250 ml Packung · 2×');
    assert.equal(packHint({ ...base, pack: { size: 200, unit: 'G' } }), null);
    assert.equal(packHint({ ...base, pack: { size: 1, unit: 'BUNCH' } }), null);
    assert.equal(packHint({ ...base, pack: null }), null);
    assert.equal(
        packHint({ quantity: null, baseUnit: null, pack: { size: 200, unit: 'ML' } }),
        null,
    );
});

test('relative days', () => {
    const now = new Date('2026-11-21T12:00:00Z');
    assert.equal(relativeDays('2026-11-21T08:00:00Z', now), 'heute');
    assert.equal(relativeDays('2026-11-20T08:00:00Z', now), 'gestern');
    assert.equal(relativeDays('2026-11-12T08:00:00Z', now), 'vor 9 Tagen');
    assert.equal(relativeDays('2026-11-07T08:00:00Z', now), 'vor 2 Wochen');
    assert.equal(relativeDays('2026-10-15T08:00:00Z', now), 'vor 1 Monat');
});

// ── Plan status ─────────────────────────────────────────────────────────

const entry = (
    id: string,
    date: string,
    recipeId: string,
    extra: Partial<PlanEntryInput> = {},
): PlanEntryInput => ({
    id,
    date,
    recipeId,
    title: recipeId,
    imageKey: null,
    servings: 2,
    status: 'PLANNED',
    recipeAvailable: true,
    ...extra,
});
const line = (ingredientId: string, isOptional = false): PlanLineInput => ({
    ingredientId,
    name: ingredientId,
    isOptional,
});

const lines = new Map([
    ['bolognese', [line('mince'), line('onion'), line('pasta'), line('parsley', true)]],
    ['chili', [line('beans'), line('onion')]],
    ['empty', []],
]);

test('a dish is covered when all its non-optional ingredients have a source from its entry', () => {
    const status = computePlanStatus(
        [entry('mon', '2026-11-23', 'bolognese'), entry('wed', '2026-11-25', 'chili')],
        lines,
        new Map([
            ['mon', new Set(['mince', 'onion', 'pasta'])],
            ['wed', new Set(['onion'])],
        ]),
        '2026-11-24',
    );
    assert.deepEqual(
        status.entries.map((e) => [e.weekday, e.state, e.missing]),
        [
            ['Mo', 'ok', []],
            ['Mi', 'missing', ['beans']],
        ],
    );
    assert.deepEqual(status.missingEntryIds, ['wed']);
    assert.equal(status.missingCount, 1);
});

test('optional ingredients are never missing; empty, unavailable, cooked and cancelled are handled', () => {
    const status = computePlanStatus(
        [
            entry('a', '2026-11-23', 'bolognese'),
            entry('b', '2026-11-24', 'empty'),
            entry('c', '2026-11-25', 'chili', { recipeAvailable: false }),
            entry('d', '2026-11-26', 'chili', { status: 'COMPLETED' }),
            entry('e', '2026-11-27', 'chili', { status: 'CANCELLED' }),
            entry('f', '2026-11-28', 'unknown-recipe'),
        ],
        lines,
        new Map([['a', new Set(['mince', 'onion', 'pasta'])]]),
        '2026-11-24',
    );
    assert.deepEqual(
        status.entries.map((e) => [e.entryId, e.state]),
        [
            ['a', 'ok'],
            ['b', 'empty'],
            ['c', 'unavailable'],
            ['f', 'empty'],
        ],
    );
    assert.equal(status.missingCount, 0);
    assert.equal(addMissingLabel(status), null);
});

test('today is marked and entries are sorted by date', () => {
    const status = computePlanStatus(
        [entry('b', '2026-11-26', 'chili'), entry('a', '2026-11-24', 'chili')],
        lines,
        new Map(),
        '2026-11-24',
    );
    assert.deepEqual(
        status.entries.map((e) => [e.entryId, e.isToday, e.day]),
        [
            ['a', true, 24],
            ['b', false, 26],
        ],
    );
});

test('labels for the state and the main button', () => {
    assert.equal(planStateLabel({ state: 'ok', missing: [] }), '✓ alles auf der Liste');
    assert.equal(
        planStateLabel({ state: 'missing', missing: ['Crème fraîche'] }),
        '+ Crème fraîche fehlt',
    );
    assert.equal(planStateLabel({ state: 'missing', missing: ['a', 'b'] }), '+ 2 Zutaten fehlen');
    assert.equal(planStateShortLabel({ state: 'missing', missing: ['a', 'b'] }), '+ 2 fehlen');
    assert.equal(planStateShortLabel({ state: 'ok', missing: [] }), '✓ auf der Liste');
    assert.equal(addMissingLabel({ missingCount: 3 }), 'Fehlende 3 Zutaten hinzufügen');
    assert.equal(addMissingLabel({ missingCount: 1 }), 'Fehlende Zutat hinzufügen');
});

test('ISO weekday numbers map to short names', async () => {
    const { isoWeekdayShort } = await import('../../src/lib/shopping/list-view');
    assert.deepEqual([1, 2, 6, 7].map(isoWeekdayShort), ['Mo', 'Di', 'Sa', 'So']);
    assert.equal(isoWeekdayShort(0), null);
    assert.equal(isoWeekdayShort(8), null);
});
