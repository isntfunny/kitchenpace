// KUC-110: share link, moderated texts and "In meinen Plan übernehmen" (fake DB only).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    getMealPlanShare,
    getSharedMealPlanWeek,
    importSharedWeek,
    mapSharedSlot,
    previewSharedWeekImport,
    revokeMealPlanShare,
    setShareModeration,
    SHARE_CONTENT_TYPE,
    shareMealPlanWeek,
    shareTextsOf,
} from '../../src/lib/meal-plan/share';
import { DEFAULT_SLOTS } from '../../src/lib/meal-plan/slots';

import { createFakeDb } from './fake-db';

type Row = Record<string, any>;

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const recipe = (id: string, status = 'PUBLISHED') => ({
    id,
    title: id,
    slug: id,
    status,
    moderationStatus: 'APPROVED',
    authorId: 'alice',
    imageKey: null,
    blurhash: null,
    totalTime: 30,
});

const entry = (id: string, recipeId: string, date: string, extra: Row = {}): Row => ({
    id,
    userId: 'alice',
    recipeId,
    date: day(date),
    mealType: 'DINNER',
    customMealType: null,
    position: 0,
    time: null,
    servings: 2,
    status: 'PLANNED',
    notes: null,
    leftoverOfId: null,
    cookHistoryId: null,
    ...extra,
});

const ALICE_SLOTS = [
    ...DEFAULT_SLOTS,
    { key: 'c_brunch', name: 'Sonntagsbrunch', time: '10:30', enabled: true },
];

function seed() {
    return createFakeDb({
        profile: [
            { userId: 'alice', mealPlanSlots: ALICE_SLOTS },
            { userId: 'bob', mealPlanSlots: null },
        ],
        recipe: [recipe('chili'), recipe('pancakes'), recipe('secret', 'DRAFT')],
        mealPlanRecipe: [
            entry('e1', 'chili', '2026-11-23', { notes: 'Bohnen einweichen', servings: 4 }),
            entry('e2', 'chili', '2026-11-24', { mealType: 'LUNCH', leftoverOfId: 'e1' }),
            entry('e3', 'pancakes', '2026-11-29', {
                mealType: null,
                customMealType: 'c_brunch',
                time: '11:00',
            }),
            entry('e4', 'secret', '2026-11-25'),
        ],
    });
}

async function shareWithModeration(db: ReturnType<typeof seed>, includeNotes: boolean) {
    const share = await shareMealPlanWeek(db as any, 'alice', '2026-11-23');
    const texts = await shareTextsOf(db as any, 'alice', '2026-11-23', includeNotes);
    // What persistModerationResult stores in the queue
    db.tables.moderationQueue = [
        { id: 'q1', contentType: SHARE_CONTENT_TYPE, contentId: share.id, contentSnapshot: texts },
    ];
    return { token: share.shareToken!, texts };
}

test('shareTextsOf collects custom slot names and, on request, the notes', async () => {
    const db = seed();
    assert.deepEqual(await shareTextsOf(db as any, 'alice', '2026-11-23', false), {
        includeNotes: false,
        notes: [],
        slotNames: ['Sonntagsbrunch'],
    });
    const withNotes = await shareTextsOf(db as any, 'alice', '2026-11-23', true);
    assert.deepEqual(withNotes.notes, ['Bohnen einweichen']);
});

test('the shared week shows moderated texts only after approval and only unchanged', async () => {
    const db = seed();
    const { token } = await shareWithModeration(db, true);

    // Not moderated yet: no custom names, no notes, never drafts
    let week = (await getSharedMealPlanWeek(db as any, token))!;
    assert.equal(week.entries.length, 3);
    assert.ok(week.entries.every((e) => e.recipe.id !== 'secret'));
    assert.ok(week.entries.every((e) => !('notes' in e)));
    assert.equal(week.slots.find((s) => s.key === 'c_brunch')!.label, 'Weitere Mahlzeit');

    await setShareModeration(db as any, 'alice', '2026-11-23', 'PENDING');
    week = (await getSharedMealPlanWeek(db as any, token))!;
    assert.ok(week.entries.every((e) => !('notes' in e)));

    await setShareModeration(db as any, 'alice', '2026-11-23', 'AUTO_APPROVED');
    week = (await getSharedMealPlanWeek(db as any, token))!;
    assert.equal(week.slots.find((s) => s.key === 'c_brunch')!.label, 'Sonntagsbrunch');
    assert.equal(week.entries.find((e) => e.date === '2026-11-23')!.notes, 'Bohnen einweichen');
    assert.deepEqual(Object.keys(week.entries[1]).sort(), [
        'date',
        'position',
        'recipe',
        'servings',
        'slot',
        'time',
    ]);

    // A note changed after moderation stays hidden until checked again
    db.tables.mealPlanRecipe[0].notes = 'Ruf mich an: 0171 …';
    week = (await getSharedMealPlanWeek(db as any, token))!;
    assert.ok(week.entries.every((e) => !('notes' in e)));

    await setShareModeration(db as any, 'alice', '2026-11-23', 'REJECTED');
    week = (await getSharedMealPlanWeek(db as any, token))!;
    assert.equal(week.slots.find((s) => s.key === 'c_brunch')!.label, 'Weitere Mahlzeit');
});

test('notes stay private when the owner does not share them', async () => {
    const db = seed();
    const { token } = await shareWithModeration(db, false);
    await setShareModeration(db as any, 'alice', '2026-11-23', 'AUTO_APPROVED');
    const week = (await getSharedMealPlanWeek(db as any, token))!;
    assert.ok(week.entries.every((e) => !('notes' in e)));
    assert.equal((await getMealPlanShare(db as any, 'alice', '2026-11-23'))!.includeNotes, false);
});

test('a renewed or revoked link returns no data', async () => {
    const db = seed();
    const first = await shareMealPlanWeek(db as any, 'alice', '2026-11-23');
    const second = await shareMealPlanWeek(db as any, 'alice', '2026-11-23');
    assert.notEqual(first.shareToken, second.shareToken);
    assert.equal(await getSharedMealPlanWeek(db as any, first.shareToken!), null);
    assert.ok(await getSharedMealPlanWeek(db as any, second.shareToken!));
    assert.equal(await getMealPlanShare(db as any, 'bob', '2026-11-23'), null);

    await revokeMealPlanShare(db as any, 'alice', '2026-11-23');
    assert.equal(await getSharedMealPlanWeek(db as any, second.shareToken!), null);
    assert.equal(await getMealPlanShare(db as any, 'alice', '2026-11-23'), null);
    await assert.rejects(
        importSharedWeek(db as any, 'bob', { token: second.shareToken, startDate: '2026-11-30' }),
        /nicht gefunden/,
    );
});

test('mapSharedSlot keeps known slots and maps foreign custom ones by time', () => {
    assert.equal(mapSharedSlot({ key: 'LUNCH', time: '12:30' }, DEFAULT_SLOTS), 'LUNCH');
    assert.equal(mapSharedSlot({ key: 'c_brunch', time: '10:30' }, DEFAULT_SLOTS), 'LUNCH');
    assert.equal(mapSharedSlot({ key: 'c_brunch', time: '08:00' }, DEFAULT_SLOTS), 'BREAKFAST');
    assert.equal(mapSharedSlot({ key: 'c_brunch', time: '10:30' }, ALICE_SLOTS), 'c_brunch');
});

test('"In meinen Plan übernehmen" copies published dishes without notes', async () => {
    const db = seed();
    const { token } = await shareWithModeration(db, true);
    const preview = await previewSharedWeekImport(db as any, 'bob', {
        token,
        startDate: '2026-11-30',
    });
    assert.deepEqual(preview, { count: 3, conflicts: [] });

    const result = await importSharedWeek(db as any, 'bob', { token, startDate: '2026-11-30' });
    assert.equal(result.created, 3);
    const bobs = db.tables.mealPlanRecipe.filter((e: Row) => e.userId === 'bob');
    assert.equal(bobs.length, 3);
    assert.ok(bobs.every((e: Row) => e.notes === null && e.recipeId !== 'secret'));
    const origin = bobs.find((e: Row) => e.servings === 4)!;
    assert.equal(bobs.find((e: Row) => e.leftoverOfId)!.leftoverOfId, origin.id);
    const brunch = bobs.find((e: Row) => e.recipeId === 'pancakes')!;
    assert.equal(brunch.mealType, 'LUNCH');
    assert.equal(brunch.date.toISOString().slice(0, 10), '2026-12-06');
});
