import assert from 'node:assert/strict';
import test from 'node:test';

import type { RecipeCardData } from '../../src/app/actions/recipes';
import {
    appliedMessage,
    canIncrement,
    cellsFor,
    freeCells,
    leftoverLabel,
    slotSummary,
    canPick,
    capacityOf,
    selectionReducer,
    tabsOf,
    usedOf,
    type SelectionAction,
    type SelectionState,
} from '../../src/components/meal-plan/selection/selection-state';

const card = (id: string) => ({ id, title: id }) as unknown as RecipeCardData;

const MAIN_SLOTS = ['2026-11-23|DINNER', '2026-11-24|DINNER'];
const state = (over: Partial<SelectionState> = {}): SelectionState => ({
    household: 2,
    chosenSlots: MAIN_SLOTS,
    slotKinds: {
        '2026-11-23|DINNER': 'main',
        '2026-11-24|DINNER': 'main',
        '2026-11-25|DINNER': 'main',
        '2026-11-23|BREAKFAST': 'breakfast',
    },
    picks: [],
    ...over,
});
const run = (s: SelectionState, ...actions: SelectionAction[]) =>
    actions.reduce(selectionReducer, s);

test('pick starts with household servings', () => {
    const s = run(state({ household: 3 }), { type: 'togglePick', recipe: card('a'), kind: 'main' });
    assert.equal(s.picks.length, 1);
    assert.equal(s.picks[0]!.servings, 3);
    assert.equal(s.picks[0]!.kind, 'main');
    assert.equal(usedOf(s, 'main'), 1);
});

test('toggle twice unpicks', () => {
    const toggle: SelectionAction = { type: 'togglePick', recipe: card('a'), kind: 'main' };
    assert.deepEqual(run(state(), toggle, toggle).picks, []);
});

test('full tab blocks picks', () => {
    const s = run(
        state(),
        { type: 'togglePick', recipe: card('a'), kind: 'main' },
        { type: 'togglePick', recipe: card('b'), kind: 'main' },
    );
    assert.equal(canPick(s, 'main'), false);
    const blocked = run(s, { type: 'togglePick', recipe: card('c'), kind: 'main' });
    assert.deepEqual(
        blocked.picks.map((p) => p.recipe.id),
        ['a', 'b'],
    );
    // a full tab can still be unpicked
    assert.equal(run(s, { type: 'togglePick', recipe: card('a'), kind: 'main' }).picks.length, 1);
    // another kind without slots has no capacity at all
    assert.equal(canPick(s, 'breakfast'), false);
});

test('plus is blocked when the next portion needs a slot', () => {
    let s = run(state(), { type: 'togglePick', recipe: card('a'), kind: 'main' });
    const plus: SelectionAction = { type: 'servings', recipeId: 'a', delta: 1 };
    s = run(s, plus); // 3: no leftover day
    assert.equal(s.picks[0]!.servings, 3);
    assert.equal(usedOf(s, 'main'), 1);
    s = run(s, plus); // 4: one leftover day, still fits
    assert.equal(s.picks[0]!.servings, 4);
    assert.equal(usedOf(s, 'main'), 2);
    s = run(s, plus); // 5: still one leftover day
    assert.equal(s.picks[0]!.servings, 5);
    assert.equal(canIncrement(s, 'a'), false); // 6 would need a third slot
    s = run(s, plus);
    assert.equal(s.picks[0]!.servings, 5);
});

test('plus counts the other picks of the kind', () => {
    const s = run(
        state(),
        { type: 'togglePick', recipe: card('a'), kind: 'main' },
        { type: 'togglePick', recipe: card('b'), kind: 'main' },
    );
    // both slots taken: 4 portions would need a leftover slot
    assert.equal(canIncrement(s, 'a'), true); // 3 still fits
    const three = run(s, { type: 'servings', recipeId: 'a', delta: 1 });
    assert.equal(canIncrement(three, 'a'), false);
    assert.equal(canIncrement(s, 'unknown'), false);
});

test('minus never below 1', () => {
    let s = run(state({ household: 2 }), { type: 'togglePick', recipe: card('a'), kind: 'main' });
    const minus: SelectionAction = { type: 'servings', recipeId: 'a', delta: -1 };
    s = run(s, minus);
    assert.equal(s.picks[0]!.servings, 1);
    s = run(s, minus);
    assert.equal(s.picks[0]!.servings, 1);
});

test('deselecting a slot drops overflowing picks from the end', () => {
    const s = run(
        state(),
        { type: 'togglePick', recipe: card('a'), kind: 'main' },
        { type: 'togglePick', recipe: card('b'), kind: 'main' },
        { type: 'toggleSlot', key: '2026-11-24|DINNER' },
    );
    assert.equal(capacityOf(s, 'main'), 1);
    assert.deepEqual(
        s.picks.map((p) => p.recipe.id),
        ['a'],
    );
});

test('deselecting a slot also drops picks whose leftovers no longer fit', () => {
    let s = run(state(), { type: 'togglePick', recipe: card('a'), kind: 'main' });
    s = run(
        s,
        { type: 'servings', recipeId: 'a', delta: 1 },
        { type: 'servings', recipeId: 'a', delta: 1 },
    );
    assert.equal(usedOf(s, 'main'), 2);
    s = run(s, { type: 'toggleSlot', key: '2026-11-24|DINNER' });
    assert.deepEqual(s.picks, []);
});

test('toggling a slot on adds capacity, other kinds are untouched', () => {
    const s = run(
        state(),
        { type: 'togglePick', recipe: card('a'), kind: 'main' },
        { type: 'toggleSlot', key: '2026-11-25|DINNER' },
        { type: 'toggleSlot', key: '2026-11-23|BREAKFAST' },
    );
    assert.equal(capacityOf(s, 'main'), 3);
    assert.equal(capacityOf(s, 'breakfast'), 1);
    assert.equal(s.picks.length, 1);
});

test('setSlots replaces the chosen slots and drops overflow', () => {
    const s = run(
        state(),
        { type: 'togglePick', recipe: card('a'), kind: 'main' },
        { type: 'togglePick', recipe: card('b'), kind: 'main' },
        { type: 'setSlots', keys: ['2026-11-25|DINNER'] },
    );
    assert.deepEqual(s.chosenSlots, ['2026-11-25|DINNER']);
    assert.deepEqual(
        s.picks.map((p) => p.recipe.id),
        ['a'],
    );
});

test('tabs only for kinds with slots', () => {
    assert.deepEqual(tabsOf(state()), [
        { kind: 'main', label: 'Hauptgerichte', used: 0, capacity: 2, full: false },
    ]);
    const s = run(
        state({ chosenSlots: [...MAIN_SLOTS, '2026-11-23|BREAKFAST'] }),
        { type: 'togglePick', recipe: card('a'), kind: 'main' },
        { type: 'togglePick', recipe: card('b'), kind: 'main' },
        { type: 'togglePick', recipe: card('c'), kind: 'breakfast' },
    );
    assert.deepEqual(
        tabsOf(s).map((t) => [t.kind, t.label, t.used, t.capacity, t.full]),
        [
            ['main', 'Hauptgerichte', 2, 2, true],
            ['breakfast', 'Frühstück', 1, 1, true],
        ],
    );
});

test('side dish proposal and acceptance', () => {
    let s = run(state(), { type: 'togglePick', recipe: card('a'), kind: 'main' });
    s = run(s, { type: 'side', recipeId: 'a', side: { card: card('kartoffeln') } });
    assert.equal(s.picks[0]!.side?.card.id, 'kartoffeln');
    assert.equal(s.picks[0]!.side?.accepted, false);
    s = run(s, { type: 'acceptSide', recipeId: 'a', accepted: true });
    assert.equal(s.picks[0]!.side?.accepted, true);
    // the same proposal again keeps the acceptance
    s = run(s, { type: 'side', recipeId: 'a', side: { card: card('kartoffeln') } });
    assert.equal(s.picks[0]!.side?.accepted, true);
    s = run(s, { type: 'side', recipeId: 'a', side: null });
    assert.equal(s.picks[0]!.side, undefined);
    // acceptance without a proposal does nothing
    assert.equal(
        run(s, { type: 'acceptSide', recipeId: 'a', accepted: true }).picks[0]!.side,
        undefined,
    );
});

test('the reducer does not mutate', () => {
    const s = state();
    const frozen = JSON.stringify(s);
    run(
        s,
        { type: 'togglePick', recipe: card('a'), kind: 'main' },
        { type: 'toggleSlot', key: MAIN_SLOTS[0]! },
    );
    assert.equal(JSON.stringify(s), frozen);
});

test('freeCells: every day × slot without an entry, with the kind of its slot', () => {
    const free = freeCells(
        ['2026-11-23', '2026-11-24'],
        [
            { key: 'BREAKFAST', kind: 'breakfast' },
            { key: 'DINNER', kind: 'main' },
        ],
        ['2026-11-24|DINNER'],
    );
    assert.deepEqual(free, {
        '2026-11-23|BREAKFAST': 'breakfast',
        '2026-11-23|DINNER': 'main',
        '2026-11-24|BREAKFAST': 'breakfast',
    });
});

test('cellsFor: free cells of the chosen meals and days, occupied ones left out', () => {
    const free = {
        '2026-11-23|BREAKFAST': 'breakfast' as const,
        '2026-11-23|DINNER': 'main' as const,
        '2026-11-24|BREAKFAST': 'breakfast' as const,
    };
    assert.deepEqual(cellsFor(['DINNER'], ['2026-11-23', '2026-11-24'], free), [
        '2026-11-23|DINNER',
    ]);
    assert.deepEqual(cellsFor(['BREAKFAST', 'DINNER'], ['2026-11-24'], free), [
        '2026-11-24|BREAKFAST',
    ]);
    assert.deepEqual(cellsFor([], ['2026-11-23'], free), []);
});

test('slotSummary: count, then every meal in slot order with its days unless all its free days are chosen', () => {
    const free = {
        '2026-11-28|BREAKFAST': 'breakfast' as const,
        '2026-11-29|BREAKFAST': 'breakfast' as const,
        '2026-11-23|DINNER': 'main' as const,
        '2026-11-24|DINNER': 'main' as const,
        '2026-11-25|DINNER': 'main' as const,
    };
    const labels = { BREAKFAST: 'Frühstück', DINNER: 'Abendessen' };
    assert.equal(
        slotSummary(
            ['2026-11-23|DINNER', '2026-11-24|DINNER', '2026-11-25|DINNER', '2026-11-29|BREAKFAST'],
            free,
            labels,
        ),
        '4 Plätze · Frühstück So, Abendessen',
    );
    assert.equal(slotSummary(['2026-11-23|DINNER'], free, labels), '1 Platz · Abendessen Mo');
    assert.equal(slotSummary([], free, labels), 'Keine Plätze gewählt');
});

test('appliedMessage: planned dishes, plus taken slots when some were skipped', () => {
    assert.equal(appliedMessage({ planned: 5, skipped: 0 }), '5 Gerichte eingeplant');
    assert.equal(
        appliedMessage({ planned: 1, skipped: 1 }),
        '1 Gericht eingeplant · 1 Platz war inzwischen belegt',
    );
    assert.equal(
        appliedMessage({ planned: 3, skipped: 2 }),
        '3 Gerichte eingeplant · 2 Plätze waren inzwischen belegt',
    );
});

test('leftoverLabel: shown from one leftover day on', () => {
    assert.equal(leftoverLabel(2, 2), null);
    assert.equal(leftoverLabel(4, 2), '+1 Reste-Tag');
    assert.equal(leftoverLabel(6, 2), '+2 Reste-Tage');
});
