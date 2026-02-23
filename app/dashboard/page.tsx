import { redirect } from 'next/navigation';

import { UserDashboard as UserDashboardComponent } from '@/components/dashboard/UserDashboard';
import { Header } from '@/components/features/Header';
import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { getOrCreateProfile } from '@/lib/profile';

export default async function DashboardPage() {
    const session = await getServerAuthSession('dashboard');

    if (!session?.user?.id) {
        logMissingSession(session, 'dashboard');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id, session.user.email ?? '');

    if (!profile) {
        logAuth('warn', 'dashboard: profile missing', {
            userId: session.user.id,
        });
        redirect('/auth/signin');
    }

    return (
        <>
            <Header />
            <UserDashboardComponent
                userName={profile.nickname ?? 'KüchenFan'}
                userEmail={session.user.email ?? ''}
                userPhoto={profile.photoUrl ?? undefined}
            />
        </>
    );
}
