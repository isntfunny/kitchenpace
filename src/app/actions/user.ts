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

// ============================================================
// Profile page: enriched data fetches
// ============================================================

export interface TopRecipeEntry {
    id: string;
    title: string;
    slug: string;
    imageKey: string | null;
    rating: number;
    ratingCount: number;
    cookCount: number;
}

export async function fetchUserTopRecipes(userId: string, take = 6): Promise<TopRecipeEntry[]> {
    const recipes = await prisma.recipe.findMany({
        where: { authorId: userId, status: 'PUBLISHED' },
        select: {
            id: true,
            title: true,
            slug: true,
            imageKey: true,
            rating: true,
            ratingCount: true,
            _count: { select: { cookHistory: true } },
        },
        orderBy: { rating: 'desc' },
        take,
    });
    return recipes.map((r) => ({ ...r, cookCount: r._count.cookHistory }));
}

export interface CookHistoryEntry {
    id: string;
    cookedAt: Date;
    recipeId: string;
    recipeTitle: string;
    recipeSlug: string;
    recipeImageKey: string | null;
}

export async function fetchUserCookHistory(userId: string, take = 6): Promise<CookHistoryEntry[]> {
    const entries = await prisma.userCookHistory.findMany({
        where: { userId },
        select: {
            id: true,
            cookedAt: true,
            recipe: { select: { id: true, title: true, slug: true, imageKey: true } },
        },
        orderBy: { cookedAt: 'desc' },
        take,
    });
    return entries.map((e) => ({
        id: e.id,
        cookedAt: e.cookedAt,
        recipeId: e.recipe.id,
        recipeTitle: e.recipe.title,
        recipeSlug: e.recipe.slug,
        recipeImageKey: e.recipe.imageKey,
    }));
}

export interface FavoriteEntry {
    id: string;
    createdAt: Date;
    recipeId: string;
    recipeTitle: string;
    recipeSlug: string;
    recipeImageKey: string | null;
}

export async function fetchUserLastFavorites(userId: string, take = 6): Promise<FavoriteEntry[]> {
    const entries = await prisma.favorite.findMany({
        where: { userId },
        select: {
            id: true,
            createdAt: true,
            recipe: { select: { id: true, title: true, slug: true, imageKey: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
    });
    return entries.map((e) => ({
        id: e.id,
        createdAt: e.createdAt,
        recipeId: e.recipe.id,
        recipeTitle: e.recipe.title,
        recipeSlug: e.recipe.slug,
        recipeImageKey: e.recipe.imageKey,
    }));
}

export interface ViewHistoryEntry {
    id: string;
    viewedAt: Date;
    recipeId: string;
    recipeTitle: string;
    recipeSlug: string;
    recipeImageKey: string | null;
}

export async function fetchUserViewHistory(userId: string, take = 8): Promise<ViewHistoryEntry[]> {
    const entries = await prisma.userViewHistory.findMany({
        where: { userId },
        select: {
            id: true,
            viewedAt: true,
            recipe: { select: { id: true, title: true, slug: true, imageKey: true } },
        },
        orderBy: { viewedAt: 'desc' },
        take,
    });
    return entries.map((e) => ({
        id: e.id,
        viewedAt: e.viewedAt,
        recipeId: e.recipe.id,
        recipeTitle: e.recipe.title,
        recipeSlug: e.recipe.slug,
        recipeImageKey: e.recipe.imageKey,
    }));
}
