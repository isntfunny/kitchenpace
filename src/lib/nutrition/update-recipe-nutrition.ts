import { prisma } from '@shared/prisma';

import { calculateRecipeNutrition, type IngredientNutritionInput } from './calculate';

/**
 * Calculate and store per-serving nutrition for a recipe.
 * Shared by createActions (single recipe save) and recalc-all (batch).
 */
/** Returns true if nutrition was calculable (calories !== null). */
export async function updateRecipeNutrition(recipeId: string, servings: number): Promise<boolean> {
    const recipeIngredients = await prisma.recipeIngredient.findMany({
        where: { recipeId },
        include: {
            ingredient: {
                include: {
                    ingredientUnits: { include: { unit: true } },
                },
            },
        },
    });

    const inputs: IngredientNutritionInput[] = recipeIngredients.map((ri) => {
        const iu = ri.ingredient.ingredientUnits.find(
            (iu) => iu.unit.shortName === ri.unit || iu.unit.longName === ri.unit,
        );
        return {
            name: ri.ingredient.name,
            amount: ri.amount,
            unitShortName: ri.unit,
            energyKcal: ri.ingredient.energyKcal,
            protein: ri.ingredient.protein,
            fat: ri.ingredient.fat,
            carbs: ri.ingredient.carbs,
            fiber: ri.ingredient.fiber,
            ingredientUnitGrams: iu?.grams ?? null,
            unitGramsDefault: iu?.unit.gramsDefault ?? null,
        };
    });

    const result = calculateRecipeNutrition(inputs);

    await prisma.recipe.update({
        where: { id: recipeId },
        data: {
            caloriesPerServing:
                result.calories !== null ? Math.round(result.calories / servings) : null,
            proteinPerServing:
                result.protein !== null ? Math.round((result.protein / servings) * 10) / 10 : null,
            fatPerServing:
                result.fat !== null ? Math.round((result.fat / servings) * 10) / 10 : null,
            carbsPerServing:
                result.carbs !== null ? Math.round((result.carbs / servings) * 10) / 10 : null,
            fiberPerServing:
                result.fiber !== null ? Math.round((result.fiber / servings) * 10) / 10 : null,
            nutritionCompleteness: result.completeness,
        },
    });

    return result.calories !== null;
}
