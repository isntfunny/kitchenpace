'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { getServerAuthSession } from '@app/lib/auth';
import { extractTextFromBlocks } from '@app/lib/collections/extract-recipe-ids';
import { syncCollectionRecipes } from '@app/lib/collections/sync-recipes';
import type {
    CollectionMutationInput,
    CollectionDetail,
    CollectionCardData,
    TiptapJSON,
} from '@app/lib/collections/types';
import { createActivityLog } from '@app/lib/events/persist';
import { moderateContent, persistModerationResult } from '@app/lib/moderation/moderationService';
import { generateUniqueSlug } from '@app/lib/slug';
import { prisma } from '@shared/prisma';

// ── Shared ──────────────────────────────────────────────────────────────────

const COLLECTION_CARD_INCLUDE = {
    author: {
        include: { profile: { select: { slug: true, photoKey: true, nickname: true } } },
    },
    _count: { select: { recipes: true, favorites: true } },
} as const;

async function moderateCollectionData(
    data: Pick<CollectionMutationInput, 'title' | 'description' | 'blocks'>,
) {
    const blockText = extractTextFromBlocks(data.blocks);
    const textToModerate = [data.title, data.description, blockText].filter(Boolean).join('\n\n');

    const modResult = await moderateContent({ text: textToModerate });

    if (modResult.decision === 'REJECTED') {
        throw new Error('CONTENT_REJECTED: Deine Sammlung entspricht nicht unseren Richtlinien.');
    }

    return { blockText, modResult };
}

// ── Create ──────────────────────────────────────────────────────────────────

export async function createCollection(
    data: CollectionMutationInput,
): Promise<{ id: string; slug: string }> {
    const session = await getServerAuthSession('collection-create');
    if (!session?.user?.id) throw new Error('Unauthorized');
    const authorId = session.user.id;

    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await prisma.collection.findUnique({ where: { slug: s } });
        return !!existing;
    });

    const { blockText, modResult } = await moderateCollectionData(data);

    const collection = await prisma.collection.create({
        data: {
            title: data.title,
            slug,
            description: data.description ?? null,
            coverImageKey: data.coverImageKey ?? null,
            template: data.template,
            blocks: data.blocks ? (data.blocks as Prisma.InputJsonValue) : Prisma.JsonNull,
            authorId,
            moderationStatus: modResult.decision === 'PENDING' ? 'PENDING' : 'AUTO_APPROVED',
            aiModerationScore: modResult.score,
        },
    });

    await syncCollectionRecipes(collection.id, data.blocks).catch((err) =>
        console.error('[collections] Failed to sync recipes:', err),
    );

    if (data.tagIds?.length) {
        await prisma.collectionTag.createMany({
            data: data.tagIds.map((tagId) => ({ collectionId: collection.id, tagId })),
            skipDuplicates: true,
        });
    }
    if (data.categoryIds?.length) {
        await prisma.collectionCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({
                collectionId: collection.id,
                categoryId,
            })),
            skipDuplicates: true,
        });
    }

    await persistModerationResult('collection', collection.id, authorId, modResult, {
        title: data.title,
        description: data.description,
        text: blockText,
    }).catch((err) => console.error('[collections] Failed to persist moderation:', err));

    return { id: collection.id, slug: collection.slug };
}

// ── Update ──────────────────────────────────────────────────────────────────

export async function updateCollection(
    collectionId: string,
    data: CollectionMutationInput,
): Promise<{ id: string; slug: string }> {
    const session = await getServerAuthSession('collection-update');
    if (!session?.user?.id) throw new Error('Unauthorized');
    const authorId = session.user.id;
    const isUserAdmin = session.user.role === 'admin' || session.user.role === 'moderator';

    const existing = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!existing) throw new Error('Collection not found');
    if (existing.authorId !== authorId && !isUserAdmin) throw new Error('Unauthorized');

    const { blockText, modResult } = await moderateCollectionData(data);

    const collection = await prisma.collection.update({
        where: { id: collectionId },
        data: {
            title: data.title,
            description: data.description ?? null,
            coverImageKey: data.coverImageKey ?? null,
            template: data.template,
            blocks: data.blocks ? (data.blocks as Prisma.InputJsonValue) : Prisma.JsonNull,
            moderationStatus: modResult.decision === 'PENDING' ? 'PENDING' : 'AUTO_APPROVED',
            aiModerationScore: modResult.score,
        },
    });

    await syncCollectionRecipes(collection.id, data.blocks).catch((err) =>
        console.error('[collections] Failed to sync recipes:', err),
    );

    await prisma.collectionTag.deleteMany({ where: { collectionId } });
    if (data.tagIds?.length) {
        await prisma.collectionTag.createMany({
            data: data.tagIds.map((tagId) => ({ collectionId, tagId })),
            skipDuplicates: true,
        });
    }

    await prisma.collectionCategory.deleteMany({ where: { collectionId } });
    if (data.categoryIds?.length) {
        await prisma.collectionCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({ collectionId, categoryId })),
            skipDuplicates: true,
        });
    }

    await persistModerationResult('collection', collection.id, authorId, modResult, {
        title: data.title,
        description: data.description,
        text: blockText,
    }).catch((err) => console.error('[collections] Failed to persist moderation:', err));

    revalidatePath(`/collection/${collection.slug}`);

    return { id: collection.id, slug: collection.slug };
}

// ── Publish ─────────────────────────────────────────────────────────────────

export async function publishCollection(collectionId: string): Promise<{ slug: string }> {
    const session = await getServerAuthSession('collection-publish');
    if (!session?.user?.id) throw new Error('Unauthorized');
    const authorId = session.user.id;

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new Error('Collection not found');
    if (collection.authorId !== authorId) throw new Error('Unauthorized');
    if (collection.moderationStatus === 'REJECTED') {
        throw new Error('Abgelehnte Sammlungen können nicht veröffentlicht werden.');
    }

    await prisma.collection.update({
        where: { id: collectionId },
        data: { published: true },
    });

    await createActivityLog({
        userId: authorId,
        type: 'COLLECTION_CREATED',
        targetId: collectionId,
        targetType: 'collection',
    }).catch((err) => console.error('[collections] Failed to log activity:', err));

    revalidatePath(`/collection/${collection.slug}`);

    return { slug: collection.slug };
}

// ── Unpublish ────────────────────────────────────────────────────────────────

export async function unpublishCollection(collectionId: string): Promise<void> {
    const session = await getServerAuthSession('collection-unpublish');
    if (!session?.user?.id) throw new Error('Unauthorized');

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new Error('Collection not found');
    if (collection.authorId !== session.user.id) throw new Error('Unauthorized');

    await prisma.collection.update({
        where: { id: collectionId },
        data: { published: false },
    });

    revalidatePath(`/collection/${collection.slug}`);
    revalidatePath('/profile/collections');
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteCollection(collectionId: string): Promise<void> {
    const session = await getServerAuthSession('collection-delete');
    if (!session?.user?.id) throw new Error('Unauthorized');
    const authorId = session.user.id;
    const isUserAdmin = session.user.role === 'admin' || session.user.role === 'moderator';

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new Error('Collection not found');
    if (collection.authorId !== authorId && !isUserAdmin) throw new Error('Unauthorized');

    await prisma.collection.delete({ where: { id: collectionId } });
    revalidatePath(`/collection/${collection.slug}`);
    revalidatePath('/profile/collections');
    revalidatePath('/collections');
}

// ── Favorite ────────────────────────────────────────────────────────────────

export async function toggleCollectionFavorite(collectionId: string): Promise<boolean> {
    const session = await getServerAuthSession('collection-favorite');
    if (!session?.user?.id) throw new Error('Unauthorized');

    const existing = await prisma.collectionFavorite.findUnique({
        where: { collectionId_userId: { collectionId, userId: session.user.id } },
    });

    if (existing) {
        await prisma.collectionFavorite.delete({ where: { id: existing.id } });
        return false;
    }

    await prisma.collectionFavorite.create({
        data: { collectionId, userId: session.user.id },
    });

    await createActivityLog({
        userId: session.user.id,
        type: 'COLLECTION_FAVORITED',
        targetId: collectionId,
        targetType: 'collection',
    }).catch((err) => console.error('[collections] Failed to log favorite:', err));

    return true;
}

// ── View Tracking ───────────────────────────────────────────────────────────

export async function trackCollectionView(collectionId: string): Promise<void> {
    const session = await getServerAuthSession('collection-view');

    await prisma.$transaction([
        prisma.collectionView.create({
            data: {
                collectionId,
                userId: session?.user?.id ?? null,
            },
        }),
        prisma.collection.update({
            where: { id: collectionId },
            data: { viewCount: { increment: 1 } },
        }),
    ]);
}

// ── Queries ─────────────────────────────────────────────────────────────────

export async function fetchCollectionBySlug(
    slug: string,
    viewerId?: string | null,
    includeDrafts = false,
): Promise<CollectionDetail | null> {
    const where: Prisma.CollectionWhereInput = {
        OR: [{ slug }, { id: slug }],
    };

    if (!includeDrafts) {
        where.published = true;
        where.moderationStatus = { in: ['AUTO_APPROVED', 'APPROVED'] };
    }

    const collection = await prisma.collection.findFirst({
        where,
        include: {
            author: {
                include: { profile: { select: { slug: true, photoKey: true, nickname: true } } },
            },
            _count: {
                select: { recipes: true, favorites: true },
            },
            ...(viewerId ? { favorites: { where: { userId: viewerId }, take: 1 } } : {}),
        },
    });

    if (!collection) return null;

    return {
        id: collection.id,
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        coverImageKey: collection.coverImageKey,
        template: collection.template,
        blocks: collection.blocks as TiptapJSON | null,
        published: collection.published,
        moderationStatus: collection.moderationStatus,
        viewCount: collection.viewCount,
        authorId: collection.authorId,
        author: {
            id: collection.author.id,
            name: collection.author.profile?.nickname ?? collection.author.name,
            slug: collection.author.profile?.slug ?? collection.author.id,
            photoKey: collection.author.profile?.photoKey ?? null,
        },
        favoriteCount: collection._count.favorites,
        isFavorited: viewerId ? (collection.favorites?.length ?? 0) > 0 : false,
        recipeCount: collection._count.recipes,
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
    };
}

async function fetchPublishedCollections(
    orderBy: Prisma.CollectionOrderByWithRelationInput,
    limit: number,
): Promise<CollectionCardData[]> {
    const collections = await prisma.collection.findMany({
        where: {
            published: true,
            moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
        },
        orderBy,
        take: limit,
        include: COLLECTION_CARD_INCLUDE,
    });

    return collections.map(toCollectionCardData);
}

export async function fetchPopularCollections(limit = 8) {
    return fetchPublishedCollections({ viewCount: 'desc' }, limit);
}

export async function fetchNewestCollections(limit = 8) {
    return fetchPublishedCollections({ createdAt: 'desc' }, limit);
}

export async function fetchUserCollections(userId: string): Promise<CollectionCardData[]> {
    const collections = await prisma.collection.findMany({
        where: { authorId: userId },
        orderBy: { updatedAt: 'desc' },
        include: COLLECTION_CARD_INCLUDE,
    });

    return collections.map(toCollectionCardData);
}

function toCollectionCardData(collection: any): CollectionCardData {
    return {
        id: collection.id,
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        coverImageKey: collection.coverImageKey,
        template: collection.template,
        recipeCount: collection._count.recipes,
        viewCount: collection.viewCount,
        favoriteCount: collection._count.favorites,
        authorName: collection.author.profile?.nickname ?? collection.author.name ?? 'Anonym',
        authorSlug: collection.author.profile?.slug ?? collection.author.id,
        authorPhotoKey: collection.author.profile?.photoKey ?? null,
        published: collection.published,
        moderationStatus: collection.moderationStatus,
        createdAt: collection.createdAt.toISOString(),
    };
}
