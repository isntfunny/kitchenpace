/**
 * Batch recalculate nutrition for all recipes.
 * Run after BLS data import or when ingredient nutrition values change.
 *
 * Usage: DATABASE_URL="..." npx tsx src/lib/bls/recalc-all.ts
 */

import 'dotenv/config';

import {
    calculateRecipeNutrition,
    type IngredientNutritionInput,
} from '@app/lib/nutrition/calculate';
import { prisma } from '@shared/prisma';

async function main() {
    console.log('🔄 Recalculating nutrition for all recipes...\n');

    let cursor: string | undefined;
    let total = 0;
    let updated = 0;
    const pageSize = 100;

    while (true) {
        const recipes = await prisma.recipe.findMany({
            where: cursor ? { id: { gt: cursor } } : {},
            include: {
                recipeIngredients: {
                    include: {
                        ingredient: {
                            include: {
                                ingredientUnits: { include: { unit: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { id: 'asc' },
            take: pageSize,
        });

        if (recipes.length === 0) break;

        for (const recipe of recipes) {
            const inputs: IngredientNutritionInput[] = recipe.recipeIngredients.map((ri) => {
                const iu = ri.ingredient.ingredientUnits.find(
                    (iu) => iu.unit.shortName === ri.unit || iu.unit.longName === ri.unit,
                );
                return {
                    name: ri.ingredient.name,
                    amount: ri.amount,
                    unitShortName: ri.unit,
                    caloriesPer100g: ri.ingredient.caloriesPer100g,
                    proteinPer100g: ri.ingredient.proteinPer100g,
                    fatPer100g: ri.ingredient.fatPer100g,
                    carbsPer100g: ri.ingredient.carbsPer100g,
                    fiberPer100g: ri.ingredient.fiberPer100g,
                    ingredientUnitGrams: iu?.grams ?? null,
                    unitGramsDefault: iu?.unit.gramsDefault ?? null,
                };
            });

            const result = calculateRecipeNutrition(inputs);
            const servings = recipe.servings || 1;

            await prisma.recipe.update({
                where: { id: recipe.id },
                data: {
                    caloriesPerServing:
                        result.calories !== null ? Math.round(result.calories / servings) : null,
                    proteinPerServing:
                        result.protein !== null
                            ? Math.round((result.protein / servings) * 10) / 10
                            : null,
                    fatPerServing:
                        result.fat !== null ? Math.round((result.fat / servings) * 10) / 10 : null,
                    carbsPerServing:
                        result.carbs !== null
                            ? Math.round((result.carbs / servings) * 10) / 10
                            : null,
                    fiberPerServing:
                        result.fiber !== null
                            ? Math.round((result.fiber / servings) * 10) / 10
                            : null,
                    nutritionCompleteness: result.completeness,
                },
            });

            if (result.calories !== null) updated++;
            total++;
        }

        cursor = recipes[recipes.length - 1].id;
        console.log(`  ... ${total} recipes processed (${updated} with nutrition)`);

        if (recipes.length < pageSize) break;
    }

    console.log(`\n✅ Done: ${total} recipes processed, ${updated} with calculated nutrition`);
}

main()
    .catch((e) => {
        console.error('❌ Recalculation failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
