import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { fetchUserRecipes } from '@app/app/actions/user';
import { PageShell } from '@app/components/layouts/PageShell';
import { UserRecipeTable } from '@app/components/recipe/UserRecipeTable';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { getOrCreateProfile } from '@app/lib/profile';
import { css } from 'styled-system/css';

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

    const profile = await getOrCreateProfile(session.user.id);

    if (!profile) {
        redirect('/auth/signin');
    }

    const recipes = await fetchUserRecipes(session.user.id);

    return (
        <PageShell>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
                <div>
                    <h1
                        className={css({
                            fontSize: '2xl',
                            fontWeight: 800,
                            color: 'text',
                        })}
                    >
                        Meine Rezepte
                    </h1>
                    <p className={css({ color: 'foreground.muted', fontSize: 'sm', mt: '1' })}>
                        Verwalte deine Entwürfe und veröffentlichten Rezepte.
                    </p>
                </div>

                <UserRecipeTable recipes={recipes} />
            </div>
        </PageShell>
    );
}
