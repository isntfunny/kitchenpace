'use server';

import { revalidatePath } from 'next/cache';

import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

export async function updateNextStream(recipeId: string, plannedAt?: string, timezone?: string) {
    const session = await getServerAuthSession('actions/twitch');
    if (!session?.user?.id) throw new Error('Unauthorized');

    await prisma.twitchStream.upsert({
        where: { userId: session.user.id },
        create: {
            userId: session.user.id,
            nextRecipeId: recipeId,
            plannedAt: plannedAt ? new Date(plannedAt) : null,
            plannedTimezone: timezone ?? null,
        },
        update: {
            nextRecipeId: recipeId,
            plannedAt: plannedAt ? new Date(plannedAt) : null,
            plannedTimezone: timezone ?? null,
        },
    });

    revalidatePath('/profile/edit');
}

export async function clearNextStream() {
    const session = await getServerAuthSession('actions/twitch');
    if (!session?.user?.id) throw new Error('Unauthorized');

    await prisma.twitchStream.updateMany({
        where: { userId: session.user.id },
        data: { nextRecipeId: null, plannedAt: null, plannedTimezone: null },
    });

    revalidatePath('/profile/edit');
}
