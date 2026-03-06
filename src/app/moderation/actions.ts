'use server';

import { ModerationStatus, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

async function requireModerator() {
    const session = await getServerAuthSession('moderation-action');
    if (!session?.user?.id) throw new Error('Nicht angemeldet');

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== Role.ADMIN && user?.role !== Role.MODERATOR) {
        throw new Error('Keine Berechtigung');
    }

    return session.user.id;
}

export async function fetchModerationQueue(status?: ModerationStatus) {
    await requireModerator();

    return prisma.moderationQueue.findMany({
        where: status ? { status } : { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        include: {
            author: {
                select: { id: true, name: true, email: true },
            },
        },
        take: 100,
    });
}

export async function fetchReports(resolved?: boolean) {
    await requireModerator();

    return prisma.report.findMany({
        where: resolved !== undefined ? { resolved } : { resolved: false },
        orderBy: { createdAt: 'desc' },
        include: {
            reporter: {
                select: { id: true, name: true, email: true },
            },
        },
        take: 100,
    });
}

export async function approveContent(queueId: string, reviewNote?: string) {
    const actorId = await requireModerator();

    const queueItem = await prisma.moderationQueue.findUnique({ where: { id: queueId } });
    if (!queueItem) throw new Error('Eintrag nicht gefunden');

    // Update queue status
    await prisma.moderationQueue.update({
        where: { id: queueId },
        data: {
            status: 'APPROVED',
            reviewedBy: actorId,
            reviewedAt: new Date(),
            reviewNote,
        },
    });

    // Update the original content record
    if (queueItem.contentType === 'recipe') {
        // Check snapshot for intended status
        const snapshot = queueItem.contentSnapshot as Record<string, unknown> | null;
        const intendedPublish = snapshot?.intendedStatus === 'PUBLISHED';

        await prisma.recipe.update({
            where: { id: queueItem.contentId },
            data: {
                moderationStatus: 'APPROVED',
                moderationNote: null,
                ...(intendedPublish ? { status: 'PUBLISHED', publishedAt: new Date() } : {}),
            },
        });
    } else if (queueItem.contentType === 'comment') {
        await prisma.comment.update({
            where: { id: queueItem.contentId },
            data: {
                moderationStatus: 'APPROVED',
                isHidden: false,
                moderationNote: null,
            },
        });
    } else if (queueItem.contentType === 'cook_image') {
        await prisma.cookImage.update({
            where: { id: queueItem.contentId },
            data: {
                moderationStatus: 'APPROVED',
                isHidden: false,
            },
        });
    }

    // Write audit log
    await prisma.moderationLog.create({
        data: {
            actorId,
            action: 'approve',
            contentType: queueItem.contentType,
            contentId: queueItem.contentId,
            reason: reviewNote,
        },
    });

    // Send notification to author
    await prisma.notification.create({
        data: {
            userId: queueItem.authorId,
            type: 'SYSTEM',
            title: 'Inhalt freigegeben',
            message: 'Dein Inhalt wurde überprüft und freigegeben.',
        },
    });

    revalidatePath('/moderation');
}

export async function rejectContent(queueId: string, reviewNote: string) {
    const actorId = await requireModerator();

    if (!reviewNote.trim()) {
        throw new Error('Bitte gib einen Grund für die Ablehnung an');
    }

    const queueItem = await prisma.moderationQueue.findUnique({ where: { id: queueId } });
    if (!queueItem) throw new Error('Eintrag nicht gefunden');

    // Update queue status
    await prisma.moderationQueue.update({
        where: { id: queueId },
        data: {
            status: 'REJECTED',
            reviewedBy: actorId,
            reviewedAt: new Date(),
            reviewNote,
        },
    });

    // Update the original content record
    if (queueItem.contentType === 'recipe') {
        await prisma.recipe.update({
            where: { id: queueItem.contentId },
            data: {
                moderationStatus: 'REJECTED',
                moderationNote: reviewNote,
                status: 'ARCHIVED',
            },
        });
    } else if (queueItem.contentType === 'comment') {
        await prisma.comment.update({
            where: { id: queueItem.contentId },
            data: {
                moderationStatus: 'REJECTED',
                isHidden: true,
                moderationNote: reviewNote,
            },
        });
    } else if (queueItem.contentType === 'cook_image') {
        await prisma.cookImage.update({
            where: { id: queueItem.contentId },
            data: {
                moderationStatus: 'REJECTED',
                isHidden: true,
            },
        });
    }

    // Write audit log
    await prisma.moderationLog.create({
        data: {
            actorId,
            action: 'reject',
            contentType: queueItem.contentType,
            contentId: queueItem.contentId,
            reason: reviewNote,
        },
    });

    // Send notification to author
    await prisma.notification.create({
        data: {
            userId: queueItem.authorId,
            type: 'SYSTEM',
            title: 'Inhalt abgelehnt',
            message: `Dein Inhalt wurde abgelehnt: ${reviewNote}`,
        },
    });

    revalidatePath('/moderation');
}

export async function resolveReport(reportId: string) {
    const actorId = await requireModerator();

    await prisma.report.update({
        where: { id: reportId },
        data: {
            resolved: true,
            resolvedBy: actorId,
        },
    });

    await prisma.moderationLog.create({
        data: {
            actorId,
            action: 'resolve_report',
            contentType: 'report',
            contentId: reportId,
        },
    });

    revalidatePath('/moderation');
}

export async function getModerationStats() {
    await requireModerator();

    const [pendingCount, reportCount] = await Promise.all([
        prisma.moderationQueue.count({ where: { status: 'PENDING' } }),
        prisma.report.count({ where: { resolved: false } }),
    ]);

    return { pendingCount, reportCount };
}
