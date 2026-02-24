'use server';

import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface UserStats {
    recipeCount: number;
    favoriteCount: number;
    cookedCount: number;
    ratingCount: number;
}

export async function fetchUserStats(userId: string): Promise<UserStats> {
    const [recipeCount, favoriteCount, cookedCount, ratingCount] = await Promise.all([
        prisma.recipe.count({ where: { authorId: userId, publishedAt: { not: null } } }),
        prisma.favorite.count({ where: { userId } }),
        prisma.userCookHistory.count({ where: { userId } }),
        prisma.userRating.count({ where: { userId } }),
    ]);

    return {
        recipeCount,
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
