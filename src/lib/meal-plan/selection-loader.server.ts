// Real `loadPicks` for the week selection (KUC-126): ranking features plus the shortest
// shelf life of the required ingredients. Server only.
import 'server-only';

import { loadRankingRecipes } from '@app/lib/recipes/ranking-features.server';
import { prisma } from '@shared/prisma';
import { dishTypeOf } from '@shared/recipe-ranking/dish-type';
import { requiredIngredients } from '@shared/recipe-ranking/features';

import type { PickInfo } from './selection';

/** Shelf life per ingredient: default storage, else fridge, else pantry (as KUC-96). */
async function shelfLifeDays(ingredientIds: string[]): Promise<Map<string, number>> {
    if (ingredientIds.length === 0) return new Map();
    const [ingredients, lives] = await Promise.all([
        prisma.ingredient.findMany({
            where: { id: { in: ingredientIds }, shelfLifeSource: { not: null } },
            select: { id: true, defaultStorage: true },
        }),
        prisma.ingredientStorageLife.findMany({
            where: { ingredientId: { in: ingredientIds } },
            select: { ingredientId: true, storage: true, days: true },
        }),
    ]);
    const days = new Map<string, number>();
    for (const ingredient of ingredients) {
        const own = lives.filter((life) => life.ingredientId === ingredient.id);
        const pick =
            own.find((life) => life.storage === ingredient.defaultStorage) ??
            own.find((life) => life.storage === 'FRIDGE') ??
            own.find((life) => life.storage === 'PANTRY');
        if (pick) days.set(ingredient.id, pick.days);
    }
    return days;
}

export async function loadPickInfo(recipeIds: string[]): Promise<Map<string, PickInfo>> {
    const recipes = await loadRankingRecipes(recipeIds);
    const ingredientIds = [
        ...new Set([...recipes.values()].flatMap((r) => requiredIngredients(r).map((i) => i.id))),
    ];
    const days = await shelfLifeDays(ingredientIds);
    return new Map(
        [...recipes.values()].map((recipe) => {
            const known = requiredIngredients(recipe).flatMap((i) =>
                days.has(i.id) ? [days.get(i.id)!] : [],
            );
            return [
                recipe.id,
                {
                    categorySlugs: recipe.categorySlugs,
                    tags: recipe.tags,
                    totalTime: recipe.totalTime,
                    difficulty: recipe.difficulty,
                    stepCount: recipe.stepCount,
                    // All mains share "hauptgericht": variety between days goes by dish type
                    mainCategory: null,
                    dishType: dishTypeOf(recipe),
                    shortestShelfLifeDays: known.length ? Math.min(...known) : null,
                },
            ];
        }),
    );
}
