import { redirect } from 'next/navigation';

import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { getOrCreateProfile } from '@app/lib/profile';

import { ProfileEditClient } from './ProfileEditClient';

export default async function ProfileEditPage() {
    const session = await getServerAuthSession('profile/edit');

    if (!session?.user?.id) {
        logMissingSession(session, 'profile/edit');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id);

    if (!profile) {
        logAuth('warn', 'profile/edit: profile missing', {
            userId: session.user.id,
        });
        redirect('/auth/signin');
    }

    return (
        <PageShell>
            <ProfileEditClient profile={profile} email={session.user.email ?? ''} />
        </PageShell>
    );
}
