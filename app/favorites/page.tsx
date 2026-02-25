import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { fetchUserFavorites } from '@/app/actions/favorites';
import { PageShell } from '@/components/layouts/PageShell';
import { getServerAuthSession } from '@/lib/auth';

import { FavoritesClient, type FavoriteRecipeCard } from './FavoritesClient';

export const revalidate = 0;

export const metadata: Metadata = {
    title: 'Meine Favoriten',
    description:
        'Deine gespeicherten Lieblingsrezepte bei KüchenTakt. Alle Rezepte, die du favorisiert hast, an einem Ort.',
};

export default async function FavoritesPage() {
    const session = await getServerAuthSession('favorites-page');

    if (!session?.user?.id) {
        redirect('/auth/signin?callbackUrl=/favorites');
    }

    const favorites = await fetchUserFavorites(session.user.id);

    return (
        <PageShell>
            <FavoritesClient initialFavorites={favorites as FavoriteRecipeCard[]} />
        </PageShell>
    );
}
