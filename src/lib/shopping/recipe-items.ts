// Turns the ingredient lines of a recipe into shopping list inputs (KUC-104):
// scaled to the chosen servings, one input per line. Same ingredients are merged
// by addShoppingItems (one list entry per ingredient, amounts converted when it
// is safe). Pure functions; the data access is in meal-plan.ts and recipe.ts.
import { portionFactor, scaleQuantity } from '@app/lib/ingredients/quantities';

import type { AddItemInput } from './schemas';

export interface RecipeLine {
    /** RecipeIngredient.id */
    id: string;
    ingredientId: string;
    name: string;
    amount: string;
    /** Unit.shortName, e.g. "g", "EL", "Stk" */
    unit: string | null;
    isOptional: boolean;
    position: number;
}

export interface RecipeLineSelection {
    /** Only these lines (RecipeIngredient ids); default: all lines */
    lineIds?: readonly string[];
    /** Optional ingredients ("nach Belieben") are included unless this is false */
    includeOptional?: boolean;
}

export interface ShoppingInputContext {
    recipeId: string;
    /** Servings the recipe's amounts are written for */
    recipeServings: number;
    /** Servings to shop for */
    servings: number;
    mealPlanRecipeId?: string;
}

/** Lines to shop for, in recipe order. */
export function selectRecipeLines(
    lines: readonly RecipeLine[],
    selection: RecipeLineSelection = {},
): RecipeLine[] {
    const ids = selection.lineIds ? new Set(selection.lineIds) : null;
    return [...lines]
        .sort((a, b) => a.position - b.position)
        .filter((line) => (ids ? ids.has(line.id) : true))
        .filter((line) => selection.includeOptional !== false || !line.isOptional);
}

/**
 * Amount of one line for the chosen servings. Numbers and ranges are scaled
 * ("2-3" for 4 servings → "4–6" for 8); free text ("nach Geschmack") stays.
 */
export function scaledAmount(line: Pick<RecipeLine, 'amount'>, factor: number): string {
    return scaleQuantity(line.amount.trim(), factor);
}

export function buildShoppingInputs(
    lines: readonly RecipeLine[],
    context: ShoppingInputContext,
): AddItemInput[] {
    const factor = portionFactor(context.servings, context.recipeServings);
    return lines.map((line) => ({
        ingredientId: line.ingredientId,
        name: line.name,
        amount: scaledAmount(line, factor) || null,
        unit: line.unit,
        kind: context.mealPlanRecipeId ? 'MEAL_PLAN' : 'RECIPE',
        recipeId: context.recipeId,
        mealPlanRecipeId: context.mealPlanRecipeId ?? null,
        servings: context.servings,
    }));
}
