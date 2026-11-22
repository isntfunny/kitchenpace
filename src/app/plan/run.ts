// Shared wrapper of the plan server actions: session, ban, rate limit and error
// mapping to a German message. Not a 'use server' module itself.
import { z } from 'zod';

import { getServerAuthSession } from '@app/lib/auth';
import { DataAccessError } from '@app/lib/meal-plan/db';
import { checkRateLimit } from '@app/lib/rate-limit';
import { addSyncMealRemindersJob } from '@worker/queues/index';

export type PlanActionResult<T> =
    | { ok: true; data: T }
    | {
          ok: false;
          code: 'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'INVALID' | 'FAILED';
          error: string;
      };

/**
 * Re-plans the user's reminders (KUC-109) right after a plan change instead of waiting
 * for the 15-minute reconcile. Never fails the action.
 */
export function scheduleReminderSync(userId: string): void {
    addSyncMealRemindersJob(userId).catch((error) =>
        console.error('[meal-plan] scheduling the reminder sync failed', error),
    );
}

/** `run` for actions that change plan entries, times or slots: also re-plans reminders. */
export async function runWrite<T>(
    work: (userId: string) => Promise<T>,
): Promise<PlanActionResult<T>> {
    return run(async (userId) => {
        const data = await work(userId);
        scheduleReminderSync(userId);
        return data;
    });
}

export async function run<T>(work: (userId: string) => Promise<T>): Promise<PlanActionResult<T>> {
    try {
        const session = await getServerAuthSession('meal-plan');
        if (!session?.user?.id || session.user.role === 'banned' || session.user.banned)
            return { ok: false, code: 'SIGN_IN', error: 'Bitte melde dich an.' };
        const limit = await checkRateLimit('mealPlan', session.user.id);
        if (!limit.allowed)
            return {
                ok: false,
                code: 'RATE_LIMIT',
                error: 'Zu viele Anfragen. Bitte warte einen Moment.',
            };
        return { ok: true, data: await work(session.user.id) };
    } catch (error) {
        if (error instanceof z.ZodError)
            return { ok: false, code: 'INVALID', error: 'Bitte prüfe deine Eingaben.' };
        if (error instanceof DataAccessError)
            return {
                ok: false,
                code: error.code === 'NOT_FOUND' ? 'NOT_FOUND' : 'INVALID',
                error: error.message,
            };
        console.error('[meal-plan] action failed', error);
        return {
            ok: false,
            code: 'FAILED',
            error: 'Das hat nicht geklappt. Bitte versuche es erneut.',
        };
    }
}
