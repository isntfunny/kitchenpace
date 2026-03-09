import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Header } from '@app/components/features/Header';
import { getAllCategories, getAllTags } from '@app/components/recipe/actions';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';

import { ImportModeSwitcher } from './ImportModeSwitcher';

// NEVER index this page — it is a private AI tool for authenticated users only
export const metadata: Metadata = {
    title: 'Rezept importieren',
    robots: { index: false, follow: false },
};

export default async function ImportRecipePage() {
    const session = await getServerAuthSession('recipe/create/import');

    if (!session?.user?.id) {
        logMissingSession(session, 'recipe/create/import');
        redirect('/auth/signin');
    }

    const [categories, tags] = await Promise.all([getAllCategories(), getAllTags()]);

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--colors-background)',
                color: 'var(--colors-text)',
            }}
        >
            <Header />
            <main>
                <ImportModeSwitcher
                    categories={categories}
                    tags={tags}
                    authorId={session.user.id}
                />
            </main>
        </div>
    );
}
