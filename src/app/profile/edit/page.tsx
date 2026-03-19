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

    const [profile, twitchAccount, twitchStream] = await Promise.all([
        getOrCreateProfile(session.user.id),
        prisma.account.findFirst({
            where: { userId: session.user.id, providerId: TWITCH_PROVIDER_ID },
            select: { accountId: true },
        }),
        prisma.twitchStream.findUnique({
            where: { userId: session.user.id },
            select: {
                plannedAt: true,
                nextRecipe: {
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

    const currentRecipe = twitchStream?.nextRecipe
        ? {
              id: twitchStream.nextRecipe.id,
              slug: twitchStream.nextRecipe.slug,
              title: twitchStream.nextRecipe.title,
              category: twitchStream.nextRecipe.categories[0]?.category.name ?? 'Hauptgericht',
              totalTime: twitchStream.nextRecipe.totalTime,
              imageKey: twitchStream.nextRecipe.imageKey,
          }
        : null;

    return (
        <PageShell>
            <ProfileEditClient profile={profile} />
            {twitchAccount && (
                <NextStreamCard
                    currentRecipe={currentRecipe}
                    currentPlannedAt={twitchStream?.plannedAt?.toISOString() ?? null}
                />
            )}
        </PageShell>
    );
}
