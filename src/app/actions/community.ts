'use server';

import { prisma } from '@shared/prisma';

export type ActivityIconName =
    | 'edit3'
    | 'flame'
    | 'star'
    | 'message-square'
    | 'bookmark'
    | 'handshake'
    | 'shopping-cart'
    | 'calendar';

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
    '#e07b53',
    '#00b894',
    '#0984e3',
    '#6c5ce7',
    '#fdcb6e',
    '#00cec9',
    '#e17055',
    '#fd79a8',
    '#a29bfe',
    '#fab1a0',
];

const TIP_ACCENTS = ['#e07b53', '#00b894', '#fdcb6e', '#0984e3', '#6c5ce7', '#fd79a8'];

const ACTIVITY_DECOR: Record<string, { icon: ActivityIconName; bg: string; label: string }> = {
    RECIPE_CREATED: { icon: 'edit3', bg: '#6c5ce7', label: 'hat ein Rezept erstellt' },
    RECIPE_COOKED: { icon: 'flame', bg: '#e17055', label: 'hat gekocht' },
    RECIPE_RATED: { icon: 'star', bg: '#f8b500', label: 'hat bewertet' },
    RECIPE_COMMENTED: { icon: 'message-square', bg: '#fd79a8', label: 'hat kommentiert' },
    RECIPE_FAVORITED: { icon: 'bookmark', bg: '#74b9ff', label: 'hat gespeichert' },
    USER_FOLLOWED: { icon: 'handshake', bg: '#00cec9', label: 'hat' }, // Will be combined with target name
    SHOPPING_LIST_CREATED: {
        icon: 'shopping-cart',
        bg: '#fdcb6e',
        label: 'hat eine Einkaufsliste erstellt',
    },
    MEAL_PLAN_CREATED: { icon: 'calendar', bg: '#a29bfe', label: 'hat einen Plan erstellt' },
};

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

export interface ActivityFeedItem {
    id: string;
    icon: ActivityIconName;
    iconBg: string;
    userName: string;
    userId?: string;
    userSlug?: string;
    actionLabel: string;
    recipeTitle?: string;
    recipeId?: string;
    recipeSlug?: string;
    detail?: string;
    rating?: number;
    timeAgo: string;
    targetUserName?: string;
    targetUserId?: string;
    targetUserSlug?: string;
}

function formatTimeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Jetzt';
    if (minutes < 60) return `${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `${days} Tg.`;
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
            title: 'Gekocht wurde',
            content: `${totalCooks} Mal wurden Rezepte nachgekocht`,
            iconBg: TIP_ACCENTS[5],
        });
    }

    const shuffled = tips.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
}

export async function fetchUserActivityFeedItems(
    userId: string,
    take = 20,
): Promise<ActivityFeedItem[]> {
    const knownTypes = new Set(Object.keys(ACTIVITY_DECOR));

    // Fetch more than needed to account for unknown types being filtered out
    const allLogs = await prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: take * 2,
    });

    const logs = allLogs.filter((l) => knownTypes.has(l.type)).slice(0, take);

    if (logs.length === 0) return [];

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
    });

    const recipeIds = Array.from(
        new Set(
            logs
                .filter((l) => l.targetType === 'recipe' && l.targetId)
                .map((l) => l.targetId as string),
        ),
    );
    const recipes =
        recipeIds.length > 0
            ? await prisma.recipe.findMany({
                  where: { id: { in: recipeIds } },
                  select: { id: true, title: true, slug: true },
              })
            : [];
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    const followTargetIds = Array.from(
        new Set(
            logs
                .filter((l) => l.type === 'USER_FOLLOWED' && l.targetId)
                .map((l) => l.targetId as string),
        ),
    );
    const targetUsers =
        followTargetIds.length > 0
            ? await prisma.user.findMany({
                  where: { id: { in: followTargetIds } },
                  include: { profile: true },
              })
            : [];
    const targetUserMap = new Map(targetUsers.map((u) => [u.id, u]));

    return logs.map((log) => {
        const base = ACTIVITY_DECOR[log.type];
        const recipeId = log.targetType === 'recipe' ? log.targetId : null;
        const recipe = recipeId ? recipeMap.get(recipeId) : null;

        let actionLabel = base.label;
        let targetUserName: string | undefined;
        let targetUserId: string | undefined;

        if (log.type === 'USER_FOLLOWED' && log.targetId) {
            const targetUser = targetUserMap.get(log.targetId);
            targetUserName = targetUser?.name || targetUser?.profile?.nickname || undefined;
            actionLabel = targetUserName ? 'hat' : 'hat jemandem gefolgt';
            targetUserId = targetUser?.id;
        }

        const followTarget = log.targetId ? targetUserMap.get(log.targetId) : null;

        return {
            id: log.id,
            icon: base.icon,
            iconBg: base.bg,
            userName: user?.name || user?.profile?.nickname || 'Küchenfreund',
            userId: user?.id,
            userSlug: user?.profile?.slug ?? user?.id,
            actionLabel,
            recipeTitle: recipe?.title,
            recipeId: recipe?.id,
            recipeSlug: recipe?.slug,
            detail: log.metadata ? JSON.stringify(log.metadata) : undefined,
            timeAgo: formatTimeAgo(log.createdAt),
            targetUserName,
            targetUserId,
            targetUserSlug: followTarget?.profile?.slug ?? targetUserId,
        };
    });
}

export async function fetchRecentActivities(limit = 6): Promise<ActivityFeedItem[]> {
    const logs = await prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit * 2,
    });

    const userIds = [...new Set(logs.map((log) => log.userId))];
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true },
    });

    const visibleUserIds = new Set(
        users.filter((user) => user.profile?.showInActivity !== false).map((user) => user.id),
    );

    const recipeIds = Array.from(
        new Set(
            logs
                .filter((log) => log.targetType === 'recipe' && log.targetId)
                .map((log) => log.targetId as string),
        ),
    );
    const recipes = await prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
        select: { id: true, title: true, slug: true },
    });

    const followTargetIds = Array.from(
        new Set(
            logs
                .filter((log) => log.type === 'USER_FOLLOWED' && log.targetId)
                .map((log) => log.targetId as string),
        ),
    );
    const targetUsers = await prisma.user.findMany({
        where: { id: { in: followTargetIds } },
        include: { profile: true },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));
    const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const targetUserMap = new Map(targetUsers.map((user) => [user.id, user]));

    const knownActivityTypes = new Set(Object.keys(ACTIVITY_DECOR));
    const activities: ActivityFeedItem[] = [];

    for (const log of logs) {
        if (!visibleUserIds.has(log.userId)) continue;
        if (!knownActivityTypes.has(log.type)) continue;

        const base = ACTIVITY_DECOR[log.type as keyof typeof ACTIVITY_DECOR];
        const user = userMap.get(log.userId);
        const recipeId = log.targetType === 'recipe' ? log.targetId : null;
        const recipe = recipeId ? recipeMap.get(recipeId) : null;

        let actionLabel = base.label;
        let targetUserName: string | undefined;

        // Handle follow activities specially
        if (log.type === 'USER_FOLLOWED' && log.targetId) {
            const targetUser = targetUserMap.get(log.targetId);
            // Only show target name if target user allows it
            if (targetUser?.profile?.showInActivity !== false) {
                targetUserName = targetUser?.name || targetUser?.profile?.nickname || undefined;
                actionLabel = targetUserName ? 'hat' : 'hat jemandem gefolgt';
            } else {
                actionLabel = 'hat jemandem gefolgt';
            }
        }

        const followTarget = log.targetId ? targetUserMap.get(log.targetId) : null;

        activities.push({
            id: log.id,
            icon: base.icon,
            iconBg: base.bg,
            userName: user?.name || user?.profile?.nickname || 'Küchenfreund',
            userId: user?.id,
            userSlug: user?.profile?.slug ?? user?.id,
            actionLabel,
            recipeTitle: recipe?.title,
            recipeId: recipe?.id,
            recipeSlug: recipe?.slug,
            detail: log.metadata ? JSON.stringify(log.metadata) : undefined,
            timeAgo: formatTimeAgo(log.createdAt),
            targetUserName,
            targetUserId: log.targetId || undefined,
            targetUserSlug: followTarget?.profile?.slug ?? log.targetId ?? undefined,
        });

        // Stop when we have enough activities
        if (activities.length >= limit) break;
    }

    return activities;
}
