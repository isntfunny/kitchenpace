import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { fetchRecipeForEdit } from '@app/app/actions/recipes';
import { FullWidthShell } from '@app/components/layouts/FullWidthShell';
import { getAllCategories, getAllTags, getTagFacets } from '@app/components/recipe/actions';
import { RecipeForm } from '@app/components/recipe/RecipeForm';
import { isAdmin } from '@app/lib/admin/check-admin';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';

interface EditRecipePageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditRecipePageProps): Promise<Metadata> {
    const { id } = await params;
    const session = await getServerAuthSession('recipe/edit');
    if (!session?.user?.id) return { title: 'Rezept bearbeiten' };

    const userIsAdmin = await isAdmin(session.user.id);
    const recipe = await fetchRecipeForEdit(id, session.user.id, userIsAdmin);
    return {
        title: recipe ? `${recipe.title} bearbeiten` : 'Rezept bearbeiten',
    };
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
    const { id } = await params;
    const session = await getServerAuthSession('recipe/edit');

    if (!session?.user?.id) {
        logMissingSession(session, 'recipe/edit');
        redirect('/auth/signin');
    }

    const userIsAdmin = await isAdmin(session.user.id);
    const [recipe, categories, tags, tagFacets] = await Promise.all([
        fetchRecipeForEdit(id, session.user.id, userIsAdmin),
        getAllCategories(),
        getAllTags(),
        getTagFacets(),
    ]);

    if (!recipe) {
        notFound();
    }

    return (
        <FullWidthShell>
            <RecipeForm
                categories={categories}
                tags={tags}
                tagFacets={tagFacets}
                authorId={recipe.authorId}
                initialData={recipe}
                layout="sidebar"
            />
        </FullWidthShell>
    );
}
