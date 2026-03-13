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
