'use server';

import { fireEvent } from '@app/lib/events/fire';
import { createActivityLog } from '@app/lib/events/persist';
import { prisma } from '@shared/prisma';
import { addSyncRecipeJob } from '@worker/queues';

import {
    assertStoredRecipeCanBePublished,
    sendNotificationsToFollowers,
} from './recipeFormHelpers';
import type { RecipeStatus } from './recipeFormTypes';

export async function updateRecipeStatus(
    recipeId: string,
    status: RecipeStatus,
    authorId: string,
    isUserAdmin = false,
): Promise<{ success: boolean; error?: string }> {
    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { authorId: true, title: true, flowNodes: true, flowEdges: true },
        });

        if (!recipe) {
            return { success: false, error: 'Rezept nicht gefunden' };
        }

        if (!isUserAdmin && recipe.authorId !== authorId) {
            return { success: false, error: 'Nicht autorisiert' };
        }

        const isPublished = status === 'PUBLISHED';

        if (isPublished) {
            assertStoredRecipeCanBePublished(recipe);
        }

        await prisma.recipe.update({
            where: { id: recipeId },
            data: {
                status,
                publishedAt: isPublished ? new Date() : status === 'DRAFT' ? null : undefined,
            },
        });

        if (isPublished) {
            await createActivityLog({
                userId: authorId,
                type: 'RECIPE_CREATED',
                targetId: recipeId,
                targetType: 'recipe',
            });

            await sendNotificationsToFollowers(authorId, recipeId, recipe.title);
        }

        await addSyncRecipeJob(recipeId).catch((err) =>
            console.error('[OpenSearch] Failed to queue sync for status change:', err),
        );

        return { success: true };
    } catch (error) {
        console.error('Error updating recipe status:', error);
        return { success: false, error: 'Fehler beim Aktualisieren des Status' };
    }
}

export async function bulkUpdateRecipeStatus(
    recipeIds: string[],
    status: RecipeStatus,
    authorId: string,
    isUserAdmin = false,
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    try {
        const isPublished = status === 'PUBLISHED';
        const ownerFilter = isUserAdmin ? {} : { authorId };

        if (isPublished) {
            const recipesToPublish = await prisma.recipe.findMany({
                where: {
                    id: { in: recipeIds },
                    ...ownerFilter,
                },
                select: { id: true, title: true, flowNodes: true, flowEdges: true },
            });

            const invalidTitles: string[] = [];
            for (const recipe of recipesToPublish) {
                try {
                    assertStoredRecipeCanBePublished(recipe);
                } catch {
                    invalidTitles.push(recipe.title);
                }
            }

            if (invalidTitles.length > 0) {
                return {
                    success: false,
                    updatedCount: 0,
                    error: `Diese Rezepte koennen noch nicht veroeffentlicht werden: ${invalidTitles.slice(0, 3).join(', ')}${invalidTitles.length > 3 ? ' ...' : ''}`,
                };
            }
        }

        const result = await prisma.recipe.updateMany({
            where: {
                id: { in: recipeIds },
                ...ownerFilter,
            },
            data: {
                status,
                publishedAt: isPublished ? new Date() : status === 'DRAFT' ? null : undefined,
            },
        });

        if (isPublished) {
            const publishedRecipes = await prisma.recipe.findMany({
                where: { id: { in: recipeIds }, ...ownerFilter },
                select: { id: true, title: true },
            });

            await Promise.all(
                publishedRecipes.map((recipe) =>
                    fireEvent({
                        event: 'recipePublished',
                        actorId: authorId,
                        data: { recipeId: recipe.id, recipeTitle: recipe.title },
                    }),
                ),
            );

            for (const recipe of publishedRecipes) {
                await sendNotificationsToFollowers(authorId, recipe.id, recipe.title);
            }
        }

        await Promise.all(
            recipeIds.map((id) =>
                addSyncRecipeJob(id).catch((err) =>
                    console.error('[OpenSearch] Failed to queue sync for bulk update:', err),
                ),
            ),
        );

        return { success: true, updatedCount: result.count };
    } catch (error) {
        console.error('Error bulk updating recipe status:', error);
        return { success: false, updatedCount: 0, error: 'Fehler beim Massen-Update' };
    }
}

export async function bulkDeleteRecipes(
    recipeIds: string[],
    authorId: string,
    isUserAdmin = false,
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
        if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
            return { success: false, deletedCount: 0, error: 'Keine Rezept-IDs angegeben' };
        }

        const ownerFilter = isUserAdmin ? {} : { authorId };

        const recipes = await prisma.recipe.findMany({
            where: {
                id: { in: recipeIds },
                ...ownerFilter,
            },
            select: { id: true },
        });

        if (recipes.length !== recipeIds.length) {
            return {
                success: false,
                deletedCount: 0,
                error: 'Nicht autorisiert oder Rezepte nicht gefunden',
            };
        }

        const result = await prisma.recipe.deleteMany({
            where: {
                id: { in: recipeIds },
                ...ownerFilter,
            },
        });

        await Promise.all(
            recipeIds.map((id) =>
                addSyncRecipeJob(id).catch((err) =>
                    console.error('[OpenSearch] Failed to queue sync for bulk delete:', err),
                ),
            ),
        );

        return { success: true, deletedCount: result.count };
    } catch (error) {
        console.error('Error bulk deleting recipes:', error);
        return { success: false, deletedCount: 0, error: 'Fehler beim Löschen der Rezepte' };
    }
}
