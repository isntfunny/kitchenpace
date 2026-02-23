import { redirect } from 'next/navigation';

import { PageShell } from '@/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { getOrCreateProfile } from '@/lib/profile';

import { ProfileEditClient } from './ProfileEditClient';

export default async function ProfileEditPage() {
    const session = await getServerAuthSession('profile/edit');

    if (!session?.user?.id) {
        logMissingSession(session, 'profile/edit');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id, session.user.email ?? '');

    if (!profile) {
        logAuth('warn', 'profile/edit: profile missing', {
            userId: session.user.id,
        });
        redirect('/auth/signin');
    }

    return (
        <PageShell>
            <ProfileEditClient profile={profile} />
        </PageShell>
    );
}
