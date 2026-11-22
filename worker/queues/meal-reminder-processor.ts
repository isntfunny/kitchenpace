import { Job } from 'bullmq';

import { createUserNotification } from '@app/lib/events/persist';
import {
    listReminderUsers,
    sendReminder,
    syncUserReminders,
    type ReminderScheduler,
    type SendResult,
    type SyncReport,
} from '@app/lib/meal-plan/reminders';

import { prisma } from './prisma';
import { getScheduledQueue } from './queue';
import type { ReconcileMealRemindersJob, SendMealReminderJob } from './types';

export const SEND_MEAL_REMINDER_JOB = 'send-meal-reminder';

/** Delayed jobs of the scheduled queue; ids are idempotent, so adding twice is harmless. */
export function createReminderScheduler(): ReminderScheduler {
    return {
        async schedule(jobId, delayMs, data) {
            // attempts: 1 — a send is claimed in the DB first and is never repeated
            await getScheduledQueue().add(SEND_MEAL_REMINDER_JOB, data, {
                jobId,
                delay: delayMs,
                attempts: 1,
                removeOnComplete: true,
                removeOnFail: 100,
            });
        },
        async remove(jobId) {
            const job = await getScheduledQueue().getJob(jobId);
            if (!job) return;
            // A job that is already running cannot be removed; it re-checks the row itself
            await job.remove().catch(() => {});
        },
    };
}

export interface ReconcileReport {
    dryRun: boolean;
    users: number;
    created: number;
    rescheduled: number;
    cancelled: number;
    kept: number;
    failed: number;
}

/**
 * Every 15 minutes (KUC-109): aligns reminders and delayed jobs with the plan of every user who
 * planned something lately. Safety net for changes that did not enqueue a sync themselves.
 */
export async function processReconcileMealReminders(
    job: Job<ReconcileMealRemindersJob>,
): Promise<ReconcileReport> {
    const dryRun = job.data.dryRun === true;
    const limit = job.data.limit ?? 2000;
    const now = new Date();
    const scheduler = createReminderScheduler();
    const userIds = job.data.userId
        ? [job.data.userId]
        : await listReminderUsers(prisma, now, limit);

    const report: ReconcileReport = {
        dryRun,
        users: userIds.length,
        created: 0,
        rescheduled: 0,
        cancelled: 0,
        kept: 0,
        failed: 0,
    };
    for (const userId of userIds) {
        try {
            const result: SyncReport = await syncUserReminders(prisma, userId, now, {
                scheduler,
                dryRun,
            });
            report.created += result.created;
            report.rescheduled += result.rescheduled;
            report.cancelled += result.cancelled;
            report.kept += result.kept;
        } catch (error) {
            report.failed++;
            console.error(`[MealReminders] Sync failed for user ${userId}`, error);
        }
    }
    console.log(
        `[MealReminders] ${dryRun ? 'Dry run' : 'Reconciled'}: ${report.users} users, +${report.created} ~${report.rescheduled} -${report.cancelled}, ${report.failed} failed`,
    );
    return report;
}

/**
 * Delayed job: checks the reminder against the current plan and settings right before sending.
 * Delivery uses the existing notification system (in-app + web push, VAPID).
 */
export async function processSendMealReminder(
    job: Job<SendMealReminderJob>,
): Promise<{ result: SendResult }> {
    const result = await sendReminder(
        prisma,
        job.data.reminderId,
        new Date(),
        async (userId, reminder) => {
            await createUserNotification({
                userId,
                // There is no cook-start type; the weekly one exists (KUC-82)
                type: reminder.kind === 'WEEKLY_PLAN' ? 'WEEKLY_PLAN_REMINDER' : 'SYSTEM',
                title: reminder.title,
                message: reminder.body,
                data: { href: reminder.href, reminderKind: reminder.kind },
            });
        },
    );
    console.log(`[MealReminders] Reminder ${job.data.reminderId}: ${result}`);
    return { result };
}
