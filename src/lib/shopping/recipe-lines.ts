// Data access for the recipe ingredient lines used by the shopping list (KUC-104).
import { type Db, notFound } from '@app/lib/meal-plan/db';

import type { RecipeLine } from './recipe-items';

export interface RecipeLines {
    recipeId: string;
    servings: number;
    lines: RecipeLine[];
}

/**
 * Ingredient lines and base servings of recipes the user may see (published, or
 * their own). A recipe that is not visible is reported as missing, unless
 * `lenient` is set: then it is left out of the result.
 */
export async function loadRecipeLines(
    db: Db,
    userId: string,
    recipeIds: readonly string[],
    options: { lenient?: boolean } = {},
): Promise<Map<string, RecipeLines>> {
    const ids = [...new Set(recipeIds)];
    if (ids.length === 0) return new Map();
    const recipes = await db.recipe.findMany({
        where: { id: { in: ids }, OR: [{ status: 'PUBLISHED' }, { authorId: userId }] },
        select: { id: true, servings: true },
    });
    if (recipes.length !== ids.length && !options.lenient) throw notFound('Rezept');
    const rows = await db.recipeIngredient.findMany({
        where: { recipeId: { in: recipes.map((recipe) => recipe.id) } },
        select: {
            id: true,
            recipeId: true,
            ingredientId: true,
            amount: true,
            isOptional: true,
            position: true,
            ingredient: { select: { name: true, normalizedName: true } },
            unit: { select: { shortName: true } },
        },
    });
    return new Map(
        recipes.map((recipe) => [
            recipe.id,
            {
                recipeId: recipe.id,
                servings: recipe.servings,
                lines: rows
                    .filter((row) => row.recipeId === recipe.id)
                    .map((row) => ({
                        id: row.id,
                        ingredientId: row.ingredientId,
                        // Display name (KUC-114) when there is one
                        name: row.ingredient.normalizedName?.trim() || row.ingredient.name,
                        amount: row.amount,
                        unit: row.unit?.shortName ?? null,
                        isOptional: row.isOptional,
                        position: row.position,
                    })),
            },
        ]),
    );
}
