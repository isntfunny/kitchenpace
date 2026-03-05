'use server';

import { RecipeStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { prisma } from '@shared/prisma';

export async function updateRecipeStatus(id: string, status: RecipeStatus) {
    if (!id?.trim()) {
        throw new Error('Rezept-ID ist erforderlich');
    }

    try {
        await prisma.recipe.update({
            where: { id },
            data: { status },
        });
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
        revalidatePath('/admin/recipes');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Rezept nicht gefunden');
        }
        throw error;
    }
}
