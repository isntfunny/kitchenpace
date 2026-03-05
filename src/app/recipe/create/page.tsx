import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { FullWidthShell } from '@app/components/layouts/FullWidthShell';
import { getAllCategories, getAllTags, getTagFacets } from '@app/components/recipe/actions';
import { RecipeForm } from '@app/components/recipe/RecipeForm';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';

export const metadata: Metadata = {
    title: 'Rezept erstellen',
    description:
        'Erstelle ein neues Rezept bei KüchenTakt. Teile deine kulinarischen Kreationen mit unserer Community.',
};

export default async function CreateRecipePage() {
    const session = await getServerAuthSession('recipe/create');

    if (!session?.user?.id) {
        logMissingSession(session, 'recipe/create');
        redirect('/auth/signin');
    }

    const [categories, tags, tagFacets] = await Promise.all([
        getAllCategories(),
        getAllTags(),
        getTagFacets(),
    ]);

    return (
        <FullWidthShell>
            <RecipeForm
                categories={categories}
                tags={tags}
                tagFacets={tagFacets}
                authorId={session.user.id}
                layout="sidebar"
            />
        </FullWidthShell>
    );
}
