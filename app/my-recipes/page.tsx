import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { fetchUserRecipes } from '@/app/actions/user';
import { PageShell } from '@/components/layouts/PageShell';
import { RecipeList } from '@/components/recipe/RecipeList';
import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { getOrCreateProfile } from '@/lib/profile';

export const metadata: Metadata = {
    title: 'Meine Rezepte',
    description: 'Verwalte deine erstellten Rezepte - Entwürfe und veröffentlichte Rezepte.',
};

export const dynamic = 'force-dynamic';

export default async function MyRecipesPage() {
    const session = await getServerAuthSession('my-recipes');

    if (!session?.user?.id) {
        logMissingSession(session, 'my-recipes');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id, session.user.email ?? '');

    if (!profile) {
        redirect('/auth/signin');
    }

    const recipes = await fetchUserRecipes(session.user.id);

    return (
        <PageShell>
            <div
                style={{
                    maxWidth: '1200px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                    paddingTop: '1.5rem',
                    paddingBottom: '1.5rem',
                }}
            >
                <div style={{ marginBottom: '2rem' }}>
                    <h1
                        style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            marginBottom: '0.5rem',
                        }}
                    >
                        Meine Rezepte
                    </h1>
                    <p style={{ color: '#666' }}>
                        Verwalte deine Entwürfe und veröffentlichten Rezepte.
                    </p>
                </div>

                <RecipeList recipes={recipes} />
            </div>
        </PageShell>
    );
}
