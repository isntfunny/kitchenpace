import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { fetchRecipeBySlug } from '@app/app/actions/recipes';
import { isAdmin } from '@app/lib/admin/check-admin';
import { getServerAuthSession } from '@app/lib/auth';
import { APP_URL } from '@app/lib/url';

import { MobileRecipeClient } from './MobileRecipeClient';

type MobileRecipePageParams = {
    id: string;
};

type MobileRecipePageProps = {
    params: MobileRecipePageParams | Promise<MobileRecipePageParams>;
};

export const revalidate = 60;
export const dynamicParams = true;

// Dedupes the recipe fetch between generateMetadata and the page render
const getRecipe = cache((slug: string, viewerId: string | undefined, includeDrafts: boolean) =>
    fetchRecipeBySlug(slug, viewerId, includeDrafts),
);

// Duplicate of /recipe/[slug] for the in-app mobile flow — canonicalize to the main page
export async function generateMetadata({ params }: MobileRecipePageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const recipe = await getRecipe(resolvedParams.id, undefined, false);
    if (!recipe) return { title: 'Rezept nicht gefunden' };
    return {
        title: recipe.title,
        alternates: { canonical: `${APP_URL}/recipe/${recipe.slug}` },
    };
}

export default async function MobileRecipePage({ params }: MobileRecipePageProps) {
    const resolvedParams = await params;
    const session = await getServerAuthSession('recipe-mobile-page');
    const viewerId = session?.user?.id;

    // First try published lookup
    let recipe = await getRecipe(resolvedParams.id, viewerId, false);

    // If not found, check if it's a draft the viewer is allowed to see
    if (!recipe && viewerId) {
        const draft = await getRecipe(resolvedParams.id, viewerId, true);
        if (draft) {
            const viewerIsAuthor = draft.authorId === viewerId;
            const viewerIsAdmin = await isAdmin(viewerId);
            if (viewerIsAuthor || viewerIsAdmin) {
                recipe = draft;
            }
        }
    }

    if (!recipe) {
        notFound();
    }

    return <MobileRecipeClient recipe={recipe as any} />;
}
