import { redirect } from 'next/navigation';

import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { getOrCreateProfile } from '@app/lib/profile';
import { TWITCH_PROVIDER_ID } from '@app/lib/twitch/api';
import { prisma } from '@shared/prisma';

import { NextStreamCard } from './NextStreamCard';
import { ProfileEditClient } from './ProfileEditClient';

export default async function ProfileEditPage() {
    const session = await getServerAuthSession('profile/edit');

    if (!session?.user?.id) {
        logMissingSession(session, 'profile/edit');
        redirect('/auth/signin');
    }

    const [profile, twitchAccount, plannedStreams] = await Promise.all([
        getOrCreateProfile(session.user.id),
        prisma.account.findFirst({
            where: { userId: session.user.id, providerId: TWITCH_PROVIDER_ID },
            select: { accountId: true },
        }),
        prisma.plannedStream.findMany({
            where: { userId: session.user.id },
            orderBy: { plannedAt: 'asc' },
            select: {
                id: true,
                plannedAt: true,
                recipe: {
                    select: {
                        id: true,
                        slug: true,
                        title: true,
                        totalTime: true,
                        imageKey: true,
                        categories: {
                            select: { category: { select: { name: true } } },
                            take: 1,
                        },
                    },
                },
            },
        }),
    ]);

    if (!profile) {
        logAuth('warn', 'profile/edit: profile missing', {
            userId: session.user.id,
        });
        redirect('/auth/signin');
    }

    const streams = plannedStreams.map((ps) => ({
        id: ps.id,
        plannedAt: ps.plannedAt?.toISOString() ?? null,
        recipe: {
            id: ps.recipe.id,
            slug: ps.recipe.slug,
            title: ps.recipe.title,
            category: ps.recipe.categories[0]?.category.name ?? 'Hauptgericht',
            totalTime: ps.recipe.totalTime,
            imageKey: ps.recipe.imageKey,
        },
    }));

    return (
        <PageShell>
            <ProfileEditClient profile={profile} />
            {twitchAccount && <NextStreamCard plannedStreams={streams} />}
        </PageShell>
    );
}
