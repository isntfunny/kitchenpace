import type { Prisma } from '@prisma/client';

import type { FlowNodeInput } from '../../components/recipe/recipeFormTypes';

import { repairIngredientMentions } from './recipe-mentions';

/** Consolidate catalogue entries while keeping every recipe quantity and reference. */
export async function mergeRecipeIngredientOccurrences(
    tx: Prisma.TransactionClient,
    sourceId: string,
    targetId: string,
) {
    const target = await tx.ingredient.findUniqueOrThrow({ where: { id: targetId } });
    const sourceRecipeIngredients = await tx.recipeIngredient.findMany({
        where: { ingredientId: sourceId },
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
        const repair = repairIngredientMentions(
            (recipe.flowNodes as FlowNodeInput[] | null) ?? [],
            rows.map((row) => ({
                id: row.id,
                ingredientId: row.ingredientId,
                name: row.ingredientId === sourceId ? target.name : row.ingredient.name,
            })),
            new Map([
                ...rows
                    .filter((row) => row.ingredientId === sourceId)
                    .map((row) => [row.id, row.id] as const),
                ...(rows.filter((row) => row.ingredientId === sourceId).length === 1
                    ? [[sourceId, rows.find((row) => row.ingredientId === sourceId)!.id] as const]
                    : []),
            ]),
            { allowNameFallback: false },
        );
        await tx.recipe.update({
            where: { id: recipeId },
            data: { flowNodes: repair.nodes as unknown as object },
        });
    }
    // Resolve legacy catalogue references against the pre-merge rows first.
    // Keep every occurrence, amount and stable reference while retargeting.
    await tx.recipeIngredient.updateMany({
        where: { ingredientId: sourceId },
        data: { ingredientId: targetId },
    });
}
