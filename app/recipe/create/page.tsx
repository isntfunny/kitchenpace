import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Heading, Text } from '@/components/atoms/Typography';
import { PageShell } from '@/components/layouts/PageShell';
import { getAllCategories, getAllTags } from '@/components/recipe/actions';
import { RecipeForm } from '@/components/recipe/RecipeForm';
import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { css } from 'styled-system/css';
import { stack } from 'styled-system/patterns';

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

    const [categories, tags] = await Promise.all([getAllCategories(), getAllTags()]);

    return (
        <PageShell>
            <div className={pageLayoutClass}>
                <div className={headerStackClass}>
                    <Heading as="h1" size="xl">
                        Neues Rezept erstellen
                    </Heading>
                    <Text size="md" color="muted">
                        Teile dein Rezept mit der KüchenTakt Community.
                    </Text>
                </div>
                <div className={formWrapperClass}>
                    <RecipeForm categories={categories} tags={tags} authorId={session.user.id} />
                </div>
            </div>
        </PageShell>
    );
}

const pageLayoutClass = css({
    maxWidth: '960px',
    marginX: 'auto',
    px: { base: '4', md: '6' },
    py: { base: '6', md: '8' },
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
});

const headerStackClass = stack({
    gap: '1',
    maxWidth: '640px',
});

const formWrapperClass = css({
    width: 'full',
});
