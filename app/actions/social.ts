'use server';

import { ActivityType, NotificationType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type AuthenticatedUser = {
    id: string;
    email?: string | null;
    name?: string | null;
};

const SIGNIN_ERROR = new Error('NOT_AUTHENTICATED');

async function requireAuth(context: string): Promise<AuthenticatedUser> {
    const session = await getServerAuthSession(context);
    if (!session?.user?.id) {
        throw SIGNIN_ERROR;
    }

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
    };
}

function buildRecipePaths(recipeId: string, slug?: string | null) {
    const paths = new Set<string>([`/recipe/${recipeId}`]);
    if (slug && slug !== recipeId) {
        paths.add(`/recipe/${slug}`);
    }
    return Array.from(paths);
}

async function ensureProfileCounts(
    userId: string,
    emailFallback: string,
    data: Partial<{ followerCount: number; followingCount: number }>,
) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const email = user?.email ?? emailFallback;

    await prisma.profile.upsert({
        where: { userId },
        create: {
            userId,
            email,
            followerCount: data.followerCount ?? 0,
            followingCount: data.followingCount ?? 0,
        },
        update: {
            ...(data.followerCount !== undefined ? { followerCount: data.followerCount } : {}),
            ...(data.followingCount !== undefined ? { followingCount: data.followingCount } : {}),
        },
    });
}

export async function toggleFavoriteAction(recipeId: string) {
    const viewer = await requireAuth('toggleFavoriteAction');

    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true, slug: true, authorId: true, title: true },
    });

    if (!recipe) {
        throw new Error('RECIPE_NOT_FOUND');
    }

    const favoriteKey = {
        recipeId_userId: {
            recipeId,
            userId: viewer.id,
        },
    } as const;

    const existing = await prisma.favorite.findUnique({ where: favoriteKey });

    if (existing) {
        await prisma.favorite.delete({ where: { id: existing.id } });
        await prisma.activityLog.create({
            data: {
                userId: viewer.id,
                type: ActivityType.RECIPE_UNFAVORITED,
                targetId: recipeId,
                targetType: 'recipe',
            },
        });
    } else {
        await prisma.favorite.create({
            data: { recipeId, userId: viewer.id },
        });
        await prisma.activityLog.create({
            data: {
                userId: viewer.id,
                type: ActivityType.RECIPE_FAVORITED,
                targetId: recipeId,
                targetType: 'recipe',
            },
        });

        if (recipe.authorId && recipe.authorId !== viewer.id) {
            await prisma.notification.create({
                data: {
                    userId: recipe.authorId,
                    type: NotificationType.RECIPE_LIKE,
                    title: 'Neues Lieblingsrezept',
                    message: `${viewer.name ?? 'Jemand'} hat ${recipe.title} gespeichert`,
                    data: { recipeId, userId: viewer.id },
                },
            });
        }
    }

    const favoriteCount = await prisma.favorite.count({ where: { recipeId } });

    for (const path of buildRecipePaths(recipeId, recipe.slug)) {
        revalidatePath(path);
    }
    revalidatePath('/favorites');

    return {
        isFavorite: !existing,
        favoriteCount,
    };
}

export async function rateRecipeAction(recipeId: string, rawRating: number) {
    const viewer = await requireAuth('rateRecipeAction');

    if (Number.isNaN(rawRating)) {
        throw new Error('INVALID_RATING');
    }

    const rating = Math.min(5, Math.max(1, Math.round(rawRating)));

    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true, slug: true, authorId: true, title: true },
    });

    if (!recipe) {
        throw new Error('RECIPE_NOT_FOUND');
    }

    const ratingKey = {
        recipeId_userId: { recipeId, userId: viewer.id },
    } as const;

    const existing = await prisma.userRating.findUnique({ where: ratingKey });

    await prisma.userRating.upsert({
        where: ratingKey,
        update: { rating },
        create: { recipeId, userId: viewer.id, rating },
    });

    const aggregation = await prisma.userRating.aggregate({
        where: { recipeId },
        _avg: { rating: true },
        _count: { rating: true },
    });

    const average = Number((aggregation._avg.rating ?? rating).toFixed(2));
    const count = aggregation._count.rating;

    await prisma.recipe.update({
        where: { id: recipeId },
        data: {
            rating: average,
            ratingCount: count,
        },
    });

    await prisma.activityLog.create({
        data: {
            userId: viewer.id,
            type: ActivityType.RECIPE_RATED,
            targetId: recipeId,
            targetType: 'recipe',
            metadata: { rating },
        },
    });

    if (recipe.authorId && recipe.authorId !== viewer.id) {
        await prisma.notification.create({
            data: {
                userId: recipe.authorId,
                type: NotificationType.RECIPE_RATING,
                title: 'Neue Rezeptbewertung',
                message: `${viewer.name ?? 'Ein Koch'} hat ${rating}★ für ${recipe.title} vergeben`,
                data: { recipeId, rating },
            },
        });
    }

    for (const path of buildRecipePaths(recipeId, recipe.slug)) {
        revalidatePath(path);
    }

    return {
        rating,
        average,
        count,
        updatedExisting: Boolean(existing),
    };
}

export async function toggleFollowAction(targetUserId: string, options?: { recipeId?: string }) {
    const viewer = await requireAuth('toggleFollowAction');

    if (viewer.id === targetUserId) {
        throw new Error('CANNOT_FOLLOW_SELF');
    }

    const [targetUser] = await Promise.all([
        prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, email: true, name: true },
        }),
    ]);

    if (!targetUser) {
        throw new Error('USER_NOT_FOUND');
    }

    const followKey = {
        followerId_followingId: {
            followerId: viewer.id,
            followingId: targetUserId,
        },
    } as const;

    const existing = await prisma.follow.findUnique({ where: followKey });

    if (existing) {
        await prisma.follow.delete({ where: { id: existing.id } });
    } else {
        await prisma.follow.create({ data: { followerId: viewer.id, followingId: targetUserId } });
        await prisma.activityLog.create({
            data: {
                userId: viewer.id,
                type: ActivityType.USER_FOLLOWED,
                targetId: targetUserId,
                targetType: 'user',
            },
        });

        await prisma.notification.create({
            data: {
                userId: targetUserId,
                type: NotificationType.NEW_FOLLOWER,
                title: 'Neuer Follower',
                message: `${viewer.name ?? 'Ein Koch'} folgt dir jetzt`,
                data: { followerId: viewer.id },
            },
        });
    }

    const [followerCount, followingCount] = await Promise.all([
        prisma.follow.count({ where: { followingId: targetUserId } }),
        prisma.follow.count({ where: { followerId: viewer.id } }),
    ]);

    await Promise.all([
        ensureProfileCounts(targetUserId, `${targetUserId}@kitchenpace.local`, { followerCount }),
        ensureProfileCounts(viewer.id, `${viewer.id}@kitchenpace.local`, { followingCount }),
    ]);

    revalidatePath(`/user/${targetUserId}`);
    revalidatePath(`/user/${viewer.id}`);

    if (options?.recipeId) {
        const recipe = await prisma.recipe.findUnique({
            where: { id: options.recipeId },
            select: { slug: true, id: true },
        });
        if (recipe) {
            for (const path of buildRecipePaths(recipe.id, recipe.slug)) {
                revalidatePath(path);
            }
        }
    }

    return {
        isFollowing: !existing,
        followerCount,
    };
}

export async function markRecipeCookedAction(
    recipeId: string,
    options?: {
        servings?: number;
        notes?: string;
        imageData?: {
            buffer: Buffer;
            filename: string;
            contentType: string;
        };
    },
) {
    const viewer = await requireAuth('markRecipeCookedAction');

    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true, slug: true, title: true, authorId: true, cookCount: true },
    });

    if (!recipe) {
        throw new Error('RECIPE_NOT_FOUND');
    }

    let imageUrl: string | undefined;
    let imageKey: string | undefined;

    if (options?.imageData) {
        const { uploadFile } = await import('@/lib/s3');
        const result = await uploadFile(
            options.imageData.buffer,
            options.imageData.filename,
            options.imageData.contentType,
            'cook',
        );
        imageUrl = result.url;
        imageKey = result.key;
    }

    const hasImage = Boolean(imageUrl);

    const cookHistory = await prisma.userCookHistory.create({
        data: {
            userId: viewer.id,
            recipeId,
            servings: options?.servings,
            notes: options?.notes,
            imageUrl,
            imageKey,
        },
    });

    if (hasImage) {
        await prisma.cookImage.create({
            data: {
                userId: viewer.id,
                recipeId,
                imageUrl: imageUrl!,
                imageKey,
            },
        });
    }

    await prisma.recipe.update({
        where: { id: recipeId },
        data: {
            cookCount: { increment: 1 },
        },
    });

    await prisma.activityLog.create({
        data: {
            userId: viewer.id,
            type: ActivityType.RECIPE_COOKED,
            targetId: recipeId,
            targetType: 'recipe',
            metadata: {
                servings: options?.servings,
                notes: options?.notes,
                hasImage: Boolean(imageUrl),
            },
        },
    });

    if (recipe.authorId && recipe.authorId !== viewer.id) {
        await prisma.notification.create({
            data: {
                userId: recipe.authorId,
                type: NotificationType.RECIPE_LIKE,
                title: 'Rezept gekocht',
                message: `${viewer.name ?? 'Ein Koch'} hat ${recipe.title} gekocht${
                    imageUrl ? ' und ein Foto geteilt' : ''
                }`,
                data: { recipeId, userId: viewer.id },
            },
        });
    }

    for (const path of buildRecipePaths(recipeId, recipe.slug)) {
        revalidatePath(path);
    }

    return {
        success: true,
        cookId: cookHistory.id,
        hasImage: Boolean(imageUrl),
        cookCount: (recipe.cookCount ?? 0) + 1,
    };
}
