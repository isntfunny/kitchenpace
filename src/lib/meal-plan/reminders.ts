// Reminders for the meal plan (KUC-109): "Zeit anzufangen" before a planned slot and the weekly
// "Plane deine Woche". The timing logic is pure and lives in shared/meal-reminders; this module
// loads the data, keeps MealPlanReminder in step and decides right before sending.
//
// How it fits together: the cron job `reconcile-meal-reminders` (every 15 minutes) calls
// `syncUserReminders` for the users with plan entries. That writes one MealPlanReminder row per
// slot and a BullMQ delayed job (`send-meal-reminder`) with an idempotent id. The delayed job calls
// `sendReminder`, which recomputes the reminder and only sends when fingerprint and time still
// match, so a moved, changed, cooked or deleted entry never triggers an old push.
import type { Prisma } from '@prisma/client';

import { formatIsoDate, todayIn } from '@shared/dates';
import {
    cookDurationMinutes,
    diffReminders,
    parseQuietHours,
    planCookReminders,
    reminderJobId,
    sendDecision,
    weeklyReminder,
    weeklyReminderNeeded,
    weeklyReminderSlot,
    ACTIVE_PLANNER_DAYS,
    type DesiredReminder,
    type ExistingReminder,
    type ReminderEntry,
    type ReminderKind,
} from '@shared/meal-reminders';

import type { Db } from './db';
import { resolveSlots, slotKeyOf } from './slots';
import { toDbDate, weekStartFor } from './week';

const DAYS_BEFORE = 1;
const DAYS_AFTER = 2;

/** Adds days to a `YYYY-MM-DD` date. */
function shift(date: string, days: number): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Port to the delayed jobs, so tests need no Redis. Both calls must be idempotent. */
export interface ReminderScheduler {
    /** Adds the delayed job; does nothing when a job with this id exists */
    schedule(jobId: string, delayMs: number, data: { reminderId: string }): Promise<void>;
    /** Removes a not yet running job; does nothing when it is gone */
    remove(jobId: string): Promise<void>;
}

export interface SyncReport {
    userId: string;
    created: number;
    rescheduled: number;
    cancelled: number;
    kept: number;
}

interface ProfileForReminders {
    timezone: string;
    weekStartDay: number;
    notifyOnCookStart: boolean;
    notifyOnWeeklyPlanReminder: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    mealPlanSlots: unknown;
}

const profileSelect = {
    timezone: true,
    weekStartDay: true,
    notifyOnCookStart: true,
    notifyOnWeeklyPlanReminder: true,
    quietHoursStart: true,
    quietHoursEnd: true,
    mealPlanSlots: true,
} satisfies Prisma.ProfileSelect;

const recipeSelect = {
    title: true,
    flowNodes: true,
    flowEdges: true,
    totalTime: true,
    prepTime: true,
    cookTime: true,
} satisfies Prisma.RecipeSelect;

export interface DesiredOptions {
    /** Window sizes; the worker widens them so a slightly late job still finds its reminder */
    graceMinutes?: number;
    horizonHours?: number;
}

/** Everything that should be scheduled for the user right now (cook reminders and weekly). */
export async function computeDesiredReminders(
    db: Db,
    userId: string,
    now: Date,
    options: DesiredOptions = {},
): Promise<{ desired: DesiredReminder[]; timezone: string; from: string; to: string } | null> {
    const profile = (await db.profile.findUnique({
        where: { userId },
        select: profileSelect,
    })) as ProfileForReminders | null;
    if (!profile) return null;

    const timeZone = profile.timezone;
    const today = todayIn(timeZone, now);
    const from = shift(today, -DAYS_BEFORE);
    const to = shift(today, DAYS_AFTER);
    const quiet = parseQuietHours(profile.quietHoursStart, profile.quietHoursEnd);
    const window = { timeZone, quiet, now, ...options };
    const desired: DesiredReminder[] = [];

    if (profile.notifyOnCookStart) {
        const entries = await loadReminderEntries(db, userId, profile, from, to);
        desired.push(...planCookReminders(entries, {}, window));
    }

    if (profile.notifyOnWeeklyPlanReminder) {
        const slot = weeklyReminderSlot({ ...window, weekStartDay: profile.weekStartDay });
        if (slot) {
            const counts = await countPlannedEntries(db, userId, slot.weekStart);
            if (weeklyReminderNeeded(counts)) desired.push(weeklyReminder(slot, timeZone));
        }
    }
    return { desired, timezone: timeZone, from, to };
}

async function loadReminderEntries(
    db: Db,
    userId: string,
    profile: ProfileForReminders,
    from: string,
    to: string,
): Promise<ReminderEntry[]> {
    const rows = await db.mealPlanRecipe.findMany({
        where: {
            userId,
            date: { gte: toDbDate(from), lte: toDbDate(to) },
            status: 'PLANNED',
            cookedAt: null,
        },
        include: { recipe: { select: recipeSelect } },
    });

    // Slot times: user default, or the override of the week the entry is in
    const overrides = new Map<string, unknown>();
    const weekStarts = new Set(
        rows.map((row) => weekStartFor(formatIsoDate(row.date), profile.weekStartDay)),
    );
    if (weekStarts.size > 0) {
        const plans = await db.mealPlan.findMany({
            where: { userId, startDate: { in: [...weekStarts].map(toDbDate) } },
            select: { startDate: true, slotOverride: true },
        });
        for (const plan of plans) {
            if (plan.slotOverride != null)
                overrides.set(formatIsoDate(plan.startDate), plan.slotOverride);
        }
    }

    return rows.map((row): ReminderEntry => {
        const date = formatIsoDate(row.date);
        const slotKey = slotKeyOf(row);
        const override = overrides.get(weekStartFor(date, profile.weekStartDay));
        const slots = resolveSlots(profile.mealPlanSlots, override);
        return {
            id: row.id,
            recipeId: row.recipeId,
            title: row.recipe.title,
            date,
            slotKey,
            time: row.time ?? slots.find((slot) => slot.key === slotKey)?.time ?? null,
            status: row.status,
            cookedAt: row.cookedAt,
            leftoverOfId: row.leftoverOfId,
            durationMin: cookDurationMinutes(row.recipe),
        };
    });
}

/** Entries in the last 4 weeks before the week (active planner) and in the week itself. */
async function countPlannedEntries(db: Db, userId: string, weekStart: string) {
    const notCancelled = { not: 'CANCELLED' as const };
    const [recentEntries, nextWeekEntries] = await Promise.all([
        db.mealPlanRecipe.count({
            where: {
                userId,
                status: notCancelled,
                date: {
                    gte: toDbDate(shift(weekStart, -ACTIVE_PLANNER_DAYS)),
                    lte: toDbDate(shift(weekStart, -1)),
                },
            },
        }),
        db.mealPlanRecipe.count({
            where: {
                userId,
                status: notCancelled,
                date: { gte: toDbDate(weekStart), lte: toDbDate(shift(weekStart, 6)) },
            },
        }),
    ]);
    return { recentEntries, nextWeekEntries };
}

function toExisting(row: {
    id: string;
    kind: ReminderKind;
    date: Date;
    slotKey: string;
    scheduledFor: Date;
    fingerprint: string;
    status: ExistingReminder['status'];
    jobId: string | null;
}): ExistingReminder {
    return { ...row, date: formatIsoDate(row.date) };
}

/**
 * Brings the stored reminders and the delayed jobs of one user in line with the plan.
 * `dryRun` computes and reports, writes and schedules nothing.
 */
export async function syncUserReminders(
    db: Db,
    userId: string,
    now: Date,
    options: { scheduler: ReminderScheduler; dryRun?: boolean },
): Promise<SyncReport> {
    const report: SyncReport = { userId, created: 0, rescheduled: 0, cancelled: 0, kept: 0 };
    const computed = await computeDesiredReminders(db, userId, now);
    if (!computed) return report;

    const rows = await db.mealPlanReminder.findMany({
        where: {
            userId,
            date: { gte: toDbDate(computed.from), lte: toDbDate(shift(computed.to, 7)) },
        },
    });
    const diff = diffReminders(computed.desired, rows.map(toExisting));
    report.kept = diff.keep.length;
    report.created = diff.create.length;
    report.rescheduled = diff.reschedule.length;
    report.cancelled = diff.cancel.length;
    if (options.dryRun) return report;

    const jobIdFor = (reminder: DesiredReminder) => reminderJobId({ ...reminder, userId });
    const delayOf = (reminder: DesiredReminder) =>
        Math.max(0, reminder.sendAt.getTime() - now.getTime());

    for (const reminder of diff.create) {
        const jobId = jobIdFor(reminder);
        const row = await db.mealPlanReminder.create({
            data: {
                userId,
                kind: reminder.kind,
                date: toDbDate(reminder.date),
                slotKey: reminder.slotKey,
                scheduledFor: reminder.sendAt,
                fingerprint: reminder.fingerprint,
                status: 'SCHEDULED',
                jobId,
            },
        });
        await options.scheduler.schedule(jobId, delayOf(reminder), { reminderId: row.id });
    }

    for (const { existing, desired } of diff.reschedule) {
        if (existing.jobId) await options.scheduler.remove(existing.jobId);
        const jobId = jobIdFor(desired);
        await db.mealPlanReminder.update({
            where: { id: existing.id },
            data: {
                scheduledFor: desired.sendAt,
                fingerprint: desired.fingerprint,
                status: 'SCHEDULED',
                sentAt: null,
                jobId,
            },
        });
        await options.scheduler.schedule(jobId, delayOf(desired), { reminderId: existing.id });
    }

    for (const { existing, desired } of diff.keep) {
        // Same id as before: a job that got lost is added again, an existing one is left alone
        await options.scheduler.schedule(existing.jobId ?? jobIdFor(desired), delayOf(desired), {
            reminderId: existing.id,
        });
    }

    for (const existing of diff.cancel) {
        if (existing.jobId) await options.scheduler.remove(existing.jobId);
        await db.mealPlanReminder.updateMany({
            where: { id: existing.id, status: 'SCHEDULED' },
            data: { status: 'CANCELLED' },
        });
    }
    return report;
}

export type SendResult = 'sent' | 'stale' | 'already' | 'missing';

/**
 * Called by the delayed job. Recomputes the reminder from the current plan and settings and sends
 * only if it still matches the stored one. The row is claimed (SCHEDULED → SENT) before delivery,
 * so a retry or a second job can never send a slot twice; a failed delivery is not repeated.
 */
export async function sendReminder(
    db: Db,
    reminderId: string,
    now: Date,
    deliver: (userId: string, reminder: DesiredReminder) => Promise<void>,
): Promise<SendResult> {
    const row = await db.mealPlanReminder.findUnique({ where: { id: reminderId } });
    if (!row) return 'missing';
    const stored = toExisting(row);
    if (stored.status === 'SENT') return 'already';

    // Wide window: this job may run a little late and must still find its own reminder
    const computed =
        stored.status === 'SCHEDULED'
            ? await computeDesiredReminders(db, row.userId, now, {
                  graceMinutes: 180,
                  horizonHours: 72,
              })
            : null;
    const current =
        computed?.desired.find(
            (item) =>
                item.kind === stored.kind &&
                item.date === stored.date &&
                item.slotKey === stored.slotKey,
        ) ?? null;

    if (sendDecision(stored, current) !== 'send' || !current) {
        await db.mealPlanReminder.updateMany({
            where: { id: row.id, status: 'SCHEDULED' },
            data: { status: 'CANCELLED' },
        });
        return 'stale';
    }

    const claimed = await db.mealPlanReminder.updateMany({
        where: { id: row.id, status: 'SCHEDULED' },
        data: { status: 'SENT', sentAt: now },
    });
    if (claimed.count === 0) return 'already';
    await deliver(row.userId, current);
    return 'sent';
}

/** Users that can have reminders: planned something recently or in the coming days. */
export async function listReminderUsers(db: Db, now: Date, limit: number): Promise<string[]> {
    const from = shift(now.toISOString().slice(0, 10), -ACTIVE_PLANNER_DAYS);
    const to = shift(now.toISOString().slice(0, 10), 10);
    const rows = await db.mealPlanRecipe.findMany({
        where: { date: { gte: toDbDate(from), lte: toDbDate(to) } },
        select: { userId: true },
        distinct: ['userId'],
        take: limit,
    });
    return rows.map((row) => row.userId);
}
