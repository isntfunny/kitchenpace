// Adding recipes and plan entries to the shopping list (KUC-104). Built on
// addShoppingItems: one entry per ingredient, amounts merged, a bought entry
// returns to "open".
import { z } from 'zod';

import { type Db, notFound } from '@app/lib/meal-plan/db';
import { userIdSchema } from '@app/lib/meal-plan/schemas';
import { idSchema, servingsSchema } from '@app/lib/schemas';

import { buildShoppingInputs, selectRecipeLines, type RecipeLineSelection } from './recipe-items';
import { loadRecipeLines } from './recipe-lines';
import { addShoppingItems } from './repository';

export interface AddToListResult {
    /** Number of recipe lines added (several lines can end up in one entry) */
    added: number;
    itemIds: string[];
    /** Plan entries left out because their recipe is no longer available (unpublished) */
    skipped: string[];
}

/** "Zur Einkaufsliste" on the recipe page: the recipe's ingredients for `servings`. */
export async function addRecipeToList(
    db: Db,
    userId: string,
    recipeId: string,
    servings: number,
    selection: RecipeLineSelection = {},
): Promise<AddToListResult> {
    const owner = userIdSchema.parse(userId);
    const id = idSchema.parse(recipeId);
    const portions = servingsSchema.parse(servings);
    const recipe = (await loadRecipeLines(db, owner, [id])).get(id);
    if (!recipe) throw notFound('Rezept');

    const lines = selectRecipeLines(recipe.lines, selection);
    if (lines.length === 0) return { added: 0, itemIds: [], skipped: [] };
    const items = await addShoppingItems(
        db,
        owner,
        buildShoppingInputs(lines, {
            recipeId: id,
            recipeServings: recipe.servings,
            servings: portions,
        }),
    );
    return { added: lines.length, itemIds: items.map((item) => item.id), skipped: [] };
}

/**
 * Plan entries (MEAL_PLAN source) with the servings planned for each: the
 * ingredients of every entry's recipe. The same entry never adds its amount
 * twice; ownership of the entries is checked. Entries whose recipe is no longer
 * available (unpublished, deleted) are skipped and listed in `skipped`.
 */
export async function addMealPlanEntriesToList(
    db: Db,
    userId: string,
    entryIds: readonly string[],
    selection: RecipeLineSelection = {},
): Promise<AddToListResult> {
    const owner = userIdSchema.parse(userId);
    const ids = [...new Set(z.array(idSchema).min(1).max(200).parse(entryIds))];
    const found = await db.mealPlanRecipe.findMany({
        where: { id: { in: ids }, userId: owner },
        select: { id: true, recipeId: true, servings: true, leftoverOfId: true },
    });
    if (found.length !== ids.length) throw notFound('Eintrag');
    // Leftover meals (KUC-101) are covered by the doubled servings of their original
    const entries = found.filter((entry) => !entry.leftoverOfId);
    if (entries.length === 0) return { added: 0, itemIds: [], skipped: [] };
    const recipes = await loadRecipeLines(
        db,
        owner,
        entries.map((entry) => entry.recipeId),
        { lenient: true },
    );

    const skipped = entries
        .filter((entry) => !recipes.has(entry.recipeId))
        .map((entry) => entry.id);
    const inputs = entries.flatMap((entry) => {
        const recipe = recipes.get(entry.recipeId);
        if (!recipe) return [];
        return buildShoppingInputs(selectRecipeLines(recipe.lines, selection), {
            recipeId: entry.recipeId,
            recipeServings: recipe.servings,
            servings: entry.servings,
            mealPlanRecipeId: entry.id,
        });
    });
    if (inputs.length === 0) return { added: 0, itemIds: [], skipped };
    const items = await addShoppingItems(db, owner, inputs);
    return { added: inputs.length, itemIds: items.map((item) => item.id), skipped };
}
