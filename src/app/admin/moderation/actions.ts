'use server';

import { ModerationStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { publishAdminInboxRemoved } from '@app/lib/admin-inbox';
import { getServerAuthSession } from '@app/lib/auth';
import { createUserNotification } from '@app/lib/events/persist';
import {
    approveRecipeImage,
    approveRecipeImageByKey,
    approveCommentImage,
    approveCookImage,
    approveStepImage,
    approveProfileImage,
    rejectRecipeImageByKey,
    rejectCommentImage,
    rejectCookImage,
    rejectStepImage,
    rejectProfileImage,
} from '@app/lib/image-approval';
import { prisma } from '@shared/prisma';

async function requireModerator() {
    const session = await getServerAuthSession('moderation-action');
    if (!session?.user?.id) throw new Error('Nicht angemeldet');

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== 'admin' && user?.role !== 'moderator') {
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

        const updatedRecipe = await prisma.recipe.update({
            where: { id: queueItem.contentId },
            data: {
                moderationStatus: 'APPROVED',
                moderationNote: null,
                ...(intendedPublish ? { status: 'PUBLISHED', publishedAt: new Date() } : {}),
            },
            select: { id: true, imageKey: true },
        });

        if (updatedRecipe.imageKey) {
            await approveRecipeImage(updatedRecipe.id, updatedRecipe.imageKey);
        }
    } else if (queueItem.contentType === 'recipe_image') {
        await approveRecipeImageByKey(queueItem.contentId);
    } else if (queueItem.contentType === 'comment') {
        const comment = await prisma.comment.update({
            where: { id: queueItem.contentId },
            data: { moderationStatus: 'APPROVED', isHidden: false, moderationNote: null },
            select: { id: true, imageKey: true },
        });
        if (comment.imageKey) {
            await approveCommentImage(comment.id, comment.imageKey);
        }
    } else if (queueItem.contentType === 'cook_image') {
        const cookImage = await prisma.cookImage.update({
            where: { id: queueItem.contentId },
            data: { moderationStatus: 'APPROVED', isHidden: false },
            select: { id: true, imageKey: true },
        });
        if (cookImage.imageKey) {
            await approveCookImage(cookImage.id, cookImage.imageKey);
        }
    } else if (queueItem.contentType === 'step_image') {
        await approveStepImage(queueItem.contentId);
    } else if (queueItem.contentType === 'profile') {
        await approveProfileImage(queueItem.authorId, queueItem.contentId);
    } else if (queueItem.contentType === 'collection') {
        await prisma.collection.update({
            where: { id: queueItem.contentId },
            data: { moderationStatus: 'APPROVED', moderationNote: null, published: true },
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
    const isImage = ['cook_image', 'recipe_image', 'step_image', 'profile'].includes(
        queueItem.contentType,
    );
    await createUserNotification({
        userId: queueItem.authorId,
        type: 'SYSTEM',
        title: isImage
            ? 'Bild freigegeben'
            : queueItem.contentType === 'recipe'
              ? 'Rezept freigegeben'
              : 'Inhalt freigegeben',
        message: isImage
            ? 'Dein Bild ist jetzt sichtbar!'
            : queueItem.contentType === 'recipe'
              ? 'Dein Rezept wurde geprüft und ist jetzt öffentlich sichtbar!'
              : 'Dein Inhalt wurde überprüft und freigegeben.',
    });

    await publishAdminInboxRemoved(`moderation_queue:${queueItem.id}`);

    revalidatePath('/admin/moderation');
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
        const recipe = await prisma.recipe.update({
            where: { id: queueItem.contentId },
            data: { moderationStatus: 'REJECTED', moderationNote: reviewNote, status: 'ARCHIVED' },
            select: { imageKey: true },
        });
        if (recipe.imageKey) {
            await rejectRecipeImageByKey(recipe.imageKey);
        }
    } else if (queueItem.contentType === 'recipe_image') {
        await rejectRecipeImageByKey(queueItem.contentId);
    } else if (queueItem.contentType === 'comment') {
        const comment = await prisma.comment.update({
            where: { id: queueItem.contentId },
            data: { moderationStatus: 'REJECTED', isHidden: true, moderationNote: reviewNote },
            select: { imageKey: true },
        });
        if (comment.imageKey) {
            await rejectCommentImage(comment.imageKey);
        }
    } else if (queueItem.contentType === 'cook_image') {
        const cookImage = await prisma.cookImage.update({
            where: { id: queueItem.contentId },
            data: { moderationStatus: 'REJECTED', isHidden: true },
            select: { imageKey: true },
        });
        if (cookImage.imageKey) {
            await rejectCookImage(cookImage.imageKey);
        }
    } else if (queueItem.contentType === 'step_image') {
        await rejectStepImage(queueItem.contentId);
    } else if (queueItem.contentType === 'profile') {
        await rejectProfileImage(queueItem.contentId);
    } else if (queueItem.contentType === 'collection') {
        await prisma.collection.update({
            where: { id: queueItem.contentId },
            data: { moderationStatus: 'REJECTED', moderationNote: reviewNote, published: false },
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
    const isImageReject = ['cook_image', 'recipe_image', 'step_image', 'profile'].includes(
        queueItem.contentType,
    );
    await createUserNotification({
        userId: queueItem.authorId,
        type: 'SYSTEM',
        title: isImageReject
            ? 'Bild abgelehnt'
            : queueItem.contentType === 'recipe'
              ? 'Rezept abgelehnt'
              : 'Inhalt abgelehnt',
        message: isImageReject
            ? `Dein Bild entspricht leider nicht unseren Richtlinien: ${reviewNote}`
            : queueItem.contentType === 'recipe'
              ? `Dein Rezept wurde abgelehnt: ${reviewNote}`
              : `Dein Inhalt wurde abgelehnt: ${reviewNote}`,
    });

    await publishAdminInboxRemoved(`moderation_queue:${queueItem.id}`);

    revalidatePath('/admin/moderation');
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

    await publishAdminInboxRemoved(`report:${reportId}`);

    await prisma.moderationLog.create({
        data: {
            actorId,
            action: 'resolve_report',
            contentType: 'report',
            contentId: reportId,
        },
    });

    revalidatePath('/admin/moderation');
}

export async function getModerationStats() {
    await requireModerator();

    const [pendingCount, reportCount] = await Promise.all([
        prisma.moderationQueue.count({ where: { status: 'PENDING' } }),
        prisma.report.count({ where: { resolved: false } }),
    ]);

    return { pendingCount, reportCount };
}
