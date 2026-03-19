'use server';

import { revalidatePath } from 'next/cache';

import { getServerAuthSession } from '@app/lib/auth';
import {
    createScheduleSegment,
    deleteScheduleSegment,
    updateScheduleSegment,
} from '@app/lib/twitch/schedule';
import { prisma } from '@shared/prisma';

export async function updateNextStream(recipeId: string, plannedAt?: string, timezone?: string) {
    const session = await getServerAuthSession('actions/twitch');
    if (!session?.user?.id) throw new Error('Unauthorized');

    const userId = session.user.id;

    // Fetch recipe title + existing segment ID in parallel (independent queries)
    const [recipe, existing] = await Promise.all([
        prisma.recipe.findFirstOrThrow({
            where: { id: recipeId, status: 'PUBLISHED' },
            select: { title: true },
        }),
        prisma.twitchStream.findUnique({
            where: { userId },
            select: { twitchSegmentId: true },
        }),
    ]);

    const segmentInput = plannedAt
        ? {
              title: `Live kochen: ${recipe.title}`,
              startDate: new Date(plannedAt),
              timezone: timezone ?? 'Europe/Berlin',
          }
        : null;

    // Sync to Twitch Schedule (best-effort)
    let twitchSegmentId = existing?.twitchSegmentId ?? null;
    try {
        if (segmentInput) {
            if (twitchSegmentId) {
                await updateScheduleSegment(userId, twitchSegmentId, segmentInput);
            } else {
                twitchSegmentId = await createScheduleSegment(userId, segmentInput);
            }
        } else if (twitchSegmentId) {
            await deleteScheduleSegment(userId, twitchSegmentId);
            twitchSegmentId = null; // Only cleared after successful delete
        }
    } catch (err) {
        // On failure, preserve existing twitchSegmentId so we don't lose the reference
        twitchSegmentId = existing?.twitchSegmentId ?? null;
        console.warn('[Twitch Schedule] Sync failed, saving locally anyway', {
            error: err instanceof Error ? err.message : String(err),
        });
    }

    const data = {
        nextRecipeId: recipeId,
        plannedAt: plannedAt ? new Date(plannedAt) : null,
        plannedTimezone: timezone ?? null,
        twitchSegmentId,
    };
    await prisma.twitchStream.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
    });

    revalidatePath('/profile/edit');
}

export async function clearNextStream() {
    const session = await getServerAuthSession('actions/twitch');
    if (!session?.user?.id) throw new Error('Unauthorized');

    const userId = session.user.id;

    const existing = await prisma.twitchStream.findUnique({
        where: { userId },
        select: { twitchSegmentId: true },
    });

    // Delete from Twitch Schedule (best-effort)
    if (existing?.twitchSegmentId) {
        try {
            await deleteScheduleSegment(userId, existing.twitchSegmentId);
        } catch (err) {
            console.warn('[Twitch Schedule] Delete failed', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    await prisma.twitchStream.update({
        where: { userId },
        data: {
            nextRecipeId: null,
            plannedAt: null,
            plannedTimezone: null,
            twitchSegmentId: null,
        },
    });

    revalidatePath('/profile/edit');
}
