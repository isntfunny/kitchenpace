// Personal parts of the shared recipe search: the week plan quick filter (KUC-131) and the
// pantry of the sort "Verbraucht meine Reste" (KUC-132). Everything is read from the user's
// own data on the server; the client only sends its choice.
import 'server-only';

import type { Db } from '@app/lib/meal-plan/db';
import { getMealPlanSettings } from '@app/lib/meal-plan/repository';
import { DEFAULT_HOUSEHOLD_SIZE } from '@app/lib/meal-plan/slots';
import { toDbDate, weekStartFor } from '@app/lib/meal-plan/week';
import type { WeekPlanSearchData } from '@app/lib/recipeSearchQuery';
import { NO_PERSONAL_SEARCH, type PersonalSearchFlags } from '@app/lib/recipeSearchTypes';
import { addDays, toBerlinDate } from '@shared/dates';
import type { PantryStock } from '@shared/meal-planning/leftover-score';
import { deriveMainIngredients } from '@shared/meal-planning/main-ingredients';
import type { BaseUnit } from '@shared/meal-planning/types';
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

const PANTRY_UNIT: Record<'G' | 'ML' | 'PIECE', BaseUnit> = { G: 'g', ML: 'ml', PIECE: 'Stk' };

/** Pantry posts that can be used up: linked to an ingredient, with an amount in a base unit */
const usablePantryWhere = (userId: string) => ({
    userId,
    status: 'AVAILABLE' as const,
    ingredientId: { not: null },
    quantity: { gt: 0 },
    baseUnit: { not: null },
    OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date(`${toBerlinDate(new Date())}T00:00:00Z`) } },
    ],
});

export type PantrySearchData = {
    stock: PantryStock[];
    /** Index names (`ingredients`) of the pantry ingredients, for the candidate search */
    indexNames: string[];
    /** Eaters of one meal: recipe amounts are scaled to this */
    household: number;
};

/** The user's usable pantry for the sort "Verbraucht meine Reste" (KUC-132). */
export async function loadPantrySearchData(
    userId: string,
    db: Db = prisma,
): Promise<PantrySearchData> {
    const [posts, settings] = await Promise.all([
        db.pantryItem.findMany({
            where: usablePantryWhere(userId),
            select: {
                ingredientId: true,
                quantity: true,
                baseUnit: true,
                expiresAt: true,
                ingredient: {
                    select: {
                        name: true,
                        normalizedName: true,
                        ingredientUnits: {
                            where: { unit: { shortName: 'Stk' } },
                            select: { grams: true },
                        },
                    },
                },
            },
        }),
        getMealPlanSettings(db, userId),
    ]);
    const today = toBerlinDate(new Date());
    const stock: PantryStock[] = [];
    const indexNames = new Set<string>();
    for (const post of posts) {
        if (!post.ingredientId || !post.ingredient || !post.baseUnit || !post.quantity) continue;
        const expiresOn = post.expiresAt ? toBerlinDate(post.expiresAt) : undefined;
        if (expiresOn && expiresOn < today) continue; // spoiled: never suggested
        stock.push({
            ingredientId: post.ingredientId,
            name: post.ingredient.normalizedName?.trim() || post.ingredient.name,
            amountBase: post.quantity,
            unitBase: PANTRY_UNIT[post.baseUnit],
            expiresOn,
            gramsPerPiece: post.ingredient.ingredientUnits[0]?.grams ?? null,
        });
        indexNames.add(post.ingredient.name);
    }
    return {
        stock,
        indexNames: [...indexNames],
        household: settings.householdSize ?? DEFAULT_HOUSEHOLD_SIZE,
    };
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
        const [planned, pantry] = await Promise.all([
            db.mealPlanRecipe.count({
                where: {
                    userId,
                    date: { gte: toDbDate(start), lte: toDbDate(addDays(start, 6)) },
                },
            }),
            db.pantryItem.count({ where: usablePantryWhere(userId) }),
        ]);
        return { hasPlan: planned > 0, hasPantry: pantry > 0 };
    } catch {
        return NO_PERSONAL_SEARCH;
    }
}
