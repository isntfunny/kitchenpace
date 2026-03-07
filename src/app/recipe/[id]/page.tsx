import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { fetchRecipeCookImages } from '@app/app/actions/cooks';
import { fetchRecipeBySlug } from '@app/app/actions/recipes';
import { isAdmin } from '@app/lib/admin/check-admin';
import { getServerAuthSession } from '@app/lib/auth';
import { getThumbnailUrlBySource } from '@app/lib/thumbnail';
import { APP_URL } from '@app/lib/url';

import { RecipeDetailClient } from './RecipeDetailClient';

export const revalidate = 60;
export const dynamicParams = true;

type RecipePageParams = {
    id: string;
};

type RecipePageProps = {
    params: RecipePageParams | Promise<RecipePageParams>;
};

const buildRecipeMetadata = async (
    recipe: Awaited<ReturnType<typeof fetchRecipeBySlug>>,
): Promise<Metadata> => {
    if (!recipe) {
        return {
            title: 'Rezept nicht gefunden | KüchenTakt',
            description: 'Das gewünschte Rezept konnte nicht gefunden werden.',
        };
    }

    const bannerUrl =
        recipe.imageKey && recipe.id
            ? await getThumbnailUrlBySource(
                  { type: 'recipe', id: recipe.id },
                  { width: 1200, height: 600 },
              )
            : '/og-image.png';

    return {
        title: `${recipe.title} | KüchenTakt`,
        description: recipe.description,
        openGraph: {
            title: `${recipe.title} | KüchenTakt`,
            description: recipe.description,
            url: `${APP_URL}/recipe/${recipe.slug}`,
            siteName: 'KüchenTakt',
            type: 'article',
            images: [
                {
                    url: bannerUrl,
                    width: 1200,
                    height: 600,
                    alt: recipe.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${recipe.title} | KüchenTakt`,
            description: recipe.description,
            images: [bannerUrl],
        },
    };
};

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const recipe = await fetchRecipeBySlug(resolvedParams.id);
    return buildRecipeMetadata(recipe);
}

export default async function RecipePage({ params }: RecipePageProps) {
    const resolvedParams = await params;
    const session = await getServerAuthSession('recipe-page');
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

    const cookImages = await fetchRecipeCookImages(resolvedParams.id);
    const isDraft = recipe.status !== 'PUBLISHED';

    return (
        <RecipeDetailClient
            recipe={recipe as any}
            author={recipe.author as any}
            recipeActivities={[]}
            cookImages={cookImages}
            isDraft={isDraft}
        />
    );
}
