'use server';

import shuffle from 'lodash/shuffle';

import { fetchActivityFeed } from '@app/lib/activity-feed';
import { type ActivityFeedItem } from '@app/lib/activity-utils';
import { PALETTE } from '@app/lib/palette';
import { prisma } from '@shared/prisma';


export type { ActivityFeedItem, ActivityIconName } from '@app/lib/activity-utils';


export type QuickTipIconName =
    | 'tag'
    | 'flame'
    | 'clock'
    | 'users'
    | 'book'
    | 'heart'
    | 'star'
    | 'chart';

const TAG_COLORS = [
    PALETTE.orange,
    PALETTE.emerald,
    PALETTE.blue,
    PALETTE.purple,
    PALETTE.gold,
    PALETTE.pink,
];

const TIP_ACCENTS = [PALETTE.orange, PALETTE.emerald, PALETTE.gold, PALETTE.blue, PALETTE.purple, PALETTE.pink];

export interface TrendingTagData {
    tag: string;
    slug: string;
    count: number;
    color: string;
}

export interface ChefSpotlightData {
    id: string;
    name: string;
    nickname?: string | null;
    bio?: string | null;
    avatar?: string | null;
    followerCount: number;
    recipeCount: number;
    topRecipes: Array<{
        id: string;
        slug: string;
        title: string;
        rating: number;
        image: string | null;
        imageKey?: string | null;
    }>;
}

export interface QuickTipData {
    icon: QuickTipIconName;
    title: string;
    content: string;
    iconBg: string;
}

export async function fetchTrendingTags(limit = 8): Promise<TrendingTagData[]> {
    const tagCounts = await prisma.recipeTag.groupBy({
        by: ['tagId'],
        _count: { tagId: true },
    });

    if (tagCounts.length === 0) return [];

    const tags = await prisma.tag.findMany({
        where: { id: { in: tagCounts.map((item) => item.tagId) } },
    });

    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

    const sorted = [...tagCounts].sort((a, b) => (b._count?.tagId ?? 0) - (a._count?.tagId ?? 0));

    return sorted
        .slice(0, limit)
        .map((item, index) => {
            const tag = tagMap.get(item.tagId);
            if (!tag) return null;
            return {
                tag: tag.name,
                slug: tag.slug,
                count: item._count?.tagId ?? 0,
                color: TAG_COLORS[index % TAG_COLORS.length],
            };
        })
        .filter(Boolean) as TrendingTagData[];
}

export async function fetchChefSpotlight(): Promise<ChefSpotlightData | null> {
    const topUserSetting = await prisma.siteSettings.findUnique({
        where: { key: 'topUser' },
    });

    if (topUserSetting?.value) {
        const userId = (topUserSetting.value as { userId: string }).userId;
        const profile = await prisma.profile.findUnique({
            where: { userId },
            include: {
                user: {
                    include: {
                        recipes: {
                            where: { publishedAt: { not: null } },
                            orderBy: { rating: 'desc' },
                            take: 3,
                        },
                    },
                },
            },
        });

        if (profile && profile.user) {
            return {
                id: profile.id,
                name: profile.user.name || profile.nickname,
                nickname: profile.nickname,
                bio: profile.bio,
                avatar: profile.photoUrl,
                followerCount: profile.followerCount,
                recipeCount: profile.recipeCount,
                topRecipes: profile.user.recipes.map((recipe) => ({
                    id: recipe.id,
                    slug: recipe.slug,
                    title: recipe.title,
                    rating: recipe.rating ?? 0,
                    image: recipe.imageKey ?? null,
                    imageKey: recipe.imageKey ?? null,
                })),
            };
        }
    }

    const profile = await prisma.profile.findFirst({
        where: { user: { recipes: { some: {} } } },
        orderBy: { followerCount: 'desc' },
        include: {
            user: {
                include: {
                    recipes: {
                        where: { publishedAt: { not: null } },
                        orderBy: { rating: 'desc' },
                        take: 3,
                    },
                },
            },
        },
    });

    if (!profile || !profile.user) {
        return null;
    }

    return {
        id: profile.id,
        name: profile.user.name || profile.nickname,
        nickname: profile.nickname,
        bio: profile.bio,
        avatar: profile.photoUrl,
        followerCount: profile.followerCount,
        recipeCount: profile.recipeCount,
        topRecipes: profile.user.recipes.map((recipe) => ({
            id: recipe.id,
            slug: recipe.slug,
            title: recipe.title,
            rating: recipe.rating ?? 0,
            image: recipe.imageKey ?? null,
            imageKey: recipe.imageKey ?? null,
        })),
    };
}

export async function fetchQuickTips(): Promise<QuickTipData[]> {
    const [
        totalRecipes,
        totalUsers,
        totalRatings,
        totalFavorites,
        totalCooks,
        fastRecipe,
        slowRecipe,
        topRatedRecipe,
    ] = await Promise.all([
        prisma.recipe.count({ where: { publishedAt: { not: null } } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.userRating.count(),
        prisma.favorite.count(),
        prisma.userCookHistory.count(),
        prisma.recipe.findFirst({
            where: { publishedAt: { not: null } },
            orderBy: { totalTime: 'asc' },
        }),
        prisma.recipe.findFirst({
            where: { publishedAt: { not: null }, totalTime: { gt: 0 } },
            orderBy: { totalTime: 'desc' },
        }),
        prisma.recipe.findFirst({
            where: { publishedAt: { not: null }, ratingCount: { gt: 0 } },
            orderBy: { rating: 'desc' },
        }),
        prisma.recipe.findFirst({
            where: { publishedAt: { not: null } },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    const tagGroups = await prisma.recipeTag.groupBy({
        by: ['tagId'],
        _count: { tagId: true },
    });
    const sortedTagGroups = [...tagGroups].sort(
        (a, b) => (b._count?.tagId ?? 0) - (a._count?.tagId ?? 0),
    );
    const topTagGroup = sortedTagGroups[0];
    const topTag = topTagGroup?.tagId
        ? await prisma.tag.findUnique({ where: { id: topTagGroup.tagId } })
        : null;

    const recipesWithCategories = await prisma.recipe.findMany({
        where: {
            publishedAt: { not: null },
            categories: { some: {} },
        },
        include: {
            categories: { include: { category: true }, orderBy: { position: 'asc' } },
        },
        take: 100,
    });

    const categoryCounts: Record<string, number> = {};
    for (const recipe of recipesWithCategories) {
        const cat = recipe.categories[0]?.category;
        if (cat) {
            categoryCounts[cat.id] = (categoryCounts[cat.id] || 0) + 1;
        }
    }

    let topCategory: { name: string } | null = null;
    let topCategoryCount = 0;

    for (const [catId, count] of Object.entries(categoryCounts)) {
        if (count > topCategoryCount) {
            topCategoryCount = count;
            const cat = await prisma.category.findUnique({ where: { id: catId } });
            if (cat) topCategory = cat;
        }
    }

    const avgTimeResult = await prisma.recipe.aggregate({
        where: { publishedAt: { not: null }, totalTime: { gt: 0 } },
        _avg: { totalTime: true },
    });
    const avgTime = Math.round(avgTimeResult._avg.totalTime ?? 0);

    const topProfile = await prisma.profile.findFirst({
        orderBy: { recipeCount: 'desc' },
    });

    const tips: QuickTipData[] = [];

    if (totalRecipes > 0) {
        tips.push({
            icon: 'book',
            title: 'Rezepte gesamt',
            content: `${totalRecipes} Rezepte warten auf dich`,
            iconBg: TIP_ACCENTS[0],
        });
    }

    if (totalUsers > 0) {
        tips.push({
            icon: 'users',
            title: 'Küchen-Enthusiasten',
            content: `${totalUsers} aktive Köche in der Community`,
            iconBg: TIP_ACCENTS[1],
        });
    }

    if (totalRatings > 0) {
        tips.push({
            icon: 'star',
            title: 'Bewertungen',
            content: `${totalRatings} Rezept-Bewertungen abgegeben`,
            iconBg: TIP_ACCENTS[2],
        });
    }

    if (totalFavorites > 0) {
        tips.push({
            icon: 'heart',
            title: 'Favoriten',
            content: `${totalFavorites} Rezepte als Favoriten gespeichert`,
            iconBg: TIP_ACCENTS[3],
        });
    }

    if (topCategory) {
        tips.push({
            icon: 'tag',
            title: 'Beliebteste Kategorie',
            content: `${topCategory.name} · ${topCategoryCount} Rezepte`,
            iconBg: TIP_ACCENTS[4],
        });
    }

    if (topTag) {
        tips.push({
            icon: 'flame',
            title: 'Trend-Tag',
            content: `${topTag.name} · ${topTagGroup?._count?.tagId ?? 0} Erwähnungen`,
            iconBg: TIP_ACCENTS[5],
        });
    }

    if (fastRecipe) {
        tips.push({
            icon: 'clock',
            title: 'Schnellstes Rezept',
            content: `${fastRecipe.title} in nur ${fastRecipe.totalTime ?? 0} Min.`,
            iconBg: TIP_ACCENTS[0],
        });
    }

    if (slowRecipe && slowRecipe.totalTime && slowRecipe.totalTime > 30) {
        tips.push({
            icon: 'clock',
            title: 'Für Geduldige',
            content: `${slowRecipe.title} · ${slowRecipe.totalTime} Min.`,
            iconBg: TIP_ACCENTS[1],
        });
    }

    if (topRatedRecipe && topRatedRecipe.ratingCount && topRatedRecipe.ratingCount > 0) {
        tips.push({
            icon: 'star',
            title: 'Bestbewertet',
            content: `${topRatedRecipe.title} · ${topRatedRecipe.rating?.toFixed(1)} ★`,
            iconBg: TIP_ACCENTS[2],
        });
    }

    if (avgTime > 0) {
        tips.push({
            icon: 'chart',
            title: 'Durchschnittszeit',
            content: `Rezepte brauchen im Schnitt ${avgTime} Min.`,
            iconBg: TIP_ACCENTS[3],
        });
    }

    if (topProfile && topProfile.recipeCount > 0) {
        tips.push({
            icon: 'users',
            title: 'Fleißigster Koch',
            content: `${topProfile.nickname ?? 'Jemand'} mit ${topProfile.recipeCount} Rezepten`,
            iconBg: TIP_ACCENTS[4],
        });
    }

    if (totalCooks > 0) {
        tips.push({
            icon: 'flame',
            title: 'Zubereitet wurde',
            content: `${totalCooks} Mal wurden Rezepte nachgemacht`,
            iconBg: TIP_ACCENTS[5],
        });
    }

    return shuffle(tips).slice(0, 3);
}

export async function fetchUserActivityFeedItems(
    userId: string,
    take = 20,
): Promise<ActivityFeedItem[]> {
    return fetchActivityFeed({ type: 'user', userId }, take);
}

export async function fetchRecentActivities(limit = 6): Promise<ActivityFeedItem[]> {
    return fetchActivityFeed('global', limit);
}
