'use server';

import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    imageUrl: string | null;
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
            imageUrl: true,
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
    imageUrl: string | null;
    imageKey: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    rating: number;
    ratingCount: number;
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
            imageUrl: true,
            imageKey: true,
            status: true,
            rating: true,
            ratingCount: true,
            createdAt: true,
            updatedAt: true,
            publishedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
    });

    return recipes;
}
