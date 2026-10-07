import type { Prisma } from '@prisma/client';

import type { FlowNodeInput } from '../../components/recipe/recipeFormTypes';

import { repairIngredientMentions } from './recipe-mentions';

/** Consolidate catalogue entries while keeping every recipe quantity and reference. */
export async function mergeRecipeIngredientOccurrences(
    tx: Prisma.TransactionClient,
    sourceId: string,
    targetId: string,
) {
    const sourceRecipeIngredients = await tx.recipeIngredient.findMany({
        where: { ingredientId: sourceId },
    });

    // Keep recipe occurrences, their stable IDs, amounts, units and notes.
    // Catalogue consolidation is not a recipe quantity aggregation.
    await tx.recipeIngredient.updateMany({
        where: { ingredientId: sourceId },
        data: { ingredientId: targetId },
    });
    for (const recipeId of new Set(sourceRecipeIngredients.map((row) => row.recipeId))) {
        const recipe = await tx.recipe.findUniqueOrThrow({
            where: { id: recipeId },
            select: { flowNodes: true },
        });
        const rows = await tx.recipeIngredient.findMany({
            where: { recipeId },
            include: { ingredient: true },
        });
        const sourceOccurrences = sourceRecipeIngredients.filter(
            (row) => row.recipeId === recipeId,
        );
        const ids =
            sourceOccurrences.length === 1
                ? new Map([[sourceId, sourceOccurrences[0].id]])
                : new Map<string, string>();
        const repair = repairIngredientMentions(
            (recipe.flowNodes as FlowNodeInput[] | null) ?? [],
            rows.map((row) => ({
                id: row.id,
                ingredientId: row.ingredientId,
                name: row.ingredient.name,
            })),
            ids,
            { allowNameFallback: false },
        );
        await tx.recipe.update({
            where: { id: recipeId },
            data: { flowNodes: repair.nodes as unknown as object },
        });
    }
}
