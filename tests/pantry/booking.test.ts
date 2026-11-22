import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { needsFromRecipe, planUsage, type PantryPost } from '../../src/lib/pantry/booking';
import type { RecipeLine } from '../../src/lib/shopping/recipe-items';

const USED_AT = new Date('2026-03-10T12:00:00Z');
const day = (n: number) => new Date(USED_AT.getTime() + n * 86_400_000);

let n = 0;
const post = (overrides: Partial<PantryPost> = {}): PantryPost => ({
    id: `p${++n}`,
    quantity: 200,
    baseUnit: 'ML',
    approximate: false,
    openedAt: null,
    expiresAt: null,
    purchasedAt: new Date('2026-03-01T10:00:00Z'),
    createdAt: new Date('2026-03-01T10:00:00Z'),
    ...overrides,
});
const facts = { openedShelfLifeDays: 3, pieceGrams: null as number | null };

describe('planUsage', () => {
    it('deducts the amount, opens the post and sets the expiry after opening', () => {
        const [sahne] = [post()];
        const updates = planUsage(
            [sahne],
            { amounts: { ML: 100 }, unknown: false },
            facts,
            USED_AT,
        );
        assert.deepEqual(updates, [
            { id: sahne.id, quantity: 100, openedAt: USED_AT, expiresAt: day(3) },
        ]);
    });

    it('marks a fully used post as used up', () => {
        const [p] = [post({ quantity: 100 })];
        const [update] = planUsage([p], { amounts: { ML: 100 }, unknown: false }, facts, USED_AT);
        assert.equal(update.quantity, 0);
        assert.equal(update.status, 'USED_UP');
    });

    it('does nothing without posts or without a need', () => {
        assert.deepEqual(
            planUsage([], { amounts: { ML: 100 }, unknown: false }, facts, USED_AT),
            [],
        );
        assert.deepEqual(planUsage([post()], { amounts: {}, unknown: false }, facts, USED_AT), []);
    });

    it('sets no expiry without a shelf life after opening, and never errors', () => {
        const [update] = planUsage(
            [post()],
            { amounts: { ML: 50 }, unknown: false },
            { openedShelfLifeDays: null, pieceGrams: null },
            USED_AT,
        );
        assert.equal(update.openedAt, USED_AT);
        assert.equal(update.expiresAt, undefined);
    });

    it('keeps an earlier existing expiry and does not reopen an opened post', () => {
        const early = post({ expiresAt: day(1) });
        const [first] = planUsage([early], { amounts: { ML: 50 }, unknown: false }, facts, USED_AT);
        assert.equal(first.expiresAt, undefined);

        const opened = post({ openedAt: day(-2), expiresAt: day(1) });
        const [again] = planUsage(
            [opened],
            { amounts: { ML: 50 }, unknown: false },
            facts,
            USED_AT,
        );
        assert.deepEqual(again, { id: opened.id, quantity: 150 });
    });

    it('takes from opened posts first, then the earliest expiry, spilling over', () => {
        const sealed = post({ quantity: 200 });
        const opened = post({ quantity: 60, openedAt: day(-1), expiresAt: day(2) });
        const updates = planUsage(
            [sealed, opened],
            { amounts: { ML: 100 }, unknown: false },
            facts,
            USED_AT,
        );
        const byId = Object.fromEntries(updates.map((u) => [u.id, u]));
        assert.equal(byId[opened.id].quantity, 0);
        assert.equal(byId[opened.id].status, 'USED_UP');
        assert.equal(byId[sealed.id].quantity, 160);
        assert.equal(byId[sealed.id].openedAt, USED_AT);
    });

    it('converts piece and gram via the piece weight', () => {
        const onions = post({ quantity: 500, baseUnit: 'G' });
        const [update] = planUsage(
            [onions],
            { amounts: { PIECE: 2 }, unknown: false },
            { openedShelfLifeDays: null, pieceGrams: 80 },
            USED_AT,
        );
        assert.equal(update.quantity, 340);
    });

    it('books nothing when the units cannot be converted', () => {
        const p = post({ quantity: 200, baseUnit: 'ML' });
        assert.deepEqual(
            planUsage([p], { amounts: { G: 50 }, unknown: false }, facts, USED_AT),
            [],
        );
    });

    it('opens the first post for an unknown amount and marks it approximate', () => {
        const p = post();
        const [update] = planUsage([p], { amounts: {}, unknown: true }, facts, USED_AT);
        assert.deepEqual(update, {
            id: p.id,
            approximate: true,
            openedAt: USED_AT,
            expiresAt: day(3),
        });
    });

    it('opens a post without amount instead of deducting', () => {
        const p = post({ quantity: null, baseUnit: null });
        const [update] = planUsage([p], { amounts: { ML: 100 }, unknown: false }, facts, USED_AT);
        assert.deepEqual(update, { id: p.id, openedAt: USED_AT, expiresAt: day(3) });
    });
});

describe('needsFromRecipe', () => {
    const line = (
        ingredientId: string,
        amount: string,
        unit: string | null,
        extra: Partial<RecipeLine> = {},
    ): RecipeLine => ({
        id: `${ingredientId}-${amount}`,
        ingredientId,
        name: ingredientId,
        amount,
        unit,
        isOptional: false,
        position: 0,
        ...extra,
    });
    const context = () => ({ unitDefaults: { EL: 15 } });

    it('scales to the servings and sums per ingredient', () => {
        const needs = needsFromRecipe(
            [line('mehl', '200', 'g'), line('mehl', '2', 'EL'), line('sahne', '1', 'dl')],
            8,
            4,
            context,
        );
        assert.deepEqual(needs.get('mehl'), { amounts: { G: 460 }, unknown: false });
        assert.deepEqual(needs.get('sahne'), { amounts: { ML: 200 }, unknown: false });
    });

    it('flags unusable amounts and skips optional lines', () => {
        const needs = needsFromRecipe(
            [line('salz', 'nach Geschmack', null), line('dill', '1', 'EL', { isOptional: true })],
            4,
            4,
            context,
        );
        assert.deepEqual(needs.get('salz'), { amounts: {}, unknown: true });
        assert.equal(needs.has('dill'), false);
    });
});
