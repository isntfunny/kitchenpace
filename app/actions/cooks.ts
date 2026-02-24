'use server';

import { prisma } from '@/lib/prisma';

export interface CookImageData {
    id: string;
    imageUrl: string;
    imageKey?: string | null;
    caption: string | null;
    createdAt: Date;
    user: {
        id: string;
        name: string | null;
        nickname: string | null;
        avatar: string | null;
    };
}

export async function fetchRecipeCookImages(slugOrId: string): Promise<CookImageData[]> {
    const recipe = await prisma.recipe.findFirst({
        where: {
            OR: [{ slug: slugOrId }, { id: slugOrId }],
        },
        select: { id: true },
    });

    if (!recipe) {
        return [];
    }

    const images = await prisma.cookImage.findMany({
        where: { recipeId: recipe.id },
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    profile: {
                        select: {
                            nickname: true,
                            photoUrl: true,
                        },
                    },
                },
            },
        },
    });

    return images.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        imageKey: img.imageKey ?? null,
        caption: img.caption,
        createdAt: img.createdAt,
        user: {
            id: img.user.id,
            name: img.user.name ?? img.user.profile?.nickname ?? 'Unbekannt',
            nickname: img.user.profile?.nickname ?? null,
            avatar: img.user.profile?.photoUrl ?? null,
        },
    }));
}

export async function fetchUserCookHistory(userId: string, take = 10) {
    const history = await prisma.userCookHistory.findMany({
        where: { userId },
        orderBy: { cookedAt: 'desc' },
        take,
        include: {
            recipe: {
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    imageUrl: true,
                },
            },
        },
    });

    return history;
}
