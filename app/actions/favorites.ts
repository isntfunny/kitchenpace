'use server';

import { prisma } from '@/lib/prisma';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80';

export interface FavoriteRecipeCard {
    id: string;
    slug: string;
    title: string;
    category: string;
    rating: number;
    time: string;
    image: string;
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
            image: recipe.imageUrl || DEFAULT_IMAGE,
            imageKey: recipe.imageKey ?? null,
            description: recipe.description ?? '',
            savedAt: fav.createdAt,
        };
    });
}
