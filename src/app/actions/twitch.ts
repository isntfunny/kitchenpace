'use server';

import { revalidatePath } from 'next/cache';

import { getServerAuthSession } from '@app/lib/auth';
import {
    createScheduleSegment,
    deleteScheduleSegment,
    updateScheduleSegment,
} from '@app/lib/twitch/schedule';
import { prisma } from '@shared/prisma';

export async function planStream(
    recipeId: string,
    plannedAt?: string,
    timezone?: string,
): Promise<{ id: string } | { error: string }> {
    const session = await getServerAuthSession('actions/twitch');
    if (!session?.user?.id) throw new Error('Unauthorized');

    const userId = session.user.id;

    const recipe = await prisma.recipe.findFirst({
        where: { id: recipeId, status: 'PUBLISHED' },
        select: { title: true },
    });

    if (!recipe) {
        return {
            error: 'Dieses Rezept ist nicht veröffentlicht und kann nicht für einen Stream geplant werden.',
        };
    }

    const segmentInput = plannedAt
        ? {
              title: `Live kochen: ${recipe.title}`,
              startDate: new Date(plannedAt),
              timezone: timezone ?? 'Europe/Berlin',
          }
        : null;

    // Sync to Twitch Schedule (best-effort)
    let twitchSegmentId: string | null = null;
    try {
        if (segmentInput) {
            twitchSegmentId = await createScheduleSegment(userId, segmentInput);
        }
    } catch (err) {
        console.warn('[Twitch Schedule] Sync failed, saving locally anyway', {
            error: err instanceof Error ? err.message : String(err),
        });
    }

    const planned = await prisma.plannedStream.create({
        data: {
            userId,
            recipeId,
            plannedAt: plannedAt ? new Date(plannedAt) : null,
            plannedTimezone: timezone ?? null,
            twitchSegmentId,
        },
    });

    revalidatePath('/profile/edit');
    return { id: planned.id };
}

export async function updatePlannedStream(
    plannedStreamId: string,
    recipeId: string,
    plannedAt?: string,
    timezone?: string,
) {
    const session = await getServerAuthSession('actions/twitch');
    if (!session?.user?.id) throw new Error('Unauthorized');

    const userId = session.user.id;

    const [recipe, existing] = await Promise.all([
        prisma.recipe.findFirstOrThrow({
            where: { id: recipeId, status: 'PUBLISHED' },
            select: { title: true },
        }),
        prisma.plannedStream.findUniqueOrThrow({
            where: { id: plannedStreamId, userId },
            select: { twitchSegmentId: true, plannedAt: true },
        }),
    ]);

    // Only allow editing future or unscheduled streams
    if (existing.plannedAt && existing.plannedAt < new Date()) {
        throw new Error('Cannot edit past streams');
    }

    const segmentInput = plannedAt
        ? {
              title: `Live kochen: ${recipe.title}`,
              startDate: new Date(plannedAt),
              timezone: timezone ?? 'Europe/Berlin',
          }
        : null;

    let twitchSegmentId = existing.twitchSegmentId;
    try {
        if (segmentInput) {
            if (twitchSegmentId) {
                await updateScheduleSegment(userId, twitchSegmentId, segmentInput);
            } else {
                twitchSegmentId = await createScheduleSegment(userId, segmentInput);
            }
        } else if (twitchSegmentId) {
            await deleteScheduleSegment(userId, twitchSegmentId);
            twitchSegmentId = null;
        }
    } catch (err) {
        twitchSegmentId = existing.twitchSegmentId;
        console.warn('[Twitch Schedule] Sync failed, saving locally anyway', {
            error: err instanceof Error ? err.message : String(err),
        });
    }

    await prisma.plannedStream.update({
        where: { id: plannedStreamId },
        data: {
            recipeId,
            plannedAt: plannedAt ? new Date(plannedAt) : null,
            plannedTimezone: timezone ?? null,
            twitchSegmentId,
        },
    });

    revalidatePath('/profile/edit');
}

export async function deletePlannedStream(plannedStreamId: string) {
    const session = await getServerAuthSession('actions/twitch');
    if (!session?.user?.id) throw new Error('Unauthorized');

    const userId = session.user.id;

    const existing = await prisma.plannedStream.findUnique({
        where: { id: plannedStreamId, userId },
        select: { twitchSegmentId: true, plannedAt: true },
    });

    if (!existing) return;

    // Only allow deleting future or unscheduled streams
    if (existing.plannedAt && existing.plannedAt < new Date()) {
        throw new Error('Cannot delete past streams');
    }

    // Delete from Twitch Schedule (best-effort)
    if (existing.twitchSegmentId) {
        try {
            await deleteScheduleSegment(userId, existing.twitchSegmentId);
        } catch (err) {
            console.warn('[Twitch Schedule] Delete failed', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    await prisma.plannedStream.delete({
        where: { id: plannedStreamId },
    });

    revalidatePath('/profile/edit');
}
