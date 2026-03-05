'use server';

import { prisma } from '@shared/prisma';

export interface FavoriteRecipeCard {
    id: string;
    slug: string;
    title: string;
    category: string;
    rating: number;
    time: string;
    image: string | null;
    imageKey?: string | null;
    description?: string;
    savedAt: Date;
}

export async function fetchUserFavorites(userId: string): Promise<FavoriteRecipeCard[]> {
    const favorites = await prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
            recipe: {
                include: { categories: { include: { category: true } } },
            },
        },
    });

    return favorites.map((fav) => {
        const recipe = fav.recipe;
        const totalTime = recipe.totalTime ?? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

        return {
            id: recipe.id,
            slug: recipe.slug,
            title: recipe.title,
            category: recipe.categories[0]?.category?.name || 'Hauptgericht',
            rating: recipe.rating ?? 0,
            time: `${totalTime ?? 0} Min.`,
            image: recipe.imageKey ?? null,
            imageKey: recipe.imageKey ?? null,
            description: recipe.description ?? '',
            savedAt: fav.createdAt,
        };
    });
}
