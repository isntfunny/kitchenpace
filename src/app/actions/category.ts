'use server';

import type { ActivityFeedItem } from '@app/lib/activity-utils';
import { mapLogToFeedItem } from '@app/lib/activity-utils';
import { PALETTE } from '@app/lib/palette';
import { prisma } from '@shared/prisma';

import { type RecipeCardData, toRecipeCardData } from './recipes';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CategoryPageData {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: string;
    icon: string | null;
    coverImageKey: string | null;
    recipeCount: number;
    stats: {
        totalCooks: number;
        totalRatings: number;
        avgRating: number;
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_COLOR = PALETTE.orange;

const publishedInCategory = (categoryId: string) => ({
    publishedAt: { not: null } as const,
    categories: { some: { categoryId } },
});

// ─── Data fetching ───────────────────────────────────────────────────────────

export async function fetchCategoryBySlug(slug: string): Promise<CategoryPageData | null> {
    const category = await prisma.category.findUnique({
        where: { slug },
        include: {
            _count: {
                select: {
                    recipes: {
                        where: { recipe: { publishedAt: { not: null } } },
                    },
                },
            },
        },
    });

    if (!category) return null;

    // Aggregate stats across all published recipes in this category
    const recipeIds = await prisma.recipeCategory.findMany({
        where: {
            categoryId: category.id,
            recipe: { publishedAt: { not: null } },
        },
        select: { recipeId: true },
    });

    const ids = recipeIds.map((r) => r.recipeId);

    const [cookCount, ratingAgg] = await Promise.all([
        ids.length > 0 ? prisma.userCookHistory.count({ where: { recipeId: { in: ids } } }) : 0,
        ids.length > 0
            ? prisma.recipe.aggregate({
                  where: { id: { in: ids }, ratingCount: { gt: 0 } },
                  _avg: { rating: true },
                  _sum: { ratingCount: true },
              })
            : { _avg: { rating: null }, _sum: { ratingCount: null } },
    ]);

    return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        color: PALETTE[category.color] ?? DEFAULT_COLOR,
        icon: category.icon,
        coverImageKey: category.coverImageKey,
        recipeCount: category._count.recipes,
        stats: {
            totalCooks: cookCount as number,
            totalRatings: (ratingAgg._sum?.ratingCount as number) ?? 0,
            avgRating: Number((ratingAgg._avg?.rating ?? 0).toFixed(1)),
        },
    };
}

export async function fetchCategoryNewest(categoryId: string, take = 8): Promise<RecipeCardData[]> {
    const recipes = await prisma.recipe.findMany({
        where: publishedInCategory(categoryId),
        include: { categories: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
        take,
    });
    return recipes.map(toRecipeCardData);
}

export async function fetchCategoryTopRated(
    categoryId: string,
    take = 8,
): Promise<RecipeCardData[]> {
    const recipes = await prisma.recipe.findMany({
        where: { ...publishedInCategory(categoryId), ratingCount: { gt: 0 } },
        include: { categories: { include: { category: true } } },
        orderBy: [{ rating: 'desc' }, { ratingCount: 'desc' }],
        take,
    });
    return recipes.map(toRecipeCardData);
}

export async function fetchCategoryMostCooked(
    categoryId: string,
    take = 8,
): Promise<RecipeCardData[]> {
    const recipes = await prisma.recipe.findMany({
        where: { ...publishedInCategory(categoryId), cookCount: { gt: 0 } },
        include: { categories: { include: { category: true } } },
        orderBy: { cookCount: 'desc' },
        take,
    });
    return recipes.map(toRecipeCardData);
}

export async function fetchCategoryQuickRecipes(
    categoryId: string,
    take = 8,
): Promise<RecipeCardData[]> {
    const recipes = await prisma.recipe.findMany({
        where: {
            ...publishedInCategory(categoryId),
            totalTime: { gt: 0, lte: 30 },
        },
        include: { categories: { include: { category: true } } },
        orderBy: { totalTime: 'asc' },
        take,
    });
    return recipes.map(toRecipeCardData);
}

export async function fetchCategoryPopular(
    categoryId: string,
    take = 8,
): Promise<RecipeCardData[]> {
    const recipes = await prisma.recipe.findMany({
        where: publishedInCategory(categoryId),
        include: { categories: { include: { category: true } } },
        orderBy: [{ viewCount: 'desc' }, { rating: 'desc' }],
        take,
    });
    return recipes.map(toRecipeCardData);
}

export async function fetchCategoryActivity(
    categoryId: string,
    limit = 8,
): Promise<ActivityFeedItem[]> {
    // Get recipe IDs in this category
    const recipeLinks = await prisma.recipeCategory.findMany({
        where: {
            categoryId,
            recipe: { publishedAt: { not: null } },
        },
        select: { recipeId: true },
    });

    const recipeIds = recipeLinks.map((r) => r.recipeId);
    if (recipeIds.length === 0) return [];

    const logs = await prisma.activityLog.findMany({
        where: {
            targetType: 'recipe',
            targetId: { in: recipeIds },
            type: {
                in: [
                    'RECIPE_CREATED',
                    'RECIPE_COOKED',
                    'RECIPE_RATED',
                    'RECIPE_COMMENTED',
                    'RECIPE_FAVORITED',
                ],
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit * 2,
    });

    if (logs.length === 0) return [];

    const userIds = [...new Set(logs.map((l) => l.userId))];
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const recipes = await prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
        select: { id: true, title: true, slug: true },
    });
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    const visibleUserIds = new Set(
        users.filter((u) => u.profile?.showInActivity !== false).map((u) => u.id),
    );
    const emptyTargetMap = new Map<string, never>();

    return logs
        .filter((l) => visibleUserIds.has(l.userId))
        .slice(0, limit)
        .map((log) =>
            mapLogToFeedItem(log, userMap, recipeMap, emptyTargetMap, {
                respectShowInActivity: true,
            }),
        )
        .filter((item): item is ActivityFeedItem => item !== null);
}

export interface CategoryBarData {
    slug: string;
    name: string;
    icon: string | null;
    color: string;
    recipeCount: number;
}

export async function fetchCategoriesForBar(): Promise<CategoryBarData[]> {
    const categories = await prisma.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
            _count: {
                select: {
                    recipes: {
                        where: { recipe: { publishedAt: { not: null } } },
                    },
                },
            },
        },
    });

    return categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        color: PALETTE[c.color] ?? PALETTE.orange,
        recipeCount: c._count.recipes,
    }));
}
