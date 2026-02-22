import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { UserDashboard as UserDashboardComponent } from '@/components/dashboard/UserDashboard';
import { Header } from '@/components/features/Header';
import { RecipeTabs } from '@/components/features/RecipeTabs';
import { getOrCreateProfile } from '@/lib/profile';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id, session.user.email ?? '');

    return (
        <>
            <Header />
            <RecipeTabs />
            <UserDashboardComponent
                userName={profile.nickname ?? 'KüchenFan'}
                userEmail={session.user.email ?? ''}
                userPhoto={profile.photoUrl ?? undefined}
            />
        </>
    );
}
