import { NextResponse } from 'next/server';

import { prisma } from '@shared/prisma';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kitchenpace.de';

interface RecipeData {
    name: string;
    description: string;
    image_url: string;
    url: string;
    time_minutes: number;
    difficulty: 'Einfach' | 'Mittel' | 'Schwer';
    rating?: number;
}

export async function GET() {
    return await fetchAndReturnRecipeData();
}

export async function POST() {
    return await fetchAndReturnRecipeData();
}

async function fetchAndReturnRecipeData() {
    const [latestRecipes, topRecipes, trendingRecipes] = await Promise.all([
        prisma.recipe.findMany({
            where: {
                publishedAt: { not: null },
                status: 'PUBLISHED',
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
                title: true,
                description: true,
                slug: true,
                imageKey: true,
                prepTime: true,
                cookTime: true,
                totalTime: true,
                difficulty: true,
                rating: true,
            },
        }),
        prisma.recipe.findMany({
            where: {
                publishedAt: { not: null },
                status: 'PUBLISHED',
                ratingCount: { gt: 0 },
            },
            orderBy: { rating: 'desc' },
            take: 3,
            select: {
                title: true,
                description: true,
                slug: true,
                imageKey: true,
                prepTime: true,
                cookTime: true,
                totalTime: true,
                difficulty: true,
                rating: true,
            },
        }),
        prisma.recipe.findMany({
            where: {
                publishedAt: { not: null },
                status: 'PUBLISHED',
                isTrending: true,
            },
            take: 3,
            select: {
                title: true,
                description: true,
                slug: true,
                imageKey: true,
                prepTime: true,
                cookTime: true,
                totalTime: true,
                difficulty: true,
                rating: true,
            },
        }),
    ]);

    const mapDifficulty = (difficulty: string): 'Einfach' | 'Mittel' | 'Schwer' => {
        switch (difficulty) {
            case 'EASY':
                return 'Einfach';
            case 'MEDIUM':
                return 'Mittel';
            case 'HARD':
                return 'Schwer';
            default:
                return 'Mittel';
        }
    };

    const mapRecipeToData = (recipe: (typeof latestRecipes)[0]): RecipeData => ({
        name: recipe.title,
        description: recipe.description || '',
        image_url: recipe.imageKey
            ? `${process.env.IMAGE_CDN_URL || 'https://cdn.kitchenpace.de'}/recipe/${recipe.imageKey}`
            : '',
        url: `${APP_URL}/recipe/${recipe.slug}`,
        time_minutes: recipe.totalTime || recipe.prepTime + recipe.cookTime,
        difficulty: mapDifficulty(recipe.difficulty),
        rating: recipe.rating > 0 ? Number(recipe.rating.toFixed(1)) : undefined,
    });

    return NextResponse.json({
        latest_recipes: latestRecipes.map(mapRecipeToData),
        top_recipes: topRecipes.map(mapRecipeToData),
        trending_recipes: trendingRecipes.map(mapRecipeToData),
        categoryCookingUrl: `${APP_URL}/category/kochen`,
        categoryBakingUrl: `${APP_URL}/category/backen`,
        categorySideDishUrl: `${APP_URL}/category/beilage`,
        unsubscribe_url: `${APP_URL}/unsubscribe`,
    });
}
