'use server';

// Server actions for editing the plan (KUC-101) and "Gekocht" (KUC-103).
import { z } from 'zod';

import { fireEvent } from '@app/lib/events/fire';
import {
    cookMealPlanEntry,
    skipMealPlanEntry,
    uncookMealPlanEntry,
    type CookResult,
} from '@app/lib/meal-plan/cook';
import {
    applyMealPlanTemplate,
    cookForTwoMeals,
    copyMealPlanDays,
    deleteMealPlanTemplate,
    listMealPlanTemplates,
    moveMealPlanEntry,
    previewCopyDays,
    previewMealPlanTemplate,
    removeLeftover,
    saveMealPlanTemplate,
    swapMealPlanCells,
} from '@app/lib/meal-plan/edit';
import {
    deleteMealPlanEntry,
    getMealPlanSettings,
    restoreMealPlanEntry,
    updateMealPlanEntry,
} from '@app/lib/meal-plan/repository';
import { idSchema, notesSchema, servingsSchema } from '@app/lib/meal-plan/schemas';
import { timeSchema } from '@app/lib/meal-plan/slots';
import { bookCookedEntry } from '@app/lib/pantry/book';
import { todayIn } from '@shared/dates';
import { prisma } from '@shared/prisma';

import { run, runWrite } from './run';

/** Only what the entry sheet edits; moving goes through movePlanEntry */
const entryFieldsSchema = z
    .object({
        servings: servingsSchema,
        time: timeSchema.nullable(),
        notes: notesSchema.nullable(),
    })
    .partial()
    .strict();

export async function updatePlanEntry(entryId: string, input: unknown) {
    return runWrite(async (userId) => {
        const fields = entryFieldsSchema.parse(input);
        if (fields.notes === '') fields.notes = null;
        const entry = await updateMealPlanEntry(prisma, userId, idSchema.parse(entryId), fields);
        return { id: entry.id };
    });
}

export async function movePlanEntry(entryId: string, input: unknown) {
    return runWrite(async (userId) => {
        const entry = await moveMealPlanEntry(prisma, userId, idSchema.parse(entryId), input);
        return { id: entry.id };
    });
}

export async function swapPlanCells(input: unknown) {
    return runWrite((userId) => swapMealPlanCells(prisma, userId, input));
}

/** Returns the snapshot for "Rückgängig" */
export async function deletePlanEntry(entryId: string) {
    return runWrite((userId) => deleteMealPlanEntry(prisma, userId, idSchema.parse(entryId)));
}

export async function restorePlanEntry(snapshot: unknown) {
    return runWrite(async (userId) => {
        const entry = await restoreMealPlanEntry(prisma, userId, snapshot);
        return { id: entry.id };
    });
}

export async function cookPlanEntryForTwo(entryId: string, target: unknown) {
    return runWrite((userId) => cookForTwoMeals(prisma, userId, idSchema.parse(entryId), target));
}

export async function undoCookForTwo(leftoverId: string, originServings: unknown) {
    return runWrite((userId) =>
        removeLeftover(prisma, userId, idSchema.parse(leftoverId), originServings),
    );
}

export async function previewPlanCopy(input: unknown) {
    return run((userId) => previewCopyDays(prisma, userId, input));
}

export async function copyPlanDays(input: unknown) {
    return runWrite((userId) => copyMealPlanDays(prisma, userId, input));
}

export async function getPlanTemplates() {
    return run((userId) => listMealPlanTemplates(prisma, userId));
}

export async function savePlanTemplate(input: unknown) {
    return run((userId) => saveMealPlanTemplate(prisma, userId, input));
}

export async function previewPlanTemplate(input: unknown) {
    return run((userId) => previewMealPlanTemplate(prisma, userId, input));
}

export async function applyPlanTemplate(input: unknown) {
    return runWrite((userId) => applyMealPlanTemplate(prisma, userId, input));
}

export async function deletePlanTemplate(templateId: string) {
    return run((userId) => deleteMealPlanTemplate(prisma, userId, idSchema.parse(templateId)));
}

export interface CookedResult extends CookResult {
    /** false when the pantry booking failed; the dish is marked cooked anyway */
    pantryBooked: boolean;
}

/**
 * "Gekocht": cook history and cookCount once per entry, then the pantry booking.
 * A failing booking never blocks the mark; the nightly job books it later.
 */
export async function markPlanEntryCooked(entryId: string) {
    return runWrite(async (userId): Promise<CookedResult> => {
        const id = idSchema.parse(entryId);
        const now = new Date();
        const settings = await getMealPlanSettings(prisma, userId);
        const result = await cookMealPlanEntry(
            prisma,
            userId,
            id,
            now,
            todayIn(settings.timezone, now),
        );

        let pantryBooked = true;
        try {
            await bookCookedEntry(prisma, userId, id, now);
        } catch (error) {
            pantryBooked = false;
            console.error('[meal-plan] pantry booking after "Gekocht" failed', error);
        }

        if (result.counted) await announceCook(userId, result.recipeId, result.cookHistoryId);
        return { ...result, pantryBooked };
    });
}

/** Same activity and author notification as the recipe page "Gekocht" */
async function announceCook(userId: string, recipeId: string, cookHistoryId: string | null) {
    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { id: true, slug: true, title: true, authorId: true },
        });
        if (!recipe) return;
        const servings = cookHistoryId
            ? (
                  await prisma.userCookHistory.findUnique({
                      where: { id: cookHistoryId },
                      select: { servings: true },
                  })
              )?.servings
            : undefined;
        await fireEvent({
            event: 'recipeCooked',
            actorId: userId,
            recipientId: recipe.authorId,
            data: {
                recipeId,
                recipeTitle: recipe.title,
                hasImage: false,
                servings: servings ?? undefined,
            },
            revalidatePaths: [
                ...new Set([`/recipe/${recipe.id}`, `/recipe/${recipe.slug ?? recipe.id}`]),
            ],
        });
    } catch (error) {
        console.error('[meal-plan] cook event failed', error);
    }
}

export async function unmarkPlanEntryCooked(entryId: string) {
    return runWrite((userId) => uncookMealPlanEntry(prisma, userId, idSchema.parse(entryId)));
}

/** "Nicht gekocht" for a past dish */
export async function skipPlanEntry(entryId: string) {
    return runWrite((userId) => skipMealPlanEntry(prisma, userId, idSchema.parse(entryId)));
}
