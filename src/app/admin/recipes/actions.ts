'use server';

import { RecipeStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { prisma } from '@shared/prisma';
import { addSyncRecipeJob } from '@worker/queues';

export async function updateRecipeStatus(id: string, status: RecipeStatus) {
    if (!id?.trim()) {
        throw new Error('Rezept-ID ist erforderlich');
    }

    try {
        await prisma.recipe.update({
            where: { id },
            data: { status },
        });
        await addSyncRecipeJob(id).catch((err) =>
            console.error('[OpenSearch] Failed to queue sync for admin status change:', err),
        );
        revalidatePath('/admin/recipes');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Rezept nicht gefunden');
        }
        throw error;
    }
}

export async function deleteRecipe(id: string) {
    if (!id?.trim()) {
        throw new Error('Rezept-ID ist erforderlich');
    }

    try {
        await prisma.recipe.update({
            where: { id },
            data: { status: RecipeStatus.ARCHIVED },
        });
        await addSyncRecipeJob(id).catch((err) =>
            console.error('[OpenSearch] Failed to queue sync for admin archive:', err),
        );
        revalidatePath('/admin/recipes');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Rezept nicht gefunden');
        }
        throw error;
    }
}

export async function publishRecipe(id: string) {
    if (!id?.trim()) {
        throw new Error('Rezept-ID ist erforderlich');
    }

    try {
        await prisma.recipe.update({
            where: { id },
            data: {
                status: RecipeStatus.PUBLISHED,
                publishedAt: new Date(),
            },
        });
        await addSyncRecipeJob(id).catch((err) =>
            console.error('[OpenSearch] Failed to queue sync for admin publish:', err),
        );
        revalidatePath('/admin/recipes');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Rezept nicht gefunden');
        }
        throw error;
    }
}

export async function reassignRecipeAuthor(recipeId: string, newAuthorId: string): Promise<void> {
    if (!recipeId?.trim() || !newAuthorId?.trim()) {
        throw new Error('Rezept-ID und neuer Autor sind erforderlich');
    }

    try {
        // Verify the new author exists
        const newAuthor = await prisma.user.findUnique({
            where: { id: newAuthorId },
            select: { id: true },
        });
        if (!newAuthor) {
            throw new Error('Der ausgewählte Benutzer wurde nicht gefunden');
        }

        await prisma.recipe.update({
            where: { id: recipeId },
            data: { authorId: newAuthorId },
        });
        await addSyncRecipeJob(recipeId).catch((err) =>
            console.error('[OpenSearch] Failed to queue sync for author reassign:', err),
        );
        revalidatePath('/admin/recipes');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Rezept nicht gefunden');
        }
        throw error;
    }
}

export async function unpublishRecipe(id: string) {
    if (!id?.trim()) {
        throw new Error('Rezept-ID ist erforderlich');
    }

    try {
        await prisma.recipe.update({
            where: { id },
            data: {
                status: RecipeStatus.DRAFT,
                publishedAt: null,
            },
        });
        await addSyncRecipeJob(id).catch((err) =>
            console.error('[OpenSearch] Failed to queue sync for admin unpublish:', err),
        );
        revalidatePath('/admin/recipes');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Rezept nicht gefunden');
        }
        throw error;
    }
}
