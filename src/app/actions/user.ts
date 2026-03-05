'use server';

import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

export interface UserStats {
    recipeCount: number;
    draftCount: number;
    favoriteCount: number;
    cookedCount: number;
    ratingCount: number;
}

export async function fetchUserStats(userId: string): Promise<UserStats> {
    const [recipeCount, draftCount, favoriteCount, cookedCount, ratingCount] = await Promise.all([
        prisma.recipe.count({ where: { authorId: userId, publishedAt: { not: null } } }),
        prisma.recipe.count({ where: { authorId: userId, status: 'DRAFT' } }),
        prisma.favorite.count({ where: { userId } }),
        prisma.userCookHistory.count({ where: { userId } }),
        prisma.userRating.count({ where: { userId } }),
    ]);

    return {
        recipeCount,
        draftCount,
        favoriteCount,
        cookedCount,
        ratingCount,
    };
}

export async function getCurrentUserStats(): Promise<UserStats | null> {
    const session = await getServerAuthSession('fetchUserStats');
    if (!session?.user?.id) {
        return null;
    }

    return fetchUserStats(session.user.id);
}

export interface DraftRecipe {
    id: string;
    title: string;
    slug: string;
    imageKey: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function fetchUserDraftRecipes(userId: string): Promise<DraftRecipe[]> {
    const drafts = await prisma.recipe.findMany({
        where: { authorId: userId, status: 'DRAFT' },
        select: {
            id: true,
            title: true,
            slug: true,
            imageKey: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
    });

    return drafts;
}

export interface UserRecipe {
    id: string;
    title: string;
    slug: string;
    imageKey: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    rating: number;
    ratingCount: number;
    cookCount: number;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
}

export async function fetchUserRecipes(userId: string): Promise<UserRecipe[]> {
    const recipes = await prisma.recipe.findMany({
        where: { authorId: userId },
        select: {
            id: true,
            title: true,
            slug: true,
            imageKey: true,
            status: true,
            rating: true,
            ratingCount: true,
            createdAt: true,
            updatedAt: true,
            publishedAt: true,
            _count: {
                select: {
                    cookHistory: true,
                },
            },
        },
        orderBy: { updatedAt: 'desc' },
    });

    return recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        slug: recipe.slug,
        imageKey: recipe.imageKey,
        status: recipe.status,
        rating: recipe.rating,
        ratingCount: recipe.ratingCount,
        cookCount: recipe._count.cookHistory,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
        publishedAt: recipe.publishedAt,
    }));
}
