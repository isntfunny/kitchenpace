import { ChefHat, FileText, Heart, Star } from 'lucide-react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { fetchUserDraftRecipes, fetchUserStats } from '@/app/actions/user';
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
    const draftRecipes = await fetchUserDraftRecipes(session.user.id);

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
                        icon: <FileText size={20} />,
                        color: '#e07b53',
                    },
                    {
                        id: '2',
                        label: 'Entwürfe',
                        value: stats.draftCount,
                        icon: <FileText size={20} />,
                        color: '#6c5ce7',
                    },
                    {
                        id: '3',
                        label: 'Favoriten',
                        value: stats.favoriteCount,
                        icon: <Heart size={20} />,
                        color: '#fd79a8',
                    },
                    {
                        id: '4',
                        label: 'Gekochte Gerichte',
                        value: stats.cookedCount,
                        icon: <ChefHat size={20} />,
                        color: '#00b894',
                    },
                    {
                        id: '5',
                        label: 'Bewertungen',
                        value: stats.ratingCount,
                        icon: <Star size={20} />,
                        color: '#f8b500',
                    },
                ]}
                draftRecipes={draftRecipes}
            />
        </PageShell>
    );
}
