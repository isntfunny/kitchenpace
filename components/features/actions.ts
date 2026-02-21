'use server';

import { prisma } from '@/lib/prisma';

export interface RecipeCardData {
    id: string;
    title: string;
    category: string;
    rating: number;
    time: string;
    image: string;
}

export async function getRecipes(): Promise<RecipeCardData[]> {
    const recipes = await prisma.recipe.findMany({
        include: {
            category: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 10,
    });

    return recipes.map((recipe: any) => ({
        id: recipe.id,
        title: recipe.title,
        category: recipe.category?.name || 'Hauptgericht',
        rating: recipe.rating,
        time: `${recipe.totalTime} Min.`,
        image:
            recipe.imageUrl ||
            'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80',
    }));
}
