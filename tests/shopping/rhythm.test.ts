import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getRhythmSuggestions, snoozeRhythmSuggestion } from '../../src/lib/shopping/rhythm';
import { createFakeDb } from '../meal-plan/fake-db';

const USER = 'user-1';
const OTHER = 'user-2';
const at = (day: string) => new Date(`${day}T10:00:00+01:00`);
const NOW = at('2026-01-28'); // 6 days after the last weekly purchase

let n = 0;
const purchase = (itemKey: string, name: string, day: string, extra: object = {}) => ({
    id: `h${++n}`,
    userId: USER,
    event: 'PURCHASED',
    origin: 'KOCHTAKT',
    itemKey,
    ingredientId: itemKey.startsWith('i:') ? itemKey.slice(2) : null,
    name,
    occurredAt: at(day),
    ...extra,
});
const weekly = (extra: object = {}) =>
    ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22'].map((day) =>
        purchase('i:banane', 'Bananen', day, extra),
    );

describe('getRhythmSuggestions', () => {
    it('returns the DTO for a weekly item (4 purchases ~7 days apart, day 6)', async () => {
        const db = createFakeDb({ shoppingHistory: weekly() });
        assert.deepEqual(await getRhythmSuggestions(db, USER, NOW), [
            {
                itemKey: 'i:banane',
                ingredientId: 'banane',
                name: 'Bananen',
                reason: 'jede Woche',
                intervalDays: 7,
                lastPurchasedAt: at('2026-01-22'),
            },
        ]);
    });

    it('counts Bring! purchases and ignores ADDED events', async () => {
        const bring = weekly({ origin: 'BRING' });
        const added = [
            purchase('i:hafer', 'Hafer', '2026-01-01', { event: 'ADDED' }),
            purchase('i:hafer', 'Hafer', '2026-01-08', { event: 'ADDED' }),
            purchase('i:hafer', 'Hafer', '2026-01-15', { event: 'ADDED' }),
        ];
        const db = createFakeDb({ shoppingHistory: [...bring, ...added] });
        assert.deepEqual(
            (await getRhythmSuggestions(db, USER, NOW)).map((s) => s.itemKey),
            ['i:banane'],
        );
    });

    it("never uses another user's history", async () => {
        const db = createFakeDb({ shoppingHistory: weekly({ userId: OTHER }) });
        assert.deepEqual(await getRhythmSuggestions(db, USER, NOW), []);
    });

    it('skips open list items, pantry stock and uses the shopping day from the profile', async () => {
        const list = { id: 'list-1', userId: USER };
        const open = { id: 'si-1', shoppingListId: 'list-1', itemKey: 'i:banane', status: 'OPEN' };
        const withOpen = createFakeDb({
            shoppingHistory: weekly(),
            shoppingList: [list],
            shoppingItem: [open],
        });
        assert.deepEqual(await getRhythmSuggestions(withOpen, USER, NOW), []);

        const purchased = createFakeDb({
            shoppingHistory: weekly(),
            shoppingList: [list],
            shoppingItem: [{ ...open, status: 'PURCHASED' }],
        });
        assert.equal((await getRhythmSuggestions(purchased, USER, NOW)).length, 1);

        const stocked = createFakeDb({
            shoppingHistory: weekly(),
            pantryItem: [
                {
                    id: 'p1',
                    userId: USER,
                    ingredientId: 'banane',
                    name: 'Bananen',
                    quantity: 200,
                    expiresAt: null,
                    status: 'AVAILABLE',
                },
            ],
        });
        assert.deepEqual(await getRhythmSuggestions(stocked, USER, NOW), []);

        const usedUp = createFakeDb({
            shoppingHistory: weekly(),
            pantryItem: [
                {
                    id: 'p1',
                    userId: USER,
                    ingredientId: 'banane',
                    name: 'Bananen',
                    quantity: 200,
                    expiresAt: null,
                    status: 'USED_UP',
                },
            ],
        });
        assert.equal((await getRhythmSuggestions(usedUp, USER, NOW)).length, 1);

        // 3 days after the purchase: not due by interval; shopping day Friday (due Thu 29th, trip Fri 30th) makes the
        // weekly item due before that trip
        const early = createFakeDb({
            shoppingHistory: weekly(),
            profile: [{ id: 'pr', userId: USER, shoppingDay: 5 }],
        });
        assert.equal((await getRhythmSuggestions(early, USER, at('2026-01-25'))).length, 1);
        const noDay = createFakeDb({ shoppingHistory: weekly() });
        assert.equal((await getRhythmSuggestions(noDay, USER, at('2026-01-25'))).length, 0);
    });

    it('a pantry post blocks only while it is younger than one interval', async () => {
        const post = (extra: object) => ({
            id: 'p1',
            userId: USER,
            ingredientId: 'banane',
            name: 'Bananen',
            quantity: 200,
            expiresAt: null,
            status: 'AVAILABLE',
            purchasedAt: null,
            createdAt: at('2026-01-22'),
            ...extra,
        });
        // 7-day rhythm, now = 2026-01-28
        const young = createFakeDb({
            shoppingHistory: weekly(),
            pantryItem: [post({ purchasedAt: at('2026-01-22') })], // 6 days old
        });
        assert.deepEqual(await getRhythmSuggestions(young, USER, NOW), []);
        const old = createFakeDb({
            shoppingHistory: weekly(),
            pantryItem: [post({ purchasedAt: at('2026-01-20') })], // 8 days old
        });
        assert.equal((await getRhythmSuggestions(old, USER, NOW)).length, 1);
        const noPurchase = createFakeDb({
            shoppingHistory: weekly(),
            pantryItem: [post({ createdAt: at('2026-01-10') })], // falls back to createdAt
        });
        assert.equal((await getRhythmSuggestions(noPurchase, USER, NOW)).length, 1);
    });

    it('respects an active snooze', async () => {
        const snooze = {
            userId: USER,
            itemKey: 'i:banane',
            snoozedUntil: at('2026-01-30'),
            dismissCount: 1,
        };
        const db = createFakeDb({ shoppingHistory: weekly(), shoppingSuggestionSnooze: [snooze] });
        assert.deepEqual(await getRhythmSuggestions(db, USER, NOW), []);
        assert.equal((await getRhythmSuggestions(db, USER, at('2026-01-31'))).length, 1);
    });
});

describe('snoozeRhythmSuggestion', () => {
    it('snoozes for half the interval and the item comes back later', async () => {
        const db = createFakeDb({ shoppingHistory: weekly() });
        const result = await snoozeRhythmSuggestion(db, USER, 'i:banane', NOW);
        assert.equal(result.dismissCount, 1);
        assert.equal(result.snoozedUntil.getTime(), NOW.getTime() + 3.5 * 86_400_000);
        assert.deepEqual(await getRhythmSuggestions(db, USER, NOW), []);
        assert.equal((await getRhythmSuggestions(db, USER, at('2026-02-02'))).length, 1);
    });

    it('dampens with repeated dismissals (2x interval from the 3rd)', async () => {
        const db = createFakeDb({ shoppingHistory: weekly() });
        const results = [];
        for (let i = 0; i < 3; i++)
            results.push(await snoozeRhythmSuggestion(db, USER, 'i:banane', NOW));
        assert.deepEqual(
            results.map((r) => r.dismissCount),
            [1, 2, 3],
        );
        assert.equal(results[2].snoozedUntil.getTime(), NOW.getTime() + 14 * 86_400_000);
        assert.equal(db.tables.shoppingSuggestionSnooze.length, 1);
    });

    it('starts counting again after a new purchase', async () => {
        const stale = {
            userId: USER,
            itemKey: 'i:banane',
            snoozedUntil: at('2026-01-01'),
            dismissCount: 5,
            updatedAt: new Date('2025-12-01T00:00:00Z'),
        };
        const db = createFakeDb({ shoppingHistory: weekly(), shoppingSuggestionSnooze: [stale] });
        assert.equal((await snoozeRhythmSuggestion(db, USER, 'i:banane', NOW)).dismissCount, 1);
    });

    it('reports unknown items, items without rhythm and foreign items as not found', async () => {
        const db = createFakeDb({
            shoppingHistory: [...weekly({ userId: OTHER }), purchase('i:a', 'A', '2026-01-01')],
        });
        for (const key of ['i:banane', 'i:a', 'i:missing']) {
            await assert.rejects(snoozeRhythmSuggestion(db, USER, key, NOW), { code: 'NOT_FOUND' });
        }
        await assert.rejects(snoozeRhythmSuggestion(db, USER, 'banane', NOW));
        assert.equal(db.tables.shoppingSuggestionSnooze?.length ?? 0, 0);
    });
});
