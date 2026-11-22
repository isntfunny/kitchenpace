// Wrapper of the plan server actions on top of the shared action runner (KUC-137).
// Not a 'use server' module itself.
import { DataAccessError } from '@app/lib/meal-plan/db';
import { createActionRunner, type ActionResult } from '@app/lib/server-action.server';
import { addSyncMealRemindersJob } from '@worker/queues/index';

type PlanCode = 'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'INVALID' | 'FAILED';

export type PlanActionResult<T> = ActionResult<T, PlanCode>;

/**
 * Re-plans the user's reminders (KUC-109) right after a plan change instead of waiting
 * for the 15-minute reconcile. Never fails the action.
 */
export function scheduleReminderSync(userId: string): void {
    addSyncMealRemindersJob(userId).catch((error) =>
        console.error('[meal-plan] scheduling the reminder sync failed', error),
    );
}

export const run = createActionRunner<'INVALID'>({
    scope: 'meal-plan',
    rateLimit: 'mealPlan',
    logLabel: '[meal-plan] action failed',
    invalidCode: 'INVALID',
    failedMessage: 'Das hat nicht geklappt. Bitte versuche es erneut.',
    // A conflict or invalid change is the user's input: show the message as INVALID
    mapError: (error) =>
        error instanceof DataAccessError && error.code !== 'NOT_FOUND'
            ? { ok: false, code: 'INVALID', error: error.message }
            : undefined,
});

/** `run` for actions that change plan entries, times or slots: also re-plans reminders. */
export function runWrite<T>(work: (userId: string) => Promise<T>): Promise<PlanActionResult<T>> {
    return run(work, { after: scheduleReminderSync });
}
