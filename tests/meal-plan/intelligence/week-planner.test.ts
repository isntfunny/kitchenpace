import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addDays, todayIn } from '@shared/dates';

import {
    applyShelfLifeOrder,
    getFreshnessMarkers,
    previewShelfLifeOrder,
} from '../../../src/lib/meal-plan/intelligence/week-planner';
import { createFakeDb } from '../fake-db';

const USER = 'user-1';
const today = todayIn('Europe/Berlin');
const day = (n: number) => addDays(today, n);
const dbDate = (n: number) => new Date(`${day(n)}T00:00:00.000Z`);

let n = 0;
const entry = (recipeId: string, offset: number, over: Record<string, unknown> = {}) => ({
    id: `e${++n}`,
    userId: USER,
    recipeId,
    date: dbDate(offset),
    mealType: 'DINNER',
    customMealType: null,
    position: 0,
    time: null,
    servings: 2,
    status: 'PLANNED',
    pinned: false,
    ...over,
});
const recipe = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    slug: id,
    title: id,
    imageKey: null,
    totalTime: 30,
    servings: 2,
    status: 'PUBLISHED',
    moderationStatus: 'AUTO_APPROVED',
    authorId: USER,
    rating: 4,
    ratingCount: 5,
    ...extra,
});

function seed(entries: ReturnType<typeof entry>[]) {
    return createFakeDb({
        recipe: [recipe('rice'), recipe('stew'), recipe('fish'), recipe('soup'), recipe('pasta')],
        ingredient: [
            {
                id: 'reis',
                name: 'Reis',
                normalizedName: null,
                shelfLifeSource: 'AI',
                defaultStorage: 'PANTRY',
            },
            {
                id: 'kohl',
                name: 'Kohl',
                normalizedName: null,
                shelfLifeSource: 'AI',
                defaultStorage: 'FRIDGE',
            },
            {
                id: 'lachs',
                name: 'Lachs',
                normalizedName: null,
                shelfLifeSource: 'AI',
                defaultStorage: 'FRIDGE',
            },
            {
                id: 'neu',
                name: 'Neu',
                normalizedName: null,
                shelfLifeSource: null,
                defaultStorage: null,
            },
        ],
        ingredientStorageLife: [
            { ingredientId: 'reis', storage: 'PANTRY', days: 300 },
            { ingredientId: 'kohl', storage: 'FRIDGE', days: 7 },
            { ingredientId: 'lachs', storage: 'FRIDGE', days: 1 },
        ],
        recipeIngredient: [
            {
                id: 'i1',
                recipeId: 'rice',
                ingredientId: 'reis',
                amount: '200',
                unitId: 'g',
                isOptional: false,
            },
            {
                id: 'i2',
                recipeId: 'stew',
                ingredientId: 'kohl',
                amount: '1',
                unitId: 'g',
                isOptional: false,
            },
            {
                id: 'i3',
                recipeId: 'fish',
                ingredientId: 'lachs',
                amount: '2',
                unitId: 'g',
                isOptional: false,
            },
            {
                id: 'i4',
                recipeId: 'soup',
                ingredientId: 'neu',
                amount: '1',
                unitId: 'g',
                isOptional: false,
            },
        ],
        unit: [{ id: 'g', shortName: 'g', gramsDefault: 1 }],
        mealPlanRecipe: entries,
    });
}

describe('shelf-life ordering on the plan', () => {
    const entries = () => [entry('rice', 0), entry('stew', 1), entry('fish', 2)];

    it('marks the dish that is no longer fresh', async () => {
        const db = seed(entries());
        const markers = await getFreshnessMarkers(db, USER, today);
        const fish = db.tables.mealPlanRecipe.find((e: any) => e.recipeId === 'fish');
        assert.deepEqual(Object.keys(markers), [fish.id]);
        assert.match(markers[fish.id][0].label, /Lachs/);
    });

    it('proposes moving the perishable dish first, with reasons', async () => {
        const db = seed(entries());
        const proposal = await previewShelfLifeOrder(db, USER, today);
        assert.equal(proposal.changed, true);
        assert.ok(proposal.reasons.length > 0);
        const fish = proposal.moves.find((m) => m.title === 'fish');
        assert.equal(fish?.to.date, day(0));
        assert.ok(proposal.warningsAfter < proposal.warningsBefore);
    });

    it('applies only the confirmed proposal and writes nothing before', async () => {
        const db = seed(entries());
        const before = JSON.stringify(db.tables.mealPlanRecipe);
        const proposal = await previewShelfLifeOrder(db, USER, today);
        assert.equal(JSON.stringify(db.tables.mealPlanRecipe), before);

        const moved: string[] = [];
        const outcome = await applyShelfLifeOrder(
            db,
            USER,
            today,
            proposal.signature,
            async (id, to) => {
                moved.push(id);
                const row = db.tables.mealPlanRecipe.find((e: any) => e.id === id);
                row.date = new Date(`${to.date}T00:00:00.000Z`);
                row.mealType = to.slot;
            },
        );
        assert.deepEqual(outcome, { moved: moved.length });
        assert.ok(moved.length >= 2);
        const fish = db.tables.mealPlanRecipe.find((e: any) => e.recipeId === 'fish');
        assert.equal(fish.date.toISOString().slice(0, 10), day(0));
    });

    it('refuses a stale proposal and leaves pinned, timed and cooked dishes alone', async () => {
        const db = seed(entries());
        const proposal = await previewShelfLifeOrder(db, USER, today);
        const stale = await applyShelfLifeOrder(db, USER, today, 'old', async () => {
            throw new Error('must not move');
        });
        assert.deepEqual(stale, { stale: true });

        const pinned = seed([
            entry('rice', 0),
            entry('stew', 1),
            entry('fish', 2, { pinned: true }),
        ]);
        const fixed = await previewShelfLifeOrder(pinned, USER, today);
        assert.equal(
            fixed.moves.find((m) => m.title === 'fish'),
            undefined,
        );
        assert.notEqual(proposal.signature, fixed.signature);
    });
});
