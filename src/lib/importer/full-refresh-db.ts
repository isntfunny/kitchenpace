/**
 * Database side of the full re-import (KUC-115): snapshot of everything the
 * refresh overwrites, and restoring such a snapshot. The write itself is
 * `replaceImportedRecipe` in pipeline.ts.
 */

import { Prisma, type PrismaClient } from '@prisma/client';

import type { FullBackupEntry } from './full-refresh';

/** Full backup rows for the given recipes (missing ids are left out). */
export async function snapshotRecipes(db: PrismaClient, ids: string[]): Promise<FullBackupEntry[]> {
    const rows = await db.recipe.findMany({
        where: { id: { in: ids } },
        select: {
            id: true,
            title: true,
            description: true,
            servings: true,
            prepTime: true,
            cookTime: true,
            totalTime: true,
            difficulty: true,
            imageKey: true,
            flowNodes: true,
            flowEdges: true,
            caloriesPerServing: true,
            proteinPerServing: true,
            fatPerServing: true,
            carbsPerServing: true,
            fiberPerServing: true,
            nutritionCompleteness: true,
            recipeIngredients: {
                orderBy: { position: 'asc' },
                select: {
                    id: true,
                    sourceId: true,
                    ingredientId: true,
                    unitId: true,
                    amount: true,
                    notes: true,
                    position: true,
                    isOptional: true,
                },
            },
            tags: { select: { tagId: true, createdAt: true } },
            categories: {
                orderBy: { position: 'asc' },
                select: { categoryId: true, position: true },
            },
        },
    });
    return rows.map(({ id, recipeIngredients, tags, categories, ...recipe }) => ({
        id,
        recipe: {
            ...recipe,
            flowNodes: recipe.flowNodes ?? null,
            flowEdges: recipe.flowEdges ?? null,
        },
        recipeIngredients,
        recipeTags: tags.map((t) => ({ tagId: t.tagId, createdAt: t.createdAt.toISOString() })),
        recipeCategories: categories,
    }));
}

const json = (value: unknown) =>
    value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue);

/**
 * Puts one recipe back to its backed-up state in one transaction: recipe
 * columns, ingredient rows with their old ids, tags and categories. Catalogue
 * ingredients created by the refresh stay. Tags or ingredients deleted from
 * the catalogue since then make the transaction fail (reported by the caller).
 */
export async function restoreFullBackupEntry(db: PrismaClient, entry: FullBackupEntry) {
    const { flowNodes, flowEdges, ...fields } = entry.recipe;
    await db.$transaction(async (tx) => {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: entry.id } });
        await tx.recipeTag.deleteMany({ where: { recipeId: entry.id } });
        await tx.recipeCategory.deleteMany({ where: { recipeId: entry.id } });
        await tx.recipe.update({
            where: { id: entry.id },
            data: { ...fields, flowNodes: json(flowNodes), flowEdges: json(flowEdges) },
        });
        if (entry.recipeIngredients.length)
            await tx.recipeIngredient.createMany({
                data: entry.recipeIngredients.map((ri) => ({ ...ri, recipeId: entry.id })),
            });
        if (entry.recipeTags.length)
            await tx.recipeTag.createMany({
                data: entry.recipeTags.map((t) => ({
                    recipeId: entry.id,
                    tagId: t.tagId,
                    createdAt: new Date(t.createdAt),
                })),
            });
        if (entry.recipeCategories.length)
            await tx.recipeCategory.createMany({
                data: entry.recipeCategories.map((c) => ({ ...c, recipeId: entry.id })),
            });
    });
}
