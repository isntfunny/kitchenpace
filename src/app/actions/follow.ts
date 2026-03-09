'use server';

import { getServerAuthSession } from '@app/lib/auth';
import { type FollowUser, mapUserToFollowDisplay } from '@app/lib/user-utils';
import { prisma } from '@shared/prisma';

export type { FollowUser };

export async function fetchUserFollowers(userId: string, take = 20): Promise<FollowUser[]> {
    const follows = await prisma.follow.findMany({
        where: { followingId: userId },
        orderBy: { createdAt: 'desc' },
        take,
    });

    const userIds = follows.map((f) => f.followerId);
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return follows.map((f) => {
        const user = userMap.get(f.followerId);
        if (!user) return mapUserToFollowDisplay({ id: f.followerId });
        return mapUserToFollowDisplay(user);
    });
}

export async function fetchUserFollowing(userId: string, take = 20): Promise<FollowUser[]> {
    const follows = await prisma.follow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' },
        take,
    });

    const userIds = follows.map((f) => f.followingId);
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return follows.map((f) => {
        const user = userMap.get(f.followingId);
        if (!user) return mapUserToFollowDisplay({ id: f.followingId });
        return mapUserToFollowDisplay(user);
    });
}

export async function getCurrentUserFollowing(): Promise<Set<string>> {
    const session = await getServerAuthSession('getCurrentUserFollowing');
    const userId = session?.user?.id;
    if (!userId) {
        return new Set();
    }

    const follows = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
    });

    return new Set(follows.map((f) => f.followingId));
}
