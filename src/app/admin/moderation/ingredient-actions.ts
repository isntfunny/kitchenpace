'use server';

import { revalidatePath } from 'next/cache';

import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

export async function approveIngredient(ingredientId: string) {
    await ensureModeratorSession('approve-ingredient');

    await prisma.ingredient.update({
        where: { id: ingredientId },
        data: { needsReview: false },
    });

    revalidatePath('/admin/moderation');
}

export async function deleteIngredient(ingredientId: string) {
    await ensureModeratorSession('delete-ingredient');

    // Delete linked recipe ingredients first, then the ingredient
    await prisma.$transaction([
        prisma.recipeIngredient.deleteMany({ where: { ingredientId } }),
        prisma.ingredientUnit.deleteMany({ where: { ingredientId } }),
        prisma.ingredient.delete({ where: { id: ingredientId } }),
    ]);

    revalidatePath('/admin/moderation');
}
