import { parseAmount } from '@app/lib/ingredient-display';

export interface IngredientNutritionInput {
    name: string;
    amount: string;
    unitShortName: string;
    energyKcal: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    fiber: number | null;
    /** Ingredient-specific grams for this unit (from IngredientUnit.grams) */
    ingredientUnitGrams: number | null;
    /** Default grams for this unit (from Unit.gramsDefault) */
    unitGramsDefault: number | null;
}

export interface NutritionResult {
    calories: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    fiber: number | null;
    completeness: number;
    missingIngredients: string[];
}

/**
 * Calculate total recipe nutrition from ingredients.
 * Returns totals (not per-serving — caller divides by servings).
 */
export function calculateRecipeNutrition(ingredients: IngredientNutritionInput[]): NutritionResult {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    let totalFiber = 0;
    let calculable = 0;
    const missingIngredients: string[] = [];

    for (const ing of ingredients) {
        const amount = parseAmount(ing.amount);
        if (amount === null || amount <= 0) {
            missingIngredients.push(ing.name);
            continue;
        }

        // Resolve grams: ingredient-specific override → unit default → null
        const gramsPerUnit = ing.ingredientUnitGrams ?? ing.unitGramsDefault;
        if (gramsPerUnit === null) {
            missingIngredients.push(ing.name);
            continue;
        }

        const gramsAmount = amount * gramsPerUnit;

        // Use strict null check: 0 kcal is valid (e.g. salt)
        if (ing.energyKcal === null) {
            missingIngredients.push(ing.name);
            continue;
        }

        // All checks passed — this ingredient is calculable
        calculable++;
        totalCalories += (ing.energyKcal * gramsAmount) / 100;
        totalProtein += ((ing.protein ?? 0) * gramsAmount) / 100;
        totalFat += ((ing.fat ?? 0) * gramsAmount) / 100;
        totalCarbs += ((ing.carbs ?? 0) * gramsAmount) / 100;
        totalFiber += ((ing.fiber ?? 0) * gramsAmount) / 100;
    }

    const completeness = ingredients.length > 0 ? calculable / ingredients.length : 0;

    // If less than half the ingredients are calculable, return null
    if (completeness < 0.5) {
        return {
            calories: null,
            protein: null,
            fat: null,
            carbs: null,
            fiber: null,
            completeness,
            missingIngredients,
        };
    }

    return {
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fiber: Math.round(totalFiber * 10) / 10,
        completeness,
        missingIngredients,
    };
}
