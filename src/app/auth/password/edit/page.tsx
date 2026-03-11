import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { getOrCreateProfile } from '@app/lib/profile';

import { PasswordEditClient } from './PasswordEditClient';

export const metadata: Metadata = {
    title: 'Passwort ändern',
};

export const dynamic = 'force-dynamic';

export default async function EditPasswordPage() {
    const session = await getServerAuthSession('auth/password/edit');

    if (!session?.user?.id) {
        logMissingSession(session, 'auth/password/edit');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id);

    return <PasswordEditClient userSlug={profile?.slug ?? undefined} />;
}
