'use server';

import { prisma } from '@/lib/prisma';

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

const TIP_ACCENTS = ['#e07b53', '#00b894', '#fdcb6e'];

const ACTIVITY_DECOR = {
    RECIPE_CREATED: { icon: '✍️', bg: '#6c5ce7', label: 'hat ein Rezept erstellt' },
    RECIPE_COOKED: { icon: '🔥', bg: '#e17055', label: 'hat gekocht' },
    RECIPE_RATED: { icon: '⭐', bg: '#f8b500', label: 'hat bewertet' },
    RECIPE_COMMENTED: { icon: '💬', bg: '#fd79a8', label: 'hat kommentiert' },
    RECIPE_FAVORITED: { icon: '🔖', bg: '#74b9ff', label: 'hat gespeichert' },
    USER_FOLLOWED: { icon: '🤝', bg: '#00cec9', label: 'hat' }, // Will be combined with target name
    SHOPPING_LIST_CREATED: { icon: '🛒', bg: '#fdcb6e', label: 'hat eine Einkaufsliste erstellt' },
    MEAL_PLAN_CREATED: { icon: '📅', bg: '#a29bfe', label: 'hat einen Plan erstellt' },
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
    topRecipes: Array<{ id: string; slug: string; title: string; rating: number; image: string }>;
}

export interface QuickTipData {
    icon: string;
    title: string;
    content: string;
    iconBg: string;
}

export interface ActivityFeedItem {
    id: string;
    icon: string;
    iconBg: string;
    userName: string;
    userId?: string;
    actionLabel: string;
    recipeTitle?: string;
    recipeId?: string;
    detail?: string;
    rating?: number;
    timeAgo: string;
    targetUserName?: string;
    targetUserId?: string;
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
        id: profile.user.id,
        name: profile.user.name ?? profile.nickname ?? 'Chef des Monats',
        nickname: profile.nickname,
        bio: profile.bio,
        avatar: profile.photoUrl || null,
        followerCount: profile.followerCount,
        recipeCount: profile.recipeCount,
        topRecipes: profile.user.recipes.map((recipe) => ({
            id: recipe.id,
            slug: recipe.slug,
            title: recipe.title,
            image:
                recipe.imageUrl ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
            rating: recipe.rating ?? 0,
        })),
    };
}

export async function fetchQuickTips(): Promise<QuickTipData[]> {
    const totalRecipes = await prisma.recipe.count({ where: { publishedAt: { not: null } } });

    const fastRecipe = await prisma.recipe.findFirst({
        where: { publishedAt: { not: null } },
        orderBy: { totalTime: 'asc' },
    });

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

    const tips: QuickTipData[] = [];

    if (topCategory) {
        tips.push({
            icon: '🏷️',
            title: 'Beliebteste Kategorie',
            content: `${topCategory.name} · ${topCategoryCount} Rezepte`,
            iconBg: TIP_ACCENTS[0],
        });
    }

    if (topTag) {
        tips.push({
            icon: '🔥',
            title: 'Trend-Tag',
            content: `${topTag.name} · ${topTagGroup?._count?.tagId ?? 0} Erwähnungen`,
            iconBg: TIP_ACCENTS[1],
        });
    }

    if (fastRecipe) {
        tips.push({
            icon: '⏱️',
            title: 'Schnellstes Rezept',
            content: `${fastRecipe.title} in ${fastRecipe.totalTime ?? 0} Min. (von ${totalRecipes} Rezepten)`,
            iconBg: TIP_ACCENTS[2],
        });
    }

    return tips;
}

export async function fetchRecentActivities(limit = 6): Promise<ActivityFeedItem[]> {
    const logs = await prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit * 2, // Fetch more to account for filtered users
    });

    const userIds = [...new Set(logs.map((log) => log.userId))];
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true },
    });

    // Filter out users who don't want to show in activity
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
        select: { id: true, title: true },
    });

    // Get target user IDs for follow activities
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

    const activities: ActivityFeedItem[] = [];

    for (const log of logs) {
        // Skip if user doesn't want to be shown in activity
        if (!visibleUserIds.has(log.userId)) continue;

        const base = ACTIVITY_DECOR[log.type as keyof typeof ACTIVITY_DECOR] ?? {
            icon: '⭐',
            bg: '#e07b53',
            label: 'hat etwas gemacht',
        };
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

        activities.push({
            id: log.id,
            icon: base.icon,
            iconBg: base.bg,
            userName: user?.name || user?.profile?.nickname || 'Küchenfreund',
            userId: user?.id,
            actionLabel,
            recipeTitle: recipe?.title,
            recipeId: recipe?.id,
            detail: log.metadata ? JSON.stringify(log.metadata) : undefined,
            timeAgo: formatTimeAgo(log.createdAt),
            targetUserName,
            targetUserId: log.targetId || undefined,
        });

        // Stop when we have enough activities
        if (activities.length >= limit) break;
    }

    return activities;
}
