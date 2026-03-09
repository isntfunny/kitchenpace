import type { ModerationQueue, Report } from '@prisma/client';

import { prisma } from '@shared/prisma';

import { publishRealtimeEvent } from './realtime/broker';

export type AdminInboxItem = {
    id: string;
    sourceId: string;
    sourceType: 'moderation_queue' | 'report';
    title: string;
    message: string;
    createdAt: string;
    href: string;
    data: {
        actor?: {
            id: string;
            name: string;
            avatar: string | null;
            slug: string;
        } | null;
        recipe?: {
            id: string;
            title: string;
            slug: string;
            image: string | null;
            topRatedCategory: string | null;
        } | null;
        cookImage?: {
            id: string;
            image: string | null;
        } | null;
        score?: number | null;
        reason?: string | null;
    };
};

async function getActorContext(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
    });

    if (!user) {
        return null;
    }

    return {
        id: user.id,
        name: user.profile?.nickname ?? user.name ?? 'Unbekannt',
        avatar: user.profile?.photoUrl ?? null,
        slug: user.profile?.slug ?? user.id,
    };
}

async function getRecipeContext(recipeId: string) {
    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: {
            id: true,
            title: true,
            slug: true,
            imageKey: true,
            categories: {
                include: {
                    category: {
                        select: {
                            name: true,
                        },
                    },
                },
                orderBy: { position: 'asc' },
                take: 1,
            },
        },
    });

    if (!recipe) {
        return null;
    }

    return {
        id: recipe.id,
        title: recipe.title,
        slug: recipe.slug,
        image: recipe.imageKey ?? null,
        topRatedCategory: recipe.categories[0]?.category.name ?? null,
    };
}

export async function serializeModerationQueueItem(
    queueItem: Pick<
        ModerationQueue,
        'id' | 'contentType' | 'contentId' | 'authorId' | 'aiScore' | 'createdAt'
    >,
): Promise<AdminInboxItem> {
    const actor = await getActorContext(queueItem.authorId);

    let recipe = null;
    let cookImage = null;

    if (queueItem.contentType === 'recipe') {
        recipe = await getRecipeContext(queueItem.contentId);
    }

    if (queueItem.contentType === 'cook_image') {
        const image = await prisma.cookImage.findUnique({
            where: { id: queueItem.contentId },
            select: {
                id: true,
                imageKey: true,
                recipeId: true,
            },
        });

        if (image) {
            cookImage = {
                id: image.id,
                image: image.imageKey ?? null,
            };
            recipe = await getRecipeContext(image.recipeId);
        }
    }

    return {
        id: `moderation_queue:${queueItem.id}`,
        sourceId: queueItem.id,
        sourceType: 'moderation_queue',
        title: 'Moderation wartet',
        message: `${actor?.name ?? 'Ein Nutzer'} hat einen neuen Moderationsfall ausgelöst`,
        createdAt: queueItem.createdAt.toISOString(),
        href: '/moderation',
        data: {
            actor,
            recipe,
            cookImage,
            score: Number(queueItem.aiScore.toFixed(2)),
        },
    };
}

export async function serializeReportItem(
    report: Pick<
        Report,
        'id' | 'reporterId' | 'contentType' | 'contentId' | 'reason' | 'createdAt'
    >,
): Promise<AdminInboxItem> {
    const actor = await getActorContext(report.reporterId);
    let recipe = report.contentType === 'recipe' ? await getRecipeContext(report.contentId) : null;
    let cookImage = null;

    if (report.contentType === 'cook_image') {
        const image = await prisma.cookImage.findUnique({
            where: { id: report.contentId },
            select: {
                id: true,
                imageKey: true,
                recipeId: true,
            },
        });

        if (image) {
            cookImage = {
                id: image.id,
                image: image.imageKey ?? null,
            };
            recipe = await getRecipeContext(image.recipeId);
        }
    }

    return {
        id: `report:${report.id}`,
        sourceId: report.id,
        sourceType: 'report',
        title: 'Neue Meldung',
        message: `${actor?.name ?? 'Ein Nutzer'} hat einen Inhalt gemeldet`,
        createdAt: report.createdAt.toISOString(),
        href: '/moderation?tab=reports',
        data: {
            actor,
            recipe,
            cookImage,
            reason: report.reason,
        },
    };
}

export async function fetchAdminInboxItems(limit = 50): Promise<AdminInboxItem[]> {
    const [queueItems, reports] = await Promise.all([
        prisma.moderationQueue.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                contentType: true,
                contentId: true,
                authorId: true,
                aiScore: true,
                createdAt: true,
            },
        }),
        prisma.report.findMany({
            where: { resolved: false },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                reporterId: true,
                contentType: true,
                contentId: true,
                reason: true,
                createdAt: true,
            },
        }),
    ]);

    const items = await Promise.all([
        ...queueItems.map(serializeModerationQueueItem),
        ...reports.map(serializeReportItem),
    ]);

    return items
        .sort((a, b) => {
            if (a.createdAt === b.createdAt) {
                return b.id.localeCompare(a.id);
            }
            return b.createdAt.localeCompare(a.createdAt);
        })
        .slice(0, limit);
}

export async function publishAdminInboxCreated(item: AdminInboxItem) {
    await publishRealtimeEvent('admin-notifications', {
        id: item.id,
        createdAt: item.createdAt,
        type: 'admin-inbox.created',
        payload: item,
    });
}

export async function publishAdminInboxRemoved(id: string) {
    await publishRealtimeEvent('admin-notifications', {
        id,
        createdAt: new Date().toISOString(),
        type: 'admin-inbox.removed',
        payload: { id },
    });
}
