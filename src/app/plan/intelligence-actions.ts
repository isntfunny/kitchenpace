'use server';

import { z } from 'zod';

import { DataAccessError } from '@app/lib/meal-plan/db';
import { leftoverPlanSlot } from '@app/lib/meal-plan/intelligence/mappers';
import {
    applyShelfLifeOrder,
    previewShelfLifeOrder,
    type ShelfLifeProposalDTO,
} from '@app/lib/meal-plan/intelligence/week-planner';
import {
    addMealPlanEntry,
    getMealPlanSettings,
    listMealPlanEntries,
    updateMealPlanEntry,
} from '@app/lib/meal-plan/repository';
import { idSchema, isoDateSchema } from '@app/lib/meal-plan/schemas';
import { dismissLeftoverHint } from '@app/lib/pantry/repository';
import { ActionError, createActionRunner, type ActionResult } from '@app/lib/server-action.server';
import { prisma } from '@shared/prisma';

import { scheduleReminderSync } from './run';

// Server actions of the plan helpers (KUC-96, KUC-108, KUC-113). Suggestions and previews
// only read; entries are written only by the accept/apply/plan actions after a user tap.

type Result<T> = ActionResult<
    T,
    'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'INVALID' | 'STALE' | 'FAILED'
>;

const STALE_MESSAGE = 'Der Plan hat sich geändert. Bitte öffne den Vorschlag noch einmal.';

const run = createActionRunner<'INVALID' | 'STALE'>({
    scope: 'meal-plan',
    rateLimit: 'mealPlan',
    logLabel: '[meal-plan] helper action failed',
    invalidCode: 'INVALID',
    failedMessage: 'Das hat nicht geklappt. Bitte versuche es erneut.',
    // Only a missing row is shown as such; any other data error counts as unexpected
    mapError: (error, unexpected) =>
        error instanceof DataAccessError && error.code !== 'NOT_FOUND'
            ? unexpected(error)
            : undefined,
});

/** `run` for actions that write plan entries: also re-plans reminders (KUC-109). */
function runWrite<T>(work: (userId: string) => Promise<T>): Promise<Result<T>> {
    return run(work, { after: scheduleReminderSync });
}

const weekInput = z.object({ startDate: isoDateSchema }).strict();
/** "Nach Haltbarkeit ordnen": the proposal with reasons. Writes nothing. */
export async function previewShelfLifeOrderAction(
    input: unknown,
): Promise<Result<ShelfLifeProposalDTO>> {
    return run(async (userId) => {
        const { startDate } = weekInput.parse(input);
        return previewShelfLifeOrder(prisma, userId, startDate);
    });
}

/** Applies the confirmed proposal; refuses if the plan changed since the preview. */
export async function applyShelfLifeOrderAction(
    input: unknown,
): Promise<Result<{ moved: number }>> {
    return runWrite(async (userId) => {
        const { startDate, signature } = weekInput
            .extend({ signature: z.string().max(4000) })
            .parse(input);
        const outcome = await prisma.$transaction((tx) =>
            applyShelfLifeOrder(tx, userId, startDate, signature, (entryId, to) =>
                updateMealPlanEntry(tx, userId, entryId, to),
            ),
        );
        if ('stale' in outcome) throw new ActionError('STALE', STALE_MESSAGE);
        return outcome;
    });
}

/** "Einplanen" on a leftover hint: the recipe lands on the suggested day. */
export async function planLeftoverRecipeAction(
    input: unknown,
): Promise<Result<{ date: string; slot: string }>> {
    return runWrite(async (userId) => {
        const { recipeId, date } = z
            .object({ recipeId: idSchema, date: isoDateSchema })
            .strict()
            .parse(input);
        const [settings, entries] = await Promise.all([
            getMealPlanSettings(prisma, userId),
            listMealPlanEntries(prisma, userId, { from: date, to: date }),
        ]);
        const slot = leftoverPlanSlot(
            date,
            settings.slots.filter((s) => s.enabled).map((s) => s.key),
            entries.map((e) => ({ date, slot: e.slot, status: e.status })),
        );
        await addMealPlanEntry(prisma, userId, { recipeId, date, slot });
        return { date, slot };
    });
}

/** "Ablehnen": the hint for this leftover does not come back. */
export async function dismissLeftoverAction(input: unknown): Promise<Result<{ id: string }>> {
    return run(async (userId) => {
        const { leftoverId } = z.object({ leftoverId: idSchema }).strict().parse(input);
        await dismissLeftoverHint(prisma, userId, leftoverId);
        return { id: leftoverId };
    });
}
