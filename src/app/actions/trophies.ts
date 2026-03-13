'use server';

import { getServerAuthSession } from '@app/lib/auth';
import { publishRealtimeEvent } from '@app/lib/realtime/broker';
import { TROPHIES, TROPHY_STREAM_EVENT, type TrophyId } from '@app/lib/trophies/registry';
import { prisma } from '@shared/prisma';

// ---------------------------------------------------------------------------
// Award a trophy to the current user.
// Idempotent: silently returns { newlyEarned: false } if already earned.
// ---------------------------------------------------------------------------

export async function awardTrophy(trophyId: TrophyId): Promise<{ newlyEarned: boolean }> {
    const trophy = TROPHIES[trophyId];
    if (!trophy) {
        throw new Error(`Unknown trophy: ${trophyId}`);
    }

    const session = await getServerAuthSession('awardTrophy');
    if (!session?.user?.id) {
        return { newlyEarned: false };
    }

    const userId = session.user.id;

    const existing = await prisma.userTrophy.findUnique({
        where: { userId_trophyId: { userId, trophyId } },
    });

    if (existing) {
        return { newlyEarned: false };
    }

    await prisma.$transaction([
        prisma.userTrophy.create({
            data: { userId, trophyId },
        }),
        prisma.user.update({
            where: { id: userId },
            data: { trophyPoints: { increment: trophy.points } },
        }),
    ]);

    await publishRealtimeEvent(`notifications:user:${userId}`, {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        type: TROPHY_STREAM_EVENT,
        payload: {
            trophyId: trophy.id,
            name: trophy.name,
            description: trophy.description,
            icon: trophy.icon,
            points: trophy.points,
        },
    });

    return { newlyEarned: true };
}

// ---------------------------------------------------------------------------
// Fetch all trophies a user has earned (for profile display).
// ---------------------------------------------------------------------------

export async function fetchUserTrophies(userId: string) {
    const earned = await prisma.userTrophy.findMany({
        where: { userId },
        include: { trophy: true },
        orderBy: { earnedAt: 'desc' },
    });

    return earned.map((ut) => ({
        id: ut.trophy.id,
        groupSlug: ut.trophy.groupSlug,
        tier: ut.trophy.tier,
        category: ut.trophy.category,
        name: ut.trophy.name,
        description: ut.trophy.description,
        icon: ut.trophy.icon,
        points: ut.trophy.points,
        earnedAt: ut.earnedAt,
    }));
}

// ---------------------------------------------------------------------------
// Lightweight badge data: highest tier + count for Avatar trophy badges.
// ---------------------------------------------------------------------------

const TIER_RANK: Record<string, number> = {
    NONE: 0,
    BRONZE: 1,
    SILVER: 2,
    GOLD: 3,
    PLATINUM: 4,
};

export interface TrophyBadge {
    tier: import('@prisma/client').TrophyTier;
    count: number;
}

export async function fetchTrophyBadge(userId: string): Promise<TrophyBadge | null> {
    const trophies = await prisma.userTrophy.findMany({
        where: { userId },
        include: { trophy: { select: { tier: true } } },
    });

    if (trophies.length === 0) return null;

    let highest = trophies[0].trophy.tier;
    for (const ut of trophies) {
        if ((TIER_RANK[ut.trophy.tier] ?? 0) > (TIER_RANK[highest] ?? 0)) {
            highest = ut.trophy.tier;
        }
    }

    return { tier: highest, count: trophies.length };
}

/** Batch fetch trophy badges for multiple users at once. */
export async function fetchTrophyBadges(userIds: string[]): Promise<Map<string, TrophyBadge>> {
    if (userIds.length === 0) return new Map();

    const trophies = await prisma.userTrophy.findMany({
        where: { userId: { in: userIds } },
        include: { trophy: { select: { tier: true } } },
    });

    const byUser = new Map<string, { tiers: string[]; count: number }>();
    for (const ut of trophies) {
        const entry = byUser.get(ut.userId) ?? { tiers: [], count: 0 };
        entry.tiers.push(ut.trophy.tier);
        entry.count++;
        byUser.set(ut.userId, entry);
    }

    const result = new Map<string, TrophyBadge>();
    for (const [uid, { tiers, count }] of byUser) {
        let highest = tiers[0];
        for (const t of tiers) {
            if ((TIER_RANK[t] ?? 0) > (TIER_RANK[highest] ?? 0)) highest = t;
        }
        result.set(uid, { tier: highest as TrophyBadge['tier'], count });
    }

    return result;
}
