'use server';

import type { Prisma } from '@prisma/client';

import { prisma } from '@shared/prisma';

import type { ActivityFeedItem, ActivityIconName } from './community';
import type { RecipeCardData } from './recipes';

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

export interface CategoryRecipeSection {
    title: string;
    recipes: RecipeCardData[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_COLOR = '#e07b53';

type RecipeWithCategory = Prisma.RecipeGetPayload<{
    include: { categories: { include: { category: true } } };
}>;

function toRecipeCardData(recipe: RecipeWithCategory): RecipeCardData {
    const totalTime = recipe.totalTime ?? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

    return {
        id: recipe.id,
        slug: recipe.slug,
        title: recipe.title,
        category: recipe.categories[0]?.category?.name || 'Hauptgericht',
        categorySlug: recipe.categories[0]?.category?.slug ?? undefined,
        rating: recipe.rating ?? 0,
        time: `${totalTime ?? 0} Min.`,
        image: recipe.imageKey
            ? `/api/thumbnail?type=recipe&id=${encodeURIComponent(recipe.id)}`
            : null,
        imageKey: recipe.imageKey ?? null,
        description: recipe.description ?? '',
    };
}

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
        ids.length > 0
            ? prisma.userCookHistory.count({ where: { recipeId: { in: ids } } })
            : 0,
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
        color: category.color ?? DEFAULT_COLOR,
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

export async function fetchCategoryNewest(
    categoryId: string,
    take = 8,
): Promise<RecipeCardData[]> {
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

    const DECOR: Record<string, { icon: ActivityIconName; bg: string; label: string }> = {
        RECIPE_CREATED: { icon: 'edit3', bg: '#6c5ce7', label: 'hat ein Rezept erstellt' },
        RECIPE_COOKED: { icon: 'flame', bg: '#e17055', label: 'hat gekocht' },
        RECIPE_RATED: { icon: 'star', bg: '#f8b500', label: 'hat bewertet' },
        RECIPE_COMMENTED: { icon: 'message-square', bg: '#fd79a8', label: 'hat kommentiert' },
        RECIPE_FAVORITED: { icon: 'bookmark', bg: '#74b9ff', label: 'hat gespeichert' },
    };

    const formatTimeAgo = (date: Date): string => {
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Jetzt';
        if (minutes < 60) return `${minutes} Min.`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} Std.`;
        const days = Math.floor(hours / 24);
        return `${days} Tg.`;
    };

    const visibleUserIds = new Set(
        users.filter((u) => u.profile?.showInActivity !== false).map((u) => u.id),
    );

    return logs
        .filter((l) => visibleUserIds.has(l.userId))
        .slice(0, limit)
        .map((log) => {
            const base = DECOR[log.type] ?? DECOR.RECIPE_CREATED;
            const user = userMap.get(log.userId);
            const recipe = log.targetId ? recipeMap.get(log.targetId) : null;

            return {
                id: log.id,
                icon: base.icon,
                iconBg: base.bg,
                userName: user?.name || user?.profile?.nickname || 'Küchenfreund',
                userId: user?.id,
                userSlug: user?.profile?.slug ?? user?.id,
                actionLabel: base.label,
                recipeTitle: recipe?.title,
                recipeId: recipe?.id,
                recipeSlug: recipe?.slug,
                detail: log.metadata ? JSON.stringify(log.metadata) : undefined,
                rating:
                    log.type === 'RECIPE_RATED' && log.metadata
                        ? (log.metadata as any).rating
                        : undefined,
                timeAgo: formatTimeAgo(log.createdAt),
                targetUserName: undefined,
                targetUserId: undefined,
                targetUserSlug: undefined,
            };
        });
}

export interface CategoryBarData {
    slug: string;
    name: string;
    icon: string | null;
    color: string | null;
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
        color: c.color,
        recipeCount: c._count.recipes,
    }));
}
