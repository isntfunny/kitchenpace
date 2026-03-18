import { redirect } from 'next/navigation';

import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { getOrCreateProfile } from '@app/lib/profile';
import { prisma } from '@shared/prisma';

import { NextStreamCard } from './NextStreamCard';
import { ProfileEditClient } from './ProfileEditClient';

export default async function ProfileEditPage() {
    const session = await getServerAuthSession('profile/edit');

    if (!session?.user?.id) {
        logMissingSession(session, 'profile/edit');
        redirect('/auth/signin');
    }

    const [profile, twitchStream, userRecipes] = await Promise.all([
        getOrCreateProfile(session.user.id),
        prisma.twitchStream.findUnique({
            where: { userId: session.user.id },
            select: {
                nextRecipeId: true,
                plannedAt: true,
                plannedTimezone: true,
                nextRecipe: { select: { id: true, title: true } },
            },
        }),
        prisma.recipe.findMany({
            where: { authorId: session.user.id, status: 'PUBLISHED' },
            select: { id: true, title: true },
            orderBy: { title: 'asc' },
        }),
    ]);

    if (!profile) {
        logAuth('warn', 'profile/edit: profile missing', {
            userId: session.user.id,
        });
        redirect('/auth/signin');
    }

    return (
        <PageShell>
            <ProfileEditClient profile={profile} />
            {profile.twitchId && (
                <NextStreamCard
                    recipes={userRecipes}
                    currentRecipeId={twitchStream?.nextRecipeId ?? null}
                    currentPlannedAt={twitchStream?.plannedAt?.toISOString() ?? null}
                />
            )}
        </PageShell>
    );
}
