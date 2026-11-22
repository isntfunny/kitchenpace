'use server';

import { z } from 'zod';

import {
    addMealPlanEntry,
    getMealPlanSettings,
    listMealPlanEntries,
    setWeekSlotOverride,
    updateMealPlanSettings,
    type MealPlanSettings,
} from '@app/lib/meal-plan/repository';
import { idSchema, isoDateSchema } from '@app/lib/meal-plan/schemas';
import { todayIn, weekRange, weekStartFor } from '@app/lib/meal-plan/week';
import { prisma } from '@shared/prisma';

import { run, runWrite } from './run';

export interface PickerRecipe {
    id: string;
    slug: string;
    title: string;
    imageKey: string | null;
    totalTime: number;
    rating: number;
}

const pickerSelect = {
    id: true,
    slug: true,
    title: true,
    imageKey: true,
    totalTime: true,
    rating: true,
} as const;

export interface PlanContext {
    settings: MealPlanSettings;
    today: string;
    weekStart: string;
    /** Where this recipe already lies in the requested week (KUC-100 hint) */
    placements: Array<{ date: string; slot: string }>;
}

/** Settings, today and placements of a recipe in one week for "Zum Plan". */
export async function getPlanContext(input: unknown) {
    return run(async (userId): Promise<PlanContext> => {
        const { recipeId, date } = z
            .object({ recipeId: idSchema.optional(), date: isoDateSchema.optional() })
            .strict()
            .parse(input ?? {});
        const settings = await getMealPlanSettings(prisma, userId);
        const today = todayIn(settings.timezone);
        const weekStart = weekStartFor(date ?? today, settings.weekStartDay);
        const entries = recipeId
            ? await listMealPlanEntries(prisma, userId, weekRange(weekStart))
            : [];
        return {
            settings,
            today,
            weekStart,
            placements: entries
                .filter((entry) => entry.recipeId === recipeId)
                .map((entry) => ({
                    date: entry.date.toISOString().slice(0, 10),
                    slot: entry.slot,
                })),
        };
    });
}

/** Favorites and recently cooked recipes for the slot search (KUC-100). */
export async function getPickerLists() {
    return run(async (userId) => {
        const visible = {
            OR: [{ status: 'PUBLISHED' as const }, { authorId: userId }],
            moderationStatus: { not: 'REJECTED' as const },
        };
        const [favorites, cooked] = await Promise.all([
            prisma.favorite.findMany({
                where: { userId, recipe: visible },
                orderBy: { createdAt: 'desc' },
                take: 24,
                select: { recipe: { select: pickerSelect } },
            }),
            prisma.userCookHistory.findMany({
                where: { userId, recipe: visible },
                orderBy: { cookedAt: 'desc' },
                take: 60,
                select: { recipe: { select: pickerSelect } },
            }),
        ]);
        const seen = new Set<string>();
        const recentlyCooked = cooked
            .map((row) => row.recipe)
            .filter((recipe) => !seen.has(recipe.id) && !!seen.add(recipe.id))
            .slice(0, 24);
        return {
            favorites: favorites.map((row) => row.recipe) as PickerRecipe[],
            recentlyCooked: recentlyCooked as PickerRecipe[],
        };
    });
}

/** Plans one or more dishes; the dialog's "Weitere hinzufügen" sends several. */
export async function addPlanEntries(input: unknown) {
    return runWrite(async (userId) => {
        const entries = z.array(z.unknown()).min(1).max(10).parse(input);
        const created = [];
        for (const entry of entries)
            created.push((await addMealPlanEntry(prisma, userId, entry)).id);
        return { ids: created };
    });
}

export async function savePlanSettings(input: unknown) {
    return runWrite((userId) => updateMealPlanSettings(prisma, userId, input));
}

/** Slot configuration for one week only; null restores the user default. */
export async function saveWeekSlots(input: unknown) {
    return runWrite(async (userId) => {
        const { startDate, slots } = z
            .object({ startDate: isoDateSchema, slots: z.unknown() })
            .strict()
            .parse(input);
        await setWeekSlotOverride(prisma, userId, startDate, slots ?? null);
        return { startDate };
    });
}
