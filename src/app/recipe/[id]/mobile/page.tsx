import { notFound } from 'next/navigation';

import { fetchRecipeBySlug } from '@app/app/actions/recipes';
import { isAdmin } from '@app/lib/admin/check-admin';
import { getServerAuthSession } from '@app/lib/auth';

import { MobileRecipeClient } from './MobileRecipeClient';

type MobileRecipePageParams = {
    id: string;
};

type MobileRecipePageProps = {
    params: MobileRecipePageParams | Promise<MobileRecipePageParams>;
};

export const revalidate = 60;
export const dynamicParams = true;

export default async function MobileRecipePage({ params }: MobileRecipePageProps) {
    const resolvedParams = await params;
    const session = await getServerAuthSession('recipe-mobile-page');
    const viewerId = session?.user?.id;

    // First try published lookup
    let recipe = await fetchRecipeBySlug(resolvedParams.id, viewerId);

    // If not found, check if it's a draft the viewer is allowed to see
    if (!recipe && viewerId) {
        const draft = await fetchRecipeBySlug(resolvedParams.id, viewerId, true);
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
