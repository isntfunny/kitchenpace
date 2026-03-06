'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@shared/prisma';

export async function reassignRecipe(recipeId: string, newAuthorId: string) {
    if (!recipeId?.trim()) throw new Error('Rezept-ID ist erforderlich');
    if (!newAuthorId?.trim()) throw new Error('Benutzer-ID ist erforderlich');

    const user = await prisma.user.findUnique({ where: { id: newAuthorId } });
    if (!user) throw new Error('Benutzer nicht gefunden');

    await prisma.recipe.update({
        where: { id: recipeId },
        data: { authorId: newAuthorId },
    });

    revalidatePath('/admin/imports');
}
