'use server';

import shuffle from 'lodash/shuffle';

import { fetchActivityFeed } from '@app/lib/activity-feed';
import { type ActivityFeedItem } from '@app/lib/activity-utils';
import { PALETTE } from '@app/lib/palette';
import type { UserCardData } from '@app/lib/user-card';
import { prisma } from '@shared/prisma';

import { fetchTrophyBadge } from './trophies';

export type { ActivityFeedItem, ActivityIconName } from '@app/lib/activity-utils';

export type QuickTipIconName =
    | 'tag'
    | 'flame'
    | 'clock'
    | 'users'
    | 'book'
    | 'heart'
    | 'bookmark'
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

const TIP_ACCENTS = [
    PALETTE.orange,
    PALETTE.emerald,
    PALETTE.gold,
    PALETTE.blue,
    PALETTE.purple,
    PALETTE.pink,
];

export interface TrendingTagData {
    tag: string;
    slug: string;
    count: number;
    color: string;
}

export interface ChefSpotlightData extends UserCardData {
    nickname?: string | null;
    topRecipes: Array<{
        id: string;
        slug: string;
        title: string;
        imageKey: string | null;
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
            const badge = await fetchTrophyBadge(profile.userId);
            return {
                id: profile.userId,
                slug: profile.slug,
                name: profile.user.name || profile.nickname,
                nickname: profile.nickname,
                bio: profile.bio,
                photoKey: profile.photoKey ?? null,
                trophyTier: badge?.tier ?? null,
                followerCount: profile.followerCount,
                recipeCount: profile.recipeCount,
                topRecipes: profile.user.recipes.map((recipe) => ({
                    id: recipe.id,
                    slug: recipe.slug,
                    title: recipe.title,
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

    const badge = await fetchTrophyBadge(profile.userId);
    return {
        id: profile.userId,
        slug: profile.slug,
        name: profile.user.name || profile.nickname,
        nickname: profile.nickname,
        bio: profile.bio,
        photoKey: profile.photoKey ?? null,
        trophyTier: badge?.tier ?? null,
        followerCount: profile.followerCount,
        recipeCount: profile.recipeCount,
        topRecipes: profile.user.recipes.map((recipe) => ({
            id: recipe.id,
            slug: recipe.slug,
            title: recipe.title,
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
        prisma.user.count({ where: { emailVerified: true } }),
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
            title: `${totalRecipes} Rezepte`,
            content: 'Jedes davon wartet darauf, von dir entdeckt zu werden.',
            iconBg: TIP_ACCENTS[0],
        });
    }

    if (totalUsers > 0) {
        tips.push({
            icon: 'users',
            title: `${totalUsers} Köche`,
            content: 'Eine wachsende Community voller Küchenbegeisterter.',
            iconBg: TIP_ACCENTS[1],
        });
    }

    if (totalRatings > 0) {
        tips.push({
            icon: 'star',
            title: `${totalRatings} Bewertungen`,
            content: 'So viel ehrliches Feedback steckt in unserer Community.',
            iconBg: TIP_ACCENTS[2],
        });
    }

    if (totalFavorites > 0) {
        tips.push({
            icon: 'bookmark',
            title: `${totalFavorites}× Favorisiert`,
            content: 'So oft wurden deine Rezepte favorisiert.',
            iconBg: TIP_ACCENTS[3],
        });
    }

    if (topCategory) {
        tips.push({
            icon: 'tag',
            title: `#1: ${topCategory.name}`,
            content: `Mit ${topCategoryCount} Rezepten die beliebteste Kategorie.`,
            iconBg: TIP_ACCENTS[4],
        });
    }

    if (topTag) {
        tips.push({
            icon: 'flame',
            title: `#${topTag.name} liegt im Trend`,
            content: `${topTagGroup?._count?.tagId ?? 0} Rezepte tragen dieses Tag.`,
            iconBg: TIP_ACCENTS[5],
        });
    }

    if (fastRecipe) {
        tips.push({
            icon: 'clock',
            title: 'Blitznell: ' + fastRecipe.title,
            content: `Fertig in nur ${fastRecipe.totalTime ?? 0} Minuten — probier's aus!`,
            iconBg: TIP_ACCENTS[0],
        });
    }

    if (slowRecipe && slowRecipe.totalTime && slowRecipe.totalTime > 30) {
        tips.push({
            icon: 'clock',
            title: 'Für Genießer',
            content: `${slowRecipe.title} — ${slowRecipe.totalTime} Min. pure Kochkunst.`,
            iconBg: TIP_ACCENTS[1],
        });
    }

    if (topRatedRecipe && topRatedRecipe.ratingCount && topRatedRecipe.ratingCount > 0) {
        tips.push({
            icon: 'star',
            title: `${topRatedRecipe.rating?.toFixed(1)} ★ — das Beste`,
            content: `"${topRatedRecipe.title}" ist der Community-Liebling.`,
            iconBg: TIP_ACCENTS[2],
        });
    }

    if (avgTime > 0) {
        tips.push({
            icon: 'chart',
            title: `Ø ${avgTime} Min. pro Rezept`,
            content: 'So lange stehen unsere Köche durchschnittlich am Herd.',
            iconBg: TIP_ACCENTS[3],
        });
    }

    if (topProfile && topProfile.recipeCount > 0) {
        tips.push({
            icon: 'users',
            title: `${topProfile.nickname ?? 'Jemand'} kocht am meisten`,
            content: `${topProfile.recipeCount} Rezepte — ein echter Küchen-Profi!`,
            iconBg: TIP_ACCENTS[4],
        });
    }

    if (totalCooks > 0) {
        tips.push({
            icon: 'flame',
            title: `${totalCooks}× nachgekocht`,
            content: 'So oft wurde ein Rezept aus dieser Community tatsächlich gemacht.',
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
