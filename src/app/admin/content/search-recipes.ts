'use server';

import { prisma } from '@shared/prisma';

export async function searchRecipesForAdmin(query: string) {
    if (!query || query.length < 2) {
        return [];
    }

    const recipes = await prisma.recipe.findMany({
        where: {
            status: 'PUBLISHED',
            publishedAt: { not: null },
            title: { contains: query, mode: 'insensitive' },
        },
        select: {
            id: true,
            title: true,
            slug: true,
            imageKey: true,
            rating: true,
        },
        orderBy: { title: 'asc' },
        take: 10,
    });

    return recipes;
}
