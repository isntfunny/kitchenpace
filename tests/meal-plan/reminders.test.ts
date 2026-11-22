import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { zonedTimeToUtc } from '../../shared/meal-reminders';
import {
    sendReminder,
    syncUserReminders,
    type ReminderScheduler,
} from '../../src/lib/meal-plan/reminders';

import { createFakeDb } from './fake-db';

const USER = 'user-1';
const BERLIN = 'Europe/Berlin';
// Saturday 2026-11-21, 15:00 Berlin
const NOW = zonedTimeToUtc('2026-11-21', '15:00', BERLIN);
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

let counter = 0;
const entry = (iso: string, over: Record<string, unknown> = {}) => ({
    id: `e${++counter}`,
    userId: USER,
    recipeId: 'r1',
    date: day(iso),
    mealType: 'DINNER',
    customMealType: null,
    position: 0,
    time: null,
    servings: 2,
    status: 'PLANNED',
    ...over,
});

function setup(
    profile: Record<string, unknown> = {},
    entries: Record<string, unknown>[] = [],
    extra: Record<string, unknown[]> = {},
) {
    const db = createFakeDb({
        profile: [
            {
                userId: USER,
                timezone: BERLIN,
                weekStartDay: 1,
                notifyOnCookStart: true,
                notifyOnWeeklyPlanReminder: false,
                quietHoursStart: null,
                quietHoursEnd: null,
                mealPlanSlots: null,
                ...profile,
            },
        ],
        recipe: [
            {
                id: 'r1',
                title: 'Gulasch',
                flowNodes: null,
                flowEdges: null,
                totalTime: 45,
                prepTime: 0,
                cookTime: 0,
            },
            {
                id: 'r2',
                title: 'Salat',
                flowNodes: null,
                flowEdges: null,
                totalTime: 10,
                prepTime: 0,
                cookTime: 0,
            },
        ],
        mealPlanRecipe: entries,
        ...extra,
    });
    const jobs = new Map<string, { delayMs: number; reminderId: string }>();
    const removed: string[] = [];
    const scheduler: ReminderScheduler = {
        schedule: async (jobId, delayMs, data) => {
            if (!jobs.has(jobId)) jobs.set(jobId, { delayMs, reminderId: data.reminderId });
        },
        remove: async (jobId) => {
            removed.push(jobId);
            jobs.delete(jobId);
        },
    };
    return { db, jobs, removed, scheduler };
}

const delivered: { userId: string; title: string; body: string; kind: string }[] = [];
const deliver = async (userId: string, r: { title: string; body: string; kind: string }) => {
    delivered.push({ userId, title: r.title, body: r.body, kind: r.kind });
};

describe('cook reminders', () => {
    beforeEach(() => {
        delivered.length = 0;
    });

    it('schedules one delayed job per slot at meal time - duration - 10 minutes', async () => {
        const { db, jobs, scheduler } = setup({}, [
            entry('2026-11-21'),
            entry('2026-11-21', { recipeId: 'r2', position: 1 }),
        ]);
        const report = await syncUserReminders(db, USER, NOW, { scheduler });
        assert.equal(report.created, 1);
        assert.equal(jobs.size, 1);
        const [row] = db.tables.mealPlanReminder;
        assert.equal(row.slotKey, 'DINNER');
        assert.equal(row.status, 'SCHEDULED');
        // 19:00 - 45 - 10 = 18:05
        assert.equal(
            row.scheduledFor.toISOString(),
            zonedTimeToUtc('2026-11-21', '18:05', BERLIN).toISOString(),
        );
        assert.equal([...jobs.values()][0].delayMs, row.scheduledFor.getTime() - NOW.getTime());
    });

    it('a second run changes nothing (idempotent job id)', async () => {
        const { db, jobs, scheduler } = setup({}, [entry('2026-11-21')]);
        await syncUserReminders(db, USER, NOW, { scheduler });
        const again = await syncUserReminders(db, USER, NOW, { scheduler });
        assert.equal(again.created, 0);
        assert.equal(again.kept, 1);
        assert.equal(db.tables.mealPlanReminder.length, 1);
        assert.equal(jobs.size, 1);
    });

    it('a moved entry replaces the job; the old one is removed', async () => {
        const e = entry('2026-11-21');
        const { db, jobs, removed, scheduler } = setup({}, [e]);
        await syncUserReminders(db, USER, NOW, { scheduler });
        const [firstJob] = [...jobs.keys()];
        db.tables.mealPlanRecipe[0].time = '20:00';
        const report = await syncUserReminders(db, USER, NOW, { scheduler });
        assert.equal(report.rescheduled, 1);
        assert.deepEqual(removed, [firstJob]);
        assert.equal(jobs.size, 1);
        assert.notEqual([...jobs.keys()][0], firstJob);
        assert.equal(db.tables.mealPlanReminder.length, 1);
    });

    it('a deleted entry cancels the reminder and its job', async () => {
        const { db, jobs, scheduler } = setup({}, [entry('2026-11-21')]);
        await syncUserReminders(db, USER, NOW, { scheduler });
        db.tables.mealPlanRecipe.length = 0;
        const report = await syncUserReminders(db, USER, NOW, { scheduler });
        assert.equal(report.cancelled, 1);
        assert.equal(db.tables.mealPlanReminder[0].status, 'CANCELLED');
        assert.equal(jobs.size, 0);
    });

    it('the old job of a changed entry is stale even if it still fires', async () => {
        const { db, scheduler } = setup({}, [entry('2026-11-21')]);
        await syncUserReminders(db, USER, NOW, { scheduler });
        const id = db.tables.mealPlanReminder[0].id;
        db.tables.mealPlanRecipe[0].recipeId = 'r2'; // different dish and duration
        assert.equal(await sendReminder(db, id, NOW, deliver), 'stale');
        assert.equal(delivered.length, 0);
        assert.equal(db.tables.mealPlanReminder[0].status, 'CANCELLED');
    });

    it('no push for cooked or cancelled entries', async () => {
        const { db, scheduler } = setup({}, [entry('2026-11-21')]);
        await syncUserReminders(db, USER, NOW, { scheduler });
        const id = db.tables.mealPlanReminder[0].id;
        db.tables.mealPlanRecipe[0].cookedAt = new Date();
        assert.equal(await sendReminder(db, id, NOW, deliver), 'stale');
        assert.equal(delivered.length, 0);

        const second = setup({}, [entry('2026-11-21', { status: 'CANCELLED' })]);
        const report = await syncUserReminders(second.db, USER, NOW, {
            scheduler: second.scheduler,
        });
        assert.equal(report.created, 0);
    });

    it('sends once with the dishes of the slot, never twice', async () => {
        const { db, scheduler } = setup({}, [
            entry('2026-11-21'),
            entry('2026-11-21', { recipeId: 'r2', position: 1 }),
        ]);
        await syncUserReminders(db, USER, NOW, { scheduler });
        const id = db.tables.mealPlanReminder[0].id;
        const late = zonedTimeToUtc('2026-11-21', '18:06', BERLIN);
        assert.equal(await sendReminder(db, id, late, deliver), 'sent');
        assert.equal(await sendReminder(db, id, late, deliver), 'already');
        assert.equal(delivered.length, 1);
        assert.match(delivered[0].body, /Gulasch und Salat/);
        assert.equal(db.tables.mealPlanReminder[0].status, 'SENT');
        // A later change of the entry does not produce another push for this slot
        db.tables.mealPlanRecipe[0].time = '21:00';
        await syncUserReminders(db, USER, late, { scheduler });
        assert.equal(db.tables.mealPlanReminder.length, 1);
        assert.equal(db.tables.mealPlanReminder[0].status, 'SENT');
    });

    it('notifyOnCookStart off: nothing is scheduled, existing reminders are cancelled, sending is refused', async () => {
        const { db, scheduler } = setup({}, [entry('2026-11-21')]);
        await syncUserReminders(db, USER, NOW, { scheduler });
        const id = db.tables.mealPlanReminder[0].id;
        db.tables.profile[0].notifyOnCookStart = false;
        assert.equal(await sendReminder(db, id, NOW, deliver), 'stale');
        assert.equal(delivered.length, 0);
        const report = await syncUserReminders(db, USER, NOW, { scheduler });
        assert.equal(report.created, 0);
    });

    it('quiet hours move the reminder and changing them makes an old job stale', async () => {
        const { db, scheduler } = setup({ quietHoursStart: '17:30', quietHoursEnd: '18:30' }, [
            entry('2026-11-21'),
        ]);
        await syncUserReminders(db, USER, NOW, { scheduler });
        const row = db.tables.mealPlanReminder[0];
        assert.equal(
            row.scheduledFor.toISOString(),
            zonedTimeToUtc('2026-11-21', '18:30', BERLIN).toISOString(),
        );
        db.tables.profile[0].quietHoursStart = null;
        assert.equal(await sendReminder(db, row.id, NOW, deliver), 'stale');
    });

    it('dry run reports and writes nothing', async () => {
        const { db, jobs, scheduler } = setup({}, [entry('2026-11-21')]);
        const report = await syncUserReminders(db, USER, NOW, { scheduler, dryRun: true });
        assert.equal(report.created, 1);
        assert.equal(db.tables.mealPlanReminder?.length ?? 0, 0);
        assert.equal(jobs.size, 0);
    });

    it('a custom slot uses its configured time, a week override beats the user default', async () => {
        const slots = [
            { key: 'BREAKFAST', name: null, time: '07:30', enabled: true },
            { key: 'LUNCH', name: null, time: '12:30', enabled: true },
            { key: 'SNACK', name: null, time: '15:30', enabled: false },
            { key: 'DINNER', name: null, time: '19:00', enabled: true },
            { key: 'c_brunch', name: 'Brunch', time: '22:00', enabled: true },
        ];
        const brunch = entry('2026-11-21', { mealType: null, customMealType: 'c_brunch' });
        const { db, scheduler } = setup({ mealPlanSlots: slots }, [brunch], {
            mealPlan: [
                {
                    userId: USER,
                    startDate: day('2026-11-16'),
                    slotOverride: slots.map((s) =>
                        s.key === 'c_brunch' ? { ...s, time: '23:00' } : s,
                    ),
                },
            ],
        });
        await syncUserReminders(db, USER, NOW, { scheduler });
        // 23:00 - 45 - 10 = 22:05 (override), not 21:05
        assert.equal(
            db.tables.mealPlanReminder[0].scheduledFor.toISOString(),
            zonedTimeToUtc('2026-11-21', '22:05', BERLIN).toISOString(),
        );
    });
});

describe('weekly reminder', () => {
    // Sunday 2026-11-22, 09:00; the week starts on Monday 2026-11-23
    const SUNDAY = zonedTimeToUtc('2026-11-22', '09:00', BERLIN);

    const weekly = (over: Record<string, unknown> = {}, entries: Record<string, unknown>[] = []) =>
        setup({ notifyOnWeeklyPlanReminder: true, ...over }, entries);

    it('is scheduled for 17:00 on the day before for an active planner with an empty next week', async () => {
        const { db, scheduler } = weekly({}, [entry('2026-11-18', { status: 'COMPLETED' })]);
        await syncUserReminders(db, USER, SUNDAY, { scheduler });
        const row = db.tables.mealPlanReminder.find((r: any) => r.kind === 'WEEKLY_PLAN');
        assert.ok(row);
        assert.equal(
            row.scheduledFor.toISOString(),
            zonedTimeToUtc('2026-11-22', '17:00', BERLIN).toISOString(),
        );
        assert.equal(row.slotKey, '');
    });

    it('not for someone who never plans, not when the week is already planned, not when switched off', async () => {
        const none = weekly();
        await syncUserReminders(none.db, USER, SUNDAY, { scheduler: none.scheduler });
        assert.equal(none.db.tables.mealPlanReminder?.length ?? 0, 0);

        const planned = weekly({}, [entry('2026-11-18'), entry('2026-11-25')]);
        await syncUserReminders(planned.db, USER, SUNDAY, { scheduler: planned.scheduler });
        assert.equal(
            planned.db.tables.mealPlanReminder?.filter((r: any) => r.kind === 'WEEKLY_PLAN')
                .length ?? 0,
            0,
        );

        const off = setup({ notifyOnWeeklyPlanReminder: false }, [entry('2026-11-18')]);
        await syncUserReminders(off.db, USER, SUNDAY, { scheduler: off.scheduler });
        assert.equal(off.db.tables.mealPlanReminder?.length ?? 0, 0);
    });

    it('is dropped when the week gets planned before it is sent', async () => {
        const { db, scheduler } = weekly({}, [entry('2026-11-18')]);
        await syncUserReminders(db, USER, SUNDAY, { scheduler });
        const id = db.tables.mealPlanReminder[0].id;
        db.tables.mealPlanRecipe.push(entry('2026-11-24'));
        const at17 = zonedTimeToUtc('2026-11-22', '17:00', BERLIN);
        assert.equal(await sendReminder(db, id, at17, deliver), 'stale');
    });

    it('is sent with the weekly type content', async () => {
        const { db, scheduler } = weekly({}, [entry('2026-11-18')]);
        await syncUserReminders(db, USER, SUNDAY, { scheduler });
        const id = db.tables.mealPlanReminder[0].id;
        delivered.length = 0;
        assert.equal(
            await sendReminder(db, id, zonedTimeToUtc('2026-11-22', '17:00', BERLIN), deliver),
            'sent',
        );
        assert.equal(delivered[0].kind, 'WEEKLY_PLAN');
    });
});
