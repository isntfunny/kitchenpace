'use server';

import { revalidatePath } from 'next/cache';

import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

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

export interface UserCookImageData {
    id: string;
    imageUrl: string;
    imageKey: string | null;
    caption: string | null;
    moderationStatus: string;
    createdAt: Date;
    recipe: {
        id: string;
        title: string;
        slug: string;
    };
}

export async function fetchUserOwnCookImages(userId: string): Promise<UserCookImageData[]> {
    const images = await prisma.cookImage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
            recipe: {
                select: { id: true, title: true, slug: true },
            },
        },
    });

    return images.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        imageKey: img.imageKey ?? null,
        caption: img.caption,
        moderationStatus: img.moderationStatus,
        createdAt: img.createdAt,
        recipe: img.recipe,
    }));
}

export async function deleteUserCookImage(imageId: string): Promise<void> {
    const session = await getServerAuthSession('actions/deleteUserCookImage');
    if (!session?.user?.id) throw new Error('Nicht angemeldet');

    const image = await prisma.cookImage.findUnique({
        where: { id: imageId },
        select: { userId: true, imageKey: true },
    });

    if (!image) throw new Error('Bild nicht gefunden');
    if (image.userId !== session.user.id) throw new Error('Keine Berechtigung');

    // Delete from S3 if key exists
    if (image.imageKey) {
        const { deleteFile } = await import('@app/lib/s3');
        await deleteFile(image.imageKey).catch(() => {});
    }

    await prisma.cookImage.delete({ where: { id: imageId } });
    revalidatePath('/profile/my-images');
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
                    imageKey: true,
                },
            },
        },
    });

    return history;
}
