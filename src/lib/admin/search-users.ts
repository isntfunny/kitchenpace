'use server';

import { getThumbnailUrl } from '@app/lib/thumbnail-client';
import { prisma } from '@shared/prisma';

export async function searchUsers(query: string) {
    if (!query || query.length < 2) {
        return [];
    }

    const users = await prisma.user.findMany({
        where: {
            isActive: true,
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { profile: { nickname: { contains: query, mode: 'insensitive' } } },
            ],
        },
        select: {
            id: true,
            name: true,
            image: true,
            role: true,
            profile: { select: { id: true, nickname: true, photoKey: true, recipeCount: true } },
        },
        orderBy: { name: 'asc' },
        take: 10,
    });

    return users.map((user) => ({
        id: user.id,
        name: user.name ?? user.profile?.nickname ?? 'Unbekannt',
        nickname: user.profile?.nickname ?? null,
        role: user.role,
        photoKey: user.profile?.photoKey ?? null,
        avatar: user.profile?.photoKey
            ? getThumbnailUrl(user.profile.photoKey, '1:1', 96)
            : (user.image ?? null),
        recipeCount: user.profile?.recipeCount ?? 0,
    }));
}
