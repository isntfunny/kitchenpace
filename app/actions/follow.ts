'use server';

import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface FollowUser {
    id: string;
    name: string | null;
    nickname: string | null;
    avatar: string | null;
    bio: string | null;
    recipeCount: number;
    followerCount: number;
}

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
        return {
            id: user?.id ?? f.followerId,
            name: user?.name ?? null,
            nickname: user?.profile?.nickname ?? null,
            avatar: user?.profile?.photoUrl ?? user?.image ?? null,
            bio: user?.profile?.bio ?? null,
            recipeCount: user?.profile?.recipeCount ?? 0,
            followerCount: user?.profile?.followerCount ?? 0,
        };
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
        return {
            id: user?.id ?? f.followingId,
            name: user?.name ?? null,
            nickname: user?.profile?.nickname ?? null,
            avatar: user?.profile?.photoUrl ?? user?.image ?? null,
            bio: user?.profile?.bio ?? null,
            recipeCount: user?.profile?.recipeCount ?? 0,
            followerCount: user?.profile?.followerCount ?? 0,
        };
    });
}

export async function getCurrentUserFollowing(): Promise<Set<string>> {
    const session = await getServerAuthSession('getCurrentUserFollowing');
    if (!session?.user?.id) {
        return new Set();
    }

    const follows = await prisma.follow.findMany({
        where: { followerId: session.user.id },
        select: { followingId: true },
    });

    return new Set(follows.map((f) => f.followingId));
}
