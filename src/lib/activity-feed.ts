import { fetchTrophyBadges } from '@app/app/actions/trophies';
import { prisma } from '@shared/prisma';

import { ACTIVITY_DECOR, mapLogToFeedItem, type ActivityFeedItem } from './activity-utils';

export type ActivityFeedScope = 'global' | { type: 'user'; userId: string };

export async function hydrateActivityFeedItems(
    logs: Array<{
        id: string;
        userId: string;
        type: string;
        targetType: string | null;
        targetId: string | null;
        metadata: unknown;
        createdAt: Date;
    }>,
    scope: ActivityFeedScope,
): Promise<ActivityFeedItem[]> {
    if (logs.length === 0) {
        return [];
    }

    const userIds = [...new Set(logs.map((log) => log.userId))];
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true },
    });

    // Fetch trophy badges for all users in one batch
    const trophyBadges = await fetchTrophyBadges(userIds);

    const userMap = new Map(
        users.map((user) => {
            const badge = trophyBadges.get(user.id);
            return [user.id, { ...user, _trophyTier: badge?.tier ?? null }] as const;
        }),
    );

    const recipeIds = Array.from(
        new Set(
            logs
                .filter((log) => log.targetType === 'recipe' && log.targetId)
                .map((log) => log.targetId as string),
        ),
    );
    const recipes =
        recipeIds.length > 0
            ? await prisma.recipe.findMany({
                  where: { id: { in: recipeIds } },
                  select: { id: true, title: true, slug: true },
              })
            : [];
    const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

    const followTargetIds = Array.from(
        new Set(
            logs
                .filter((log) => log.type === 'USER_FOLLOWED' && log.targetId)
                .map((log) => log.targetId as string),
        ),
    );
    const targetUsers =
        followTargetIds.length > 0
            ? await prisma.user.findMany({
                  where: { id: { in: followTargetIds } },
                  include: { profile: true },
              })
            : [];
    const targetUserMap = new Map(targetUsers.map((user) => [user.id, user]));

    const visibleUserIds =
        scope === 'global'
            ? new Set(
                  users
                      .filter((user) => user.profile?.showInActivity !== false)
                      .map((user) => user.id),
              )
            : null;

    // Build per-user privacy maps for granular activity type filtering (global scope only)
    const privacyHiddenTypes =
        scope === 'global'
            ? new Map(
                  users.map((user) => {
                      const hidden = new Set<string>();
                      if (user.profile?.ratingsPublic === false) hidden.add('RECIPE_RATED');
                      if (user.profile?.favoritesPublic === false) hidden.add('RECIPE_FAVORITED');
                      if (user.profile?.followsPublic === false) hidden.add('USER_FOLLOWED');
                      if (user.profile?.cookedPublic === false) hidden.add('RECIPE_COOKED');
                      return [user.id, hidden] as const;
                  }),
              )
            : null;

    const baseItems = logs
        .filter((log) => {
            if (!ACTIVITY_DECOR[log.type]) {
                return false;
            }

            if (scope === 'global' && visibleUserIds && !visibleUserIds.has(log.userId)) {
                return false;
            }

            if (privacyHiddenTypes?.get(log.userId)?.has(log.type)) {
                return false;
            }

            return true;
        })
        .map((log) =>
            mapLogToFeedItem(log, userMap, recipeMap, targetUserMap, {
                respectShowInActivity: scope === 'global',
            }),
        )
        .filter((item): item is ActivityFeedItem => item !== null);

    if (scope === 'global') {
        return baseItems;
    }

    return baseItems.filter((item) => item.userId === scope.userId);
}

export async function fetchActivityFeed(
    scope: ActivityFeedScope,
    take: number,
): Promise<ActivityFeedItem[]> {
    const knownTypes = new Set(Object.keys(ACTIVITY_DECOR));
    const where = scope === 'global' ? {} : { userId: scope.userId };

    const allLogs = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: take * 2,
    });

    const logs = allLogs.filter((log) => knownTypes.has(log.type)).slice(0, take);
    return hydrateActivityFeedItems(logs, scope);
}

export async function fetchActivityFeedAfterCursor(
    scope: ActivityFeedScope,
    take: number,
    cursor: { createdAt: Date; id: string } | null,
): Promise<ActivityFeedItem[]> {
    if (!cursor) {
        return [];
    }

    const allLogs = await prisma.activityLog.findMany({
        where: {
            ...(scope === 'global' ? {} : { userId: scope.userId }),
            OR: [
                { createdAt: { gt: cursor.createdAt } },
                {
                    createdAt: cursor.createdAt,
                    id: { gt: cursor.id },
                },
            ],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take,
    });

    return hydrateActivityFeedItems(allLogs, scope);
}
