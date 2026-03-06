import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Header } from '@app/components/features/Header';
import { getAllCategories, getAllTags } from '@app/components/recipe/actions';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';

import { ImportRecipeClient } from './ImportRecipeClient';

export const metadata: Metadata = {
    title: 'Rezept importieren',
    description: 'Importiere ein Rezept von einer externen URL bei KüchenTakt.',
};

export default async function ImportRecipePage() {
    const session = await getServerAuthSession('recipe/create/import');

    if (!session?.user?.id) {
        logMissingSession(session, 'recipe/create/import');
        redirect('/auth/signin');
    }

    const [categories, tags] = await Promise.all([getAllCategories(), getAllTags()]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--colors-background)', color: 'var(--colors-text)' }}>
            <Header />
            <main>
                <ImportRecipeClient categories={categories} tags={tags} authorId={session.user.id} />
            </main>
        </div>
    );
}
