import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PageShell } from '@/components/layouts/PageShell';
import { getOrCreateProfile } from '@/lib/profile';

import { ProfileEditClient } from './ProfileEditClient';

export default async function ProfileEditPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id, session.user.email ?? '');

    return (
        <PageShell>
            <ProfileEditClient profile={profile} />
        </PageShell>
    );
}
