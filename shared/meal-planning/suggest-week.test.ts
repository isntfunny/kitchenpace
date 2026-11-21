import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays } from './dates';
import { suggestWeek, swapSuggestion, type SuggestWeekInput } from './suggest-week';
import type { Candidate, PlannedSlot } from './types';

const MONDAY = '2026-11-23'; // autumn, Monday

const week = (types: PlannedSlot['slot'][] = ['DINNER']) =>
    Array.from({ length: 7 }, (_, i) => addDays(MONDAY, i)).flatMap((date) =>
        types.map((slot): PlannedSlot => ({ date, slot })),
    );

function recipe(id: string, patch: Partial<Candidate> = {}): Candidate {
    return {
        id,
        categoryId: `cat-${id}`,
        totalTime: 30,
        tasteScore: 0.5,
        ingredients: [{ ingredientId: `ing-${id}` }],
        ...patch,
    };
}

const pool = (n: number, patch: (i: number) => Partial<Candidate> = () => ({})) =>
    Array.from({ length: n }, (_, i) => recipe(`r${i}`, patch(i)));

const base = (patch: Partial<SuggestWeekInput> = {}): SuggestWeekInput => ({
    slots: week(),
    candidates: pool(12),
    ...patch,
});

test('fills every empty slot, never repeats a recipe, and leaves existing entries alone', () => {
    const slots = week();
    slots[1] = { ...slots[1], recipeId: 'r0', fixedTime: '19:00' };
    slots[4] = { ...slots[4], recipeId: 'r1' };
    const input = base({ slots });
    const snapshot = JSON.stringify(input);

    const { suggestions, unfilled } = suggestWeek(input);

    assert.equal(JSON.stringify(input), snapshot, 'input must not be mutated');
    assert.equal(suggestions.length, 5);
    assert.deepEqual(unfilled, []);
    const filledKeys = new Set([`${slots[1].date}|DINNER`, `${slots[4].date}|DINNER`]);
    assert.ok(suggestions.every((s) => !filledKeys.has(`${s.date}|${s.slot}`)));
    const ids = suggestions.map((s) => s.recipeId);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(
        !ids.includes('r0') && !ids.includes('r1'),
        'planned recipes are not suggested again',
    );
});

test('every suggestion has one or two short German reasons', () => {
    const { suggestions } = suggestWeek(
        base({ candidates: pool(12, (i) => ({ tasteScore: i / 12 })) }),
    );
    for (const suggestion of suggestions) {
        assert.ok(suggestion.reasons.length >= 1 && suggestion.reasons.length <= 2);
        assert.ok(suggestion.reasons.every((r) => r.length > 5 && r.length < 120));
    }
});

test('same seed gives the same result, independent of candidate order; seeds can differ', () => {
    const candidates = pool(14);
    const a = suggestWeek(base({ candidates, seed: 3 }));
    const b = suggestWeek(base({ candidates: [...candidates].reverse(), seed: 3 }));
    assert.deepEqual(a, b);

    const variants = new Set(
        Array.from({ length: 15 }, (_, seed) =>
            JSON.stringify(
                suggestWeek(base({ candidates, seed, config: { jitter: 3 } })).suggestions.map(
                    (s) => s.recipeId,
                ),
            ),
        ),
    );
    assert.ok(variants.size > 1);
});

test('weekdays prefer short dishes, weekends allow longer ones', () => {
    const candidates = [
        recipe('quick', { totalTime: 20, tasteScore: 0.5 }),
        recipe('slow', { totalTime: 120, tasteScore: 0.5 }),
    ];
    const slots: PlannedSlot[] = [
        { date: '2026-11-24', slot: 'DINNER' }, // Tuesday
        { date: '2026-11-28', slot: 'DINNER' }, // Saturday
    ];
    const { suggestions } = suggestWeek({ slots, candidates });
    assert.equal(suggestions.find((s) => s.date === '2026-11-24')?.recipeId, 'quick');
    assert.equal(suggestions.find((s) => s.date === '2026-11-28')?.recipeId, 'slow');
});

test('the weekday time limit is a parameter', () => {
    const candidates = [recipe('a', { totalTime: 60 }), recipe('b', { totalTime: 25 })];
    const slots: PlannedSlot[] = [{ date: '2026-11-24', slot: 'DINNER' }];
    const strict = suggestWeek({ slots, candidates, config: { weekdayMaxMinutes: 30 } });
    assert.equal(strict.suggestions[0].recipeId, 'b');
    const relaxed = suggestWeek({
        slots,
        candidates: [
            recipe('a', { totalTime: 60, tasteScore: 0.9 }),
            recipe('b', { totalTime: 25, tasteScore: 0.1 }),
        ],
        config: { weekdayMaxMinutes: 90, weekdayHardMaxMinutes: 120 },
    });
    assert.equal(relaxed.suggestions[0].recipeId, 'a');
});

test('a weekday never gets a far-too-long dish while alternatives exist, but may if nothing else is left', () => {
    const slots: PlannedSlot[] = [{ date: '2026-11-24', slot: 'DINNER' }];
    const alternatives = suggestWeek({
        slots,
        candidates: [
            recipe('feast', { totalTime: 240, tasteScore: 1 }),
            recipe('ok', { totalTime: 30, tasteScore: 0 }),
        ],
    });
    assert.equal(alternatives.suggestions[0].recipeId, 'ok');
    const only = suggestWeek({ slots, candidates: [recipe('feast', { totalTime: 240 })] });
    assert.equal(only.suggestions[0].recipeId, 'feast');
});

test('categories are spread, also against already planned dishes', () => {
    const candidates = [
        ...['p1', 'p2', 'p3', 'p4'].map((id) => recipe(id, { categoryId: 'pasta' })),
        ...['s1', 's2', 's3', 's4'].map((id) => recipe(id, { categoryId: 'suppe' })),
        ...['f1', 'f2', 'f3', 'f4'].map((id) => recipe(id, { categoryId: 'fisch' })),
    ];
    const slots = week();
    slots[0] = { ...slots[0], recipeId: 'p0' };
    const plannedRecipes = [recipe('p0', { categoryId: 'pasta' })];
    const { suggestions } = suggestWeek({ slots, candidates, plannedRecipes });

    const categoryOf = new Map([...candidates, ...plannedRecipes].map((c) => [c.id, c.categoryId]));
    const byDate = new Map<string, string>([[slots[0].date, 'pasta']]);
    suggestions.forEach((s) => byDate.set(s.date, categoryOf.get(s.recipeId)!));
    const ordered = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, c]) => c);
    for (let i = 1; i < ordered.length; i++) assert.notEqual(ordered[i], ordered[i - 1]);
    assert.equal(
        suggestions[0].recipeId.startsWith('p'),
        false,
        'day after planned pasta is not pasta',
    );
});

test('soon-expiring ingredients are used before they expire, with a reason', () => {
    const candidates = [
        recipe('plain', { tasteScore: 0.6 }),
        recipe('sahne', {
            tasteScore: 0.5,
            ingredients: [{ ingredientId: 'cream', name: 'Sahne' }],
        }),
    ];
    const expiring = [{ ingredientId: 'cream', name: 'Sahne', expiresOn: '2026-11-26' }]; // Thursday
    const slots: PlannedSlot[] = [{ date: '2026-11-25', slot: 'DINNER' }];

    const early = suggestWeek({ slots, candidates, expiring });
    assert.equal(early.suggestions[0].recipeId, 'sahne');
    assert.match(early.suggestions[0].reasons[0], /Sahne.*Donnerstag/);

    // After the expiry day the bonus is gone
    const late = suggestWeek({
        slots: [{ date: '2026-11-27', slot: 'DINNER' }],
        candidates,
        expiring,
    });
    assert.equal(late.suggestions[0].recipeId, 'plain');
});

test('shared ingredients are a bonus (staples can be ignored)', () => {
    const planned = recipe('planned', {
        ingredients: [
            { ingredientId: 'feta' },
            { ingredientId: 'spinat' },
            { ingredientId: 'salz' },
        ],
    });
    const candidates = [
        recipe('sharing', { ingredients: [{ ingredientId: 'feta' }, { ingredientId: 'spinat' }] }),
        recipe('alone', { tasteScore: 0.55 }),
        recipe('staple', { ingredients: [{ ingredientId: 'salz' }], tasteScore: 0.55 }),
    ];
    const slots: PlannedSlot[] = [
        { date: '2026-11-23', slot: 'DINNER', recipeId: 'planned' },
        { date: '2026-11-26', slot: 'DINNER' },
    ];
    const result = suggestWeek({ slots, candidates, plannedRecipes: [planned] });
    assert.equal(result.suggestions[0].recipeId, 'sharing');
    assert.match(result.suggestions[0].reasons.join(' '), /Teilt 2 Zutaten/);

    const ignoring = suggestWeek({
        slots,
        candidates: [
            recipe('staple', { ingredients: [{ ingredientId: 'salz' }], tasteScore: 0.5 }),
            recipe('alone', { tasteScore: 0.51 }),
        ],
        plannedRecipes: [planned],
        config: { ignoredIngredientIds: ['salz'] },
    });
    assert.equal(ignoring.suggestions[0].recipeId, 'alone');
});

test('taste and season matter', () => {
    const slots: PlannedSlot[] = [{ date: '2026-11-24', slot: 'DINNER' }];
    const liked = suggestWeek({
        slots,
        candidates: [recipe('meh', { tasteScore: 0.2 }), recipe('fav', { tasteScore: 0.95 })],
    });
    assert.equal(liked.suggestions[0].recipeId, 'fav');
    assert.match(liked.suggestions[0].reasons.join(' '), /Geschmack/);

    const seasonal = suggestWeek({
        slots,
        candidates: [
            recipe('summer', { seasons: ['sommer'] }),
            recipe('autumn', { seasons: ['herbst'] }),
        ],
    });
    assert.equal(seasonal.suggestions[0].recipeId, 'autumn');
    assert.match(seasonal.suggestions[0].reasons.join(' '), /Herbst/);
});

test('meal type suitability, missing scores and exhausted candidates', () => {
    const slots: PlannedSlot[] = [
        { date: '2026-11-24', slot: 'BREAKFAST' },
        { date: '2026-11-24', slot: 'DINNER' },
        { date: '2026-11-25', slot: 'DINNER' },
    ];
    const candidates = [
        recipe('porridge', { slots: ['BREAKFAST'], tasteScore: undefined }),
        recipe('stew', { slots: ['DINNER'] }),
    ];
    const { suggestions, unfilled } = suggestWeek({ slots, candidates });
    assert.equal(suggestions.find((s) => s.slot === 'BREAKFAST')?.recipeId, 'porridge');
    assert.equal(suggestions.find((s) => s.slot === 'DINNER')?.recipeId, 'stew');
    assert.deepEqual(unfilled, [{ date: '2026-11-25', slot: 'DINNER' }]);
    assert.ok(suggestions.every((s) => Number.isFinite(s.score)));
});

test('duplicate empty slots in the input produce a single suggestion', () => {
    const { suggestions } = suggestWeek({
        slots: [
            { date: '2026-11-24', slot: 'DINNER' },
            { date: '2026-11-24', slot: 'DINNER' },
        ],
        candidates: pool(3),
    });
    assert.equal(suggestions.length, 1);
});

test('swapSuggestion returns a different recipe that fits the rest of the plan', () => {
    const input = base();
    const { suggestions } = suggestWeek(input);
    const target = suggestions[2];
    const others = new Set(suggestions.filter((s) => s !== target).map((s) => s.recipeId));

    const swapped = swapSuggestion(input, suggestions, target);
    assert.ok(swapped);
    assert.notEqual(swapped!.recipeId, target.recipeId);
    assert.ok(!others.has(swapped!.recipeId));
    assert.equal(swapped!.date, target.date);
    assert.ok(swapped!.reasons.length >= 1);

    // Deterministic, and rejected recipes are skipped
    assert.deepEqual(swapSuggestion(input, suggestions, target), swapped);
    const again = swapSuggestion(input, suggestions, target, {
        rejectedRecipeIds: [swapped!.recipeId],
    });
    assert.ok(again && again.recipeId !== swapped!.recipeId && again.recipeId !== target.recipeId);
});

test('swapSuggestion never touches filled slots and returns null when nothing is left', () => {
    const slots: PlannedSlot[] = [
        { date: '2026-11-23', slot: 'DINNER', recipeId: 'r0' },
        { date: '2026-11-24', slot: 'DINNER' },
    ];
    const input: SuggestWeekInput = { slots, candidates: pool(2) };
    const { suggestions } = suggestWeek(input);
    assert.equal(suggestions.length, 1);
    assert.equal(swapSuggestion(input, suggestions, { date: '2026-11-23', slot: 'DINNER' }), null);
    // r0 is planned, r1 is the only candidate and currently suggested: no alternative
    assert.equal(swapSuggestion(input, suggestions, suggestions[0]), null);
});
