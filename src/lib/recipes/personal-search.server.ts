// Personal parts of the shared recipe search: the week plan quick filter (KUC-131). Everything
// is read from the user's own data on the server; the client only sends its choice.
import 'server-only';

import type { Db } from '@app/lib/meal-plan/db';
import { getMealPlanSettings } from '@app/lib/meal-plan/repository';
import { toDbDate, weekStartFor } from '@app/lib/meal-plan/week';
import type { WeekPlanSearchData } from '@app/lib/recipeSearchQuery';
import { NO_PERSONAL_SEARCH, type PersonalSearchFlags } from '@app/lib/recipeSearchTypes';
import { addDays, toBerlinDate } from '@shared/dates';
import { deriveMainIngredients } from '@shared/meal-planning/main-ingredients';
import { prisma } from '@shared/prisma';

import { MAIN_INGREDIENT_LINE_SELECT, toMainIngredientLines } from './main-ingredient-lines';

/** First day of the week the filter looks at: the given one, else the user's current week. */
async function resolveWeekStart(db: Db, userId: string, week?: string): Promise<string> {
    if (week) return week;
    const settings = await getMealPlanSettings(db, userId);
    return weekStartFor(toBerlinDate(new Date()), settings.weekStartDay);
}

/** Distinct recipe ids planned in the 7 days from `start`. */
async function plannedRecipeIds(db: Db, userId: string, start: string): Promise<string[]> {
    const entries = await db.mealPlanRecipe.findMany({
        where: {
            userId,
            date: { gte: toDbDate(start), lte: toDbDate(addDays(start, 6)) },
        },
        select: { recipeId: true },
    });
    return [...new Set(entries.map((entry) => entry.recipeId))];
}

/** Main ingredients and recipe ids of the user's planned week (KUC-131). */
export async function loadWeekPlanSearchData(
    userId: string,
    week?: string,
    db: Db = prisma,
): Promise<WeekPlanSearchData> {
    const start = await resolveWeekStart(db, userId, week);
    const recipeIds = await plannedRecipeIds(db, userId, start);
    if (recipeIds.length === 0) return { mainIngredients: [], recipeIds };
    const recipes = await db.recipe.findMany({
        where: { id: { in: recipeIds } },
        select: { recipeIngredients: { select: MAIN_INGREDIENT_LINE_SELECT } },
    });
    const mainIngredients = new Set(
        recipes.flatMap((recipe) =>
            deriveMainIngredients(toMainIngredientLines(recipe.recipeIngredients)),
        ),
    );
    return { mainIngredients: [...mainIngredients], recipeIds };
}

/** Flags for the search UI; guests get none. */
export async function loadPersonalSearchFlags(
    userId: string | null | undefined,
    week?: string,
    db: Db = prisma,
): Promise<PersonalSearchFlags> {
    if (!userId) return NO_PERSONAL_SEARCH;
    try {
        const start = await resolveWeekStart(db, userId, week);
        const planned = await db.mealPlanRecipe.count({
            where: {
                userId,
                date: { gte: toDbDate(start), lte: toDbDate(addDays(start, 6)) },
            },
        });
        return { hasPlan: planned > 0, hasPantry: false };
    } catch {
        return NO_PERSONAL_SEARCH;
    }
}
