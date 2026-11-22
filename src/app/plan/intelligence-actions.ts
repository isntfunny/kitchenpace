'use server';

import { z } from 'zod';

import { getServerAuthSession } from '@app/lib/auth';
import { DataAccessError } from '@app/lib/meal-plan/db';
import { leftoverPlanSlot } from '@app/lib/meal-plan/intelligence/mappers';
import { loadTimeSeasonSets } from '@app/lib/meal-plan/intelligence/sets';
import {
    applyShelfLifeOrder,
    loadWeekContext,
    previewShelfLifeOrder,
    suggestForWeek,
    swapForWeek,
    type ShelfLifeProposalDTO,
    type SuggestionDTO,
    type WeekSuggestionsDTO,
} from '@app/lib/meal-plan/intelligence/week-planner';
import {
    addMealPlanEntry,
    getMealPlanSettings,
    listMealPlanEntries,
    updateMealPlanEntry,
} from '@app/lib/meal-plan/repository';
import { idSchema, isoDateSchema } from '@app/lib/meal-plan/schemas';
import { dismissLeftoverHint } from '@app/lib/pantry/repository';
import { checkRateLimit } from '@app/lib/rate-limit';
import { prisma } from '@shared/prisma';

import { scheduleReminderSync } from './run';

// Server actions of the plan helpers (KUC-96, KUC-108, KUC-113). Suggestions and previews
// only read; entries are written only by the accept/apply/plan actions after a user tap.

class StaleProposal extends Error {}

type Result<T> =
    | { ok: true; data: T }
    | {
          ok: false;
          code: 'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'INVALID' | 'STALE' | 'FAILED';
          error: string;
      };

/** `run` for actions that write plan entries: also re-plans reminders (KUC-109). */
function runWrite<T>(work: (userId: string) => Promise<T>): Promise<Result<T>> {
    return run(async (userId) => {
        const data = await work(userId);
        scheduleReminderSync(userId);
        return data;
    });
}

async function run<T>(work: (userId: string) => Promise<T>): Promise<Result<T>> {
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
        if (error instanceof StaleProposal)
            return {
                ok: false,
                code: 'STALE',
                error: 'Der Plan hat sich geändert. Bitte öffne den Vorschlag noch einmal.',
            };
        if (error instanceof z.ZodError)
            return { ok: false, code: 'INVALID', error: 'Bitte prüfe deine Eingaben.' };
        if (error instanceof DataAccessError && error.code === 'NOT_FOUND')
            return { ok: false, code: 'NOT_FOUND', error: error.message };
        console.error('[meal-plan] helper action failed', error);
        return {
            ok: false,
            code: 'FAILED',
            error: 'Das hat nicht geklappt. Bitte versuche es erneut.',
        };
    }
}

const slotType = z.enum(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER']);
const weekInput = z.object({ startDate: isoDateSchema }).strict();
const placement = z.object({ date: isoDateSchema, slot: slotType, recipeId: idSchema }).strict();

/** Proposal for the free slots of the week. Writes nothing. */
export async function planWeekAction(input: unknown): Promise<Result<WeekSuggestionsDTO>> {
    return run(async (userId) => {
        const { startDate, reroll } = weekInput
            .extend({ reroll: z.number().int().min(0).max(1000).optional() })
            .parse(input);
        return suggestForWeek(prisma, userId, startDate, await loadTimeSeasonSets(), { reroll });
    });
}

/** "Tauschen": the next best recipe for one suggested slot. Writes nothing. */
export async function swapSuggestionAction(input: unknown): Promise<Result<SuggestionDTO | null>> {
    return run(async (userId) => {
        const { startDate, current, target, rejected } = weekInput
            .extend({
                current: z.array(placement).max(60),
                target: z.object({ date: isoDateSchema, slot: slotType }).strict(),
                rejected: z.array(idSchema).max(200).default([]),
            })
            .parse(input);
        return swapForWeek(
            prisma,
            userId,
            startDate,
            await loadTimeSeasonSets(),
            current,
            target,
            rejected,
        );
    });
}

/**
 * "Übernehmen" / "Alle übernehmen": plans the accepted suggestions. Slots that were filled
 * in the meantime are skipped, nothing is overwritten.
 */
export async function acceptSuggestionsAction(
    input: unknown,
): Promise<Result<{ planned: number; skipped: number }>> {
    return runWrite(async (userId) => {
        const { startDate, suggestions } = weekInput
            .extend({ suggestions: z.array(placement).min(1).max(30) })
            .parse(input);
        const ctx = await loadWeekContext(prisma, userId, startDate);
        let planned = 0;
        let skipped = 0;
        for (const suggestion of suggestions) {
            const taken = ctx.entries.some(
                (e) =>
                    e.date === suggestion.date &&
                    e.slot === suggestion.slot &&
                    e.status !== 'CANCELLED',
            );
            if (taken || !ctx.days.includes(suggestion.date)) {
                skipped++;
                continue;
            }
            await addMealPlanEntry(prisma, userId, suggestion);
            planned++;
        }
        return { planned, skipped };
    });
}

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
        if ('stale' in outcome) throw new StaleProposal();
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
