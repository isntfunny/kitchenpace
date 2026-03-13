import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { FullWidthShell } from '@app/components/layouts/FullWidthShell';
import { getAllCategories, getAllTags, getTagFacets } from '@app/components/recipe/actions';
import { RecipeForm } from '@app/components/recipe/RecipeForm';
import { RECIPE_CREATION_TUTORIAL_KEY } from '@app/components/recipe/tutorial/shared';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

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

    const tutorialCompletion = await prisma.userTutorialCompletion.findUnique({
        where: {
            userId_tutorialKey: {
                userId: session.user.id,
                tutorialKey: RECIPE_CREATION_TUTORIAL_KEY,
            },
        },
        select: { id: true },
    });

    return (
        <FullWidthShell>
            <RecipeForm
                categories={categories}
                tags={tags}
                tagFacets={tagFacets}
                authorId={session.user.id}
                layout="sidebar"
                initialShouldShowTutorial={!tutorialCompletion}
            />
        </FullWidthShell>
    );
}
