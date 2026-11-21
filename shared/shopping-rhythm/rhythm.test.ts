import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkDue, nextShoppingDate } from './due';
import { estimateRhythm } from './estimate';
import { rhythmLabel, rhythmReason } from './reason';
import { effectiveDismissCount, isSnoozed, nextSnooze } from './snooze';
import { suggestRhythmItems, type RhythmHistoryRow, type RhythmInput } from './suggest';

const at = (iso: string) => new Date(`${iso}T10:00:00+01:00`);
const events = (...days: string[]) => days.map((day) => ({ occurredAt: at(day) }));

describe('estimateRhythm', () => {
    it('needs at least 3 purchase days', () => {
        const result = estimateRhythm(events('2026-01-01', '2026-01-08'));
        assert.deepEqual(result, { kind: 'insufficient', purchaseCount: 2 });
    });

    it('uses the median gap', () => {
        const result = estimateRhythm(
            events('2026-01-01', '2026-01-08', '2026-01-15', '2026-01-23'),
        );
        assert.equal(result.kind, 'regular');
        if (result.kind === 'regular') {
            assert.equal(result.intervalDays, 7);
            assert.equal(result.lastPurchaseDate, '2026-01-23');
        }
    });

    it('treats a large spread as irregular', () => {
        // gaps 7, 14: spread 0.33 > 0.25
        const result = estimateRhythm(events('2026-01-01', '2026-01-08', '2026-01-22'));
        assert.equal(result.kind, 'irregular');
        // gaps 7, 9: spread 0.125
        assert.equal(
            estimateRhythm(events('2026-01-01', '2026-01-08', '2026-01-17')).kind,
            'regular',
        );
    });

    it('counts several check-offs on one day once', () => {
        const result = estimateRhythm([
            ...events('2026-01-01', '2026-01-08'),
            { occurredAt: new Date('2026-01-08T18:00:00+01:00') },
        ]);
        assert.deepEqual(result, { kind: 'insufficient', purchaseCount: 2 });
    });

    it('uses only the latest purchases so a changed habit wins', () => {
        const old = ['2025-01-01', '2025-03-01', '2025-05-01'];
        const recent = [
            '2026-01-01',
            '2026-01-08',
            '2026-01-15',
            '2026-01-22',
            '2026-01-29',
            '2026-02-05',
            '2026-02-12',
            '2026-02-19',
        ];
        const result = estimateRhythm(events(...old, ...recent));
        assert.equal(result.kind, 'regular');
        if (result.kind === 'regular') assert.equal(result.intervalDays, 7);
    });

    it('ignores daily rhythms (< 2 days)', () => {
        assert.equal(
            estimateRhythm(events('2026-01-01', '2026-01-02', '2026-01-03')).kind,
            'irregular',
        );
    });

    it('is DST-safe (calendar days in Berlin)', () => {
        // clocks change 2026-03-29
        const result = estimateRhythm(events('2026-03-22', '2026-03-29', '2026-04-05'));
        assert.equal(result.kind === 'regular' && result.intervalDays, 7);
    });
});

describe('checkDue', () => {
    const base = { lastPurchaseDate: '2026-01-23', intervalDays: 7 }; // Friday

    it('is due after 80 % of the interval (6 of 7 days)', () => {
        assert.equal(checkDue({ ...base, today: '2026-01-28' }).due, false); // day 5
        assert.equal(checkDue({ ...base, today: '2026-01-29' }).due, true); // day 6
    });

    it('is due when it falls due before the next shopping day', () => {
        // 14-day item bought Wed 2026-01-07, due Wed 21st; shopping day Saturday (6)
        const input = { lastPurchaseDate: '2026-01-07', intervalDays: 14 };
        // Fri 16th: next trip Sat 17th, due 21st -> not yet
        assert.equal(checkDue({ ...input, today: '2026-01-16', shoppingDay: 6 }).due, false);
        // Sat 17th is the trip today: following trip is Sat 24th, due 21st -> buy now
        assert.equal(checkDue({ ...input, today: '2026-01-17', shoppingDay: 6 }).due, true);
        assert.equal(checkDue({ ...input, today: '2026-01-17' }).due, false);
    });

    it('does not suggest a weekly item right after the weekly trip', () => {
        // bought Sat 2026-01-03, interval 7, shopping day Saturday
        const input = { lastPurchaseDate: '2026-01-03', intervalDays: 7, shoppingDay: 6 };
        assert.equal(checkDue({ ...input, today: '2026-01-05' }).due, false);
        assert.equal(checkDue({ ...input, today: '2026-01-08' }).due, false);
        assert.equal(checkDue({ ...input, today: '2026-01-09' }).due, true);
    });

    it('stops after three missed intervals', () => {
        assert.equal(checkDue({ ...base, today: '2026-02-13' }).due, true); // 21 d
        assert.equal(checkDue({ ...base, today: '2026-02-14' }).due, false); // 22 d
    });

    it('nextShoppingDate is strictly after today', () => {
        assert.equal(nextShoppingDate('2026-01-17', 6), '2026-01-24');
        assert.equal(nextShoppingDate('2026-01-16', 6), '2026-01-17');
        assert.equal(nextShoppingDate('2026-01-18', 6), '2026-01-24'); // Sunday
    });
});

describe('reason', () => {
    it('labels whole weeks', () => {
        assert.equal(rhythmLabel(7), 'jede Woche');
        assert.equal(rhythmLabel(8), 'jede Woche');
        assert.equal(rhythmLabel(14), 'alle 2 Wochen');
        assert.equal(rhythmLabel(12), 'alle ~12 Tage');
        assert.equal(rhythmLabel(10.5), 'alle ~11 Tage');
    });

    it('adds the days since the last purchase for other rhythms', () => {
        assert.equal(rhythmReason(7, 6), 'jede Woche');
        assert.equal(rhythmReason(12, 11), 'alle ~12 Tage · zuletzt vor 11 T.');
    });
});

describe('snooze', () => {
    const now = new Date('2026-02-01T12:00:00Z');
    const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

    it('snoozes for half the interval, 2x from the 3rd dismissal', () => {
        assert.deepEqual(nextSnooze({ now, intervalDays: 14, previousDismissCount: 0 }), {
            snoozedUntil: days(7),
            dismissCount: 1,
        });
        assert.equal(
            nextSnooze({ now, intervalDays: 14, previousDismissCount: 1 }).dismissCount,
            2,
        );
        assert.deepEqual(nextSnooze({ now, intervalDays: 14, previousDismissCount: 2 }), {
            snoozedUntil: days(28),
            dismissCount: 3,
        });
    });

    it('forgets dismissals from before the last purchase', () => {
        const snooze = { dismissCount: 4, updatedAt: new Date('2026-01-10T00:00:00Z') };
        assert.equal(effectiveDismissCount(snooze, new Date('2026-01-20T00:00:00Z')), 0);
        assert.equal(effectiveDismissCount(snooze, new Date('2026-01-05T00:00:00Z')), 4);
        assert.equal(effectiveDismissCount(undefined, now), 0);
    });

    it('isSnoozed is true until the end time', () => {
        assert.equal(isSnoozed({ snoozedUntil: days(1) }, now), true);
        assert.equal(isSnoozed({ snoozedUntil: now }, now), false);
        assert.equal(isSnoozed(undefined, now), false);
    });
});

describe('suggestRhythmItems', () => {
    const row = (
        itemKey: string,
        name: string,
        day: string,
        ingredientId: string | null = null,
    ): RhythmHistoryRow => ({
        itemKey,
        name,
        ingredientId,
        occurredAt: at(day),
    });
    // bought 4 times, 7 days apart: last on 2026-01-22
    const weekly = (key = 'i:banane', name = 'Bananen') => {
        const ingredientId = key.startsWith('i:') ? key.slice(2) : null;
        return ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22'].map((day) =>
            row(key, name, day, ingredientId),
        );
    };
    const input = (overrides: Partial<RhythmInput> = {}): RhythmInput => ({
        history: weekly(),
        openItemKeys: new Set(),
        pantry: [],
        snoozes: new Map(),
        now: at('2026-01-28'), // 6 days after the last purchase
        ...overrides,
    });

    it('suggests a weekly item on day 6 with "jede Woche" (acceptance)', () => {
        const [suggestion, ...rest] = suggestRhythmItems(input());
        assert.equal(rest.length, 0);
        assert.equal(suggestion.itemKey, 'i:banane');
        assert.equal(suggestion.ingredientId, 'banane');
        assert.equal(suggestion.name, 'Bananen');
        assert.equal(suggestion.reason, 'jede Woche');
        assert.equal(suggestion.intervalDays, 7);
        assert.deepEqual(suggestion.lastPurchasedAt, at('2026-01-22'));
    });

    it('does not suggest it on day 4', () => {
        assert.deepEqual(suggestRhythmItems(input({ now: at('2026-01-26') })), []);
    });

    it('needs 3 purchases and a regular rhythm', () => {
        assert.deepEqual(suggestRhythmItems(input({ history: weekly().slice(2) })), []);
        const irregular = [
            row('t:x', 'X', '2026-01-01'),
            row('t:x', 'X', '2026-01-08'),
            row('t:x', 'X', '2026-01-22'),
            row('t:x', 'X', '2026-01-23'),
        ];
        assert.deepEqual(suggestRhythmItems(input({ history: irregular })), []);
    });

    it('never suggests open items', () => {
        assert.deepEqual(suggestRhythmItems(input({ openItemKeys: new Set(['i:banane']) })), []);
    });

    it('skips items with enough in the pantry', () => {
        const pantry = (quantity: number | null, expiresAt: Date | null = null) => [
            { ingredientId: 'banane', name: 'Bananen', quantity, expiresAt },
        ];
        assert.deepEqual(suggestRhythmItems(input({ pantry: pantry(300) })), []);
        assert.deepEqual(suggestRhythmItems(input({ pantry: pantry(null) })), []); // "vorhanden"
        assert.equal(suggestRhythmItems(input({ pantry: pantry(0) })).length, 1);
        assert.equal(
            suggestRhythmItems(input({ pantry: pantry(300, at('2026-01-27')) })).length,
            1,
        );
    });

    it('matches free-text items in the pantry by normalized name', () => {
        const history = weekly('t:toast', 'Toast');
        const pantry = [{ ingredientId: null, name: '  TOAST ', quantity: null, expiresAt: null }];
        assert.deepEqual(suggestRhythmItems(input({ history, pantry })), []);
        assert.equal(suggestRhythmItems(input({ history })).length, 1);
    });

    it('hides snoozed items and brings them back', () => {
        const snoozes = new Map([['i:banane', { snoozedUntil: at('2026-01-31') }]]);
        assert.deepEqual(suggestRhythmItems(input({ snoozes })), []);
        assert.equal(suggestRhythmItems(input({ snoozes, now: at('2026-02-01') })).length, 1);
    });

    it('uses the shopping day', () => {
        // 14-day item bought Wed 2026-01-07 (3 purchases), Saturday trip today (2026-01-17)
        const history = ['2025-12-24', '2025-12-31', '2026-01-07'].map((day) =>
            row('t:haferflocken', 'Haferflocken', day),
        );
        const history14 = ['2025-12-10', '2025-12-24', '2026-01-07'].map((day) =>
            row('t:haferflocken', 'Haferflocken', day),
        );
        assert.equal(
            suggestRhythmItems(input({ history: history14, now: at('2026-01-17'), shoppingDay: 6 }))
                .length,
            1,
        );
        assert.equal(
            suggestRhythmItems(input({ history: history14, now: at('2026-01-17') })).length,
            0,
        );
        assert.equal(suggestRhythmItems(input({ history, now: at('2026-01-07') })).length, 0);
    });

    it('sorts the most overdue item first', () => {
        const late = weekly('t:milch', 'Milch').map((r) => ({
            ...r,
            occurredAt: new Date(r.occurredAt.getTime() - 86_400_000),
        }));
        const result = suggestRhythmItems(input({ history: [...weekly(), ...late] }));
        assert.deepEqual(
            result.map((s) => s.name),
            ['Milch', 'Bananen'],
        );
    });
});
