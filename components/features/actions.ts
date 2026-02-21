'use server';

import { prisma } from '@/lib/prisma';

export interface RecipeCardData {
    id: string;
    title: string;
    category: string;
    rating: number;
    time: string;
    image: string;
    description?: string;
}

export async function getRecipes(
    orderBy: 'newest' | 'rating' = 'newest',
    take = 10,
): Promise<RecipeCardData[]> {
    const recipes = await prisma.recipe.findMany({
        include: {
            category: true,
        },
        orderBy: orderBy === 'rating' ? { rating: 'desc' } : { createdAt: 'desc' },
        take,
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

export async function getFeaturedRecipe(): Promise<RecipeCardData | null> {
    // Get a random high-rated recipe as featured
    const recipes = await prisma.recipe.findMany({
        where: {
            rating: { gte: 4.0 },
        },
        include: {
            category: true,
        },
        orderBy: {
            viewCount: 'desc',
        },
        take: 1,
    });

    if (recipes.length === 0) return null;

    const recipe: any = recipes[0];
    return {
        id: recipe.id,
        title: recipe.title,
        category: recipe.category?.name || 'Hauptgericht',
        rating: recipe.rating,
        time: `${recipe.totalTime} Min.`,
        description: recipe.description || '',
        image:
            recipe.imageUrl ||
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    };
}

export async function getRecipesByTime(mealTime: string): Promise<RecipeCardData[]> {
    // Map meal times to totalTime ranges
    const timeFilters: Record<string, { lte: number }> = {
        frueh: { lte: 20 },
        mittag: { lte: 30 },
        abend: { lte: 45 },
        brunch: { lte: 30 },
        fingerfood: { lte: 25 },
    };

    const filter = timeFilters[mealTime] || { lte: 30 };

    const recipes = await prisma.recipe.findMany({
        where: {
            totalTime: filter,
        },
        include: {
            category: true,
        },
        orderBy: {
            rating: 'desc',
        },
        take: 6,
    });

    return recipes.map((recipe: any) => ({
        id: recipe.id,
        title: recipe.title,
        category: recipe.category?.name || 'Hauptgericht',
        rating: recipe.rating,
        time: `${recipe.totalTime} Min.`,
        description: recipe.description || '',
        image:
            recipe.imageUrl ||
            'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80',
    }));
}
