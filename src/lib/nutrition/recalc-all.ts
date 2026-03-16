/**
 * Batch recalculate nutrition for all recipes.
 * Run after Swiss Food DB import or when ingredient nutrition values change.
 *
 * Usage: npx tsx src/lib/nutrition/recalc-all.ts
 */

import 'dotenv/config';

import { prisma } from '@shared/prisma';

import { updateRecipeNutrition } from './update-recipe-nutrition';

async function main() {
    console.log('Recalculating nutrition for all recipes...\n');

    let cursor: string | undefined;
    let total = 0;
    let updated = 0;
    const pageSize = 100;

    while (true) {
        const recipes = await prisma.recipe.findMany({
            where: cursor ? { id: { gt: cursor } } : {},
            select: { id: true, servings: true, caloriesPerServing: true },
            orderBy: { id: 'asc' },
            take: pageSize,
        });

        if (recipes.length === 0) break;

        for (const recipe of recipes) {
            const hadNutrition = await updateRecipeNutrition(recipe.id, recipe.servings || 1);
            if (hadNutrition) updated++;
            total++;
        }

        cursor = recipes[recipes.length - 1].id;
        console.log(`  ... ${total} recipes processed (${updated} with nutrition)`);

        if (recipes.length < pageSize) break;
    }

    console.log(`\nDone: ${total} recipes processed, ${updated} with calculated nutrition`);
}

main()
    .catch((e) => {
        console.error('Recalculation failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
