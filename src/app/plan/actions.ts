'use server';

import { z } from 'zod';

import { recipesForSlot } from '@app/lib/meal-plan/picker';
import {
    addMealPlanEntry,
    getMealPlanSettings,
    listMealPlanEntries,
    setWeekSlotOverride,
    updateMealPlanSettings,
    type MealPlanSettings,
} from '@app/lib/meal-plan/repository';
import { isoDateSchema } from '@app/lib/meal-plan/schemas';
import { weekRange, weekStartFor } from '@app/lib/meal-plan/week';
import { idSchema } from '@app/lib/schemas';
import { todayIn } from '@shared/dates';
import { monthGridRange, type CalendarEntry } from '@shared/meal-planning/calendar-days';
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
    categories: { select: { category: { select: { slug: true } } } },
    tags: { select: { tag: { select: { name: true } } } },
} as const;

type PickerRow = {
    id: string;
    slug: string;
    title: string;
    imageKey: string | null;
    totalTime: number | null;
    rating: number | null;
    categories: { category: { slug: string } | null }[];
    tags: { tag: { name: string } | null }[];
};

const toPicker = ({ categories, tags, ...recipe }: PickerRow) => ({
    ...(recipe as PickerRecipe),
    categorySlugs: categories.flatMap((c) => (c.category ? [c.category.slug] : [])),
    tags: tags.flatMap((t) => (t.tag ? [t.tag.name] : [])),
});

const LIST_SIZE = 24;
const pickerSlotSchema = z
    .object({ slotKey: z.string().min(1).max(80), time: z.string().max(5) })
    .strict()
    .optional();

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

const monthSchema = z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .refine((month) => month >= '2000-01' && month <= '2100-12');

/**
 * Plan entries of the weeks that make up one calendar month, for the day markers of
 * "Hinzufügen zu …" (KUC-130). Only what the markers need, no recipe data.
 */
export async function getPlanMonth(input: unknown) {
    return run(async (userId): Promise<{ entries: CalendarEntry[] }> => {
        const { month } = z.object({ month: monthSchema }).strict().parse(input);
        const settings = await getMealPlanSettings(prisma, userId);
        const entries = await listMealPlanEntries(
            prisma,
            userId,
            monthGridRange(month, settings.weekStartDay),
        );
        return {
            entries: entries.map((entry) => ({
                date: entry.date.toISOString().slice(0, 10),
                slot: entry.slot,
                recipeId: entry.recipeId,
            })),
        };
    });
}

/**
 * Favorites and recently cooked recipes for the slot search (KUC-100); with a slot only
 * recipes allowed for its meal kind (KUC-126), so no sauce is offered as dinner.
 */
export async function getPickerLists(input?: { slotKey: string; time: string }) {
    return run(async (userId) => {
        const slot = pickerSlotSchema.parse(input);
        const visible = {
            OR: [{ status: 'PUBLISHED' as const }, { authorId: userId }],
            moderationStatus: { not: 'REJECTED' as const },
        };
        const [favorites, cooked] = await Promise.all([
            prisma.favorite.findMany({
                where: { userId, recipe: visible },
                orderBy: { createdAt: 'desc' },
                take: 80,
                select: { recipe: { select: pickerSelect } },
            }),
            prisma.userCookHistory.findMany({
                where: { userId, recipe: visible },
                orderBy: { cookedAt: 'desc' },
                take: 120,
                select: { recipe: { select: pickerSelect } },
            }),
        ]);
        const seen = new Set<string>();
        const recentlyCooked = cooked
            .map((row) => row.recipe)
            .filter((recipe) => !seen.has(recipe.id) && !!seen.add(recipe.id));
        const forSlot = (rows: PickerRow[]): PickerRecipe[] =>
            recipesForSlot(rows.map(toPicker), slot)
                .slice(0, LIST_SIZE)
                .map(({ categorySlugs: _c, tags: _t, ...recipe }) => recipe);
        return {
            favorites: forSlot(favorites.map((row) => row.recipe)),
            recentlyCooked: forSlot(recentlyCooked),
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
