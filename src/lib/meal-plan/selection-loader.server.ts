// Real `loadPicks` for the week selection (KUC-126): ranking features plus the shortest
// shelf life of the required ingredients. Server only.
import 'server-only';

import { loadRankingRecipes } from '@app/lib/recipes/ranking-features.server';
import { loadShelfLifeDays } from '@shared/ingredient-shelf-life/storage-life';
import { prisma } from '@shared/prisma';
import { dishTypeOf } from '@shared/recipe-ranking/dish-type';
import { requiredIngredients } from '@shared/recipe-ranking/features';

import type { PickInfo } from './selection';

export async function loadPickInfo(recipeIds: string[]): Promise<Map<string, PickInfo>> {
    const recipes = await loadRankingRecipes(recipeIds);
    const ingredientIds = [
        ...new Set([...recipes.values()].flatMap((r) => requiredIngredients(r).map((i) => i.id))),
    ];
    const days = await loadShelfLifeDays(prisma, ingredientIds);
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
