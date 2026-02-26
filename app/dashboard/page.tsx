import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { fetchUserStats } from '@/app/actions/user';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { PageShell } from '@/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { getOrCreateProfile } from '@/lib/profile';

export const metadata: Metadata = {
    title: 'Dashboard',
    description:
        'Dein persönliches KüchenTakt Dashboard. Statistiken, Aktivitäten und Übersicht über deine Kochaktivitäten.',
    robots: {
        index: false,
        follow: false,
    },
};

export const dynamic = 'force-dynamic';

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

    const stats = await fetchUserStats(session.user.id);

    return (
        <PageShell>
            <UserDashboard
                userName={profile.nickname ?? 'KüchenFan'}
                userEmail={session.user.email ?? ''}
                userPhoto={profile.photoUrl ?? undefined}
                stats={[
                    {
                        id: '1',
                        label: 'Rezepte erstellt',
                        value: stats.recipeCount,
                        icon: '📝',
                        color: '#e07b53',
                    },
                    {
                        id: '2',
                        label: 'Favoriten',
                        value: stats.favoriteCount,
                        icon: '❤️',
                        color: '#fd79a8',
                    },
                    {
                        id: '3',
                        label: 'Gekochte Gerichte',
                        value: stats.cookedCount,
                        icon: '🍳',
                        color: '#00b894',
                    },
                    {
                        id: '4',
                        label: 'Bewertungen',
                        value: stats.ratingCount,
                        icon: '⭐',
                        color: '#f8b500',
                    },
                ]}
            />
        </PageShell>
    );
}
