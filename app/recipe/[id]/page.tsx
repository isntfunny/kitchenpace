import { Metadata } from 'next';

import { fetchRecipeCookImages } from '@/app/actions/cooks';
import { fetchRecipeBySlug } from '@/app/actions/recipes';
import { getServerAuthSession } from '@/lib/auth';
import { getThumbnailUrlBySource } from '@/lib/thumbnail';
import { css } from 'styled-system/css';
import { container } from 'styled-system/patterns';

import { RecipeDetailClient } from './RecipeDetailClient';

export const revalidate = 60;
export const dynamicParams = true;

type RecipePageParams = {
    id: string;
};

type RecipePageProps = {
    params: RecipePageParams | Promise<RecipePageParams>;
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitchenpace.app').replace(/\/$/, '');

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
            url: `${SITE_URL}/recipe/${recipe.id}`,
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
    const [session, cookImages] = await Promise.all([
        getServerAuthSession('recipe-page'),
        fetchRecipeCookImages(resolvedParams.id),
    ]);
    const recipe = await fetchRecipeBySlug(resolvedParams.id, session?.user?.id);

    if (!recipe) {
        return (
            <div className={css({ minH: '100vh', color: 'text' })}>
                <main className={container({ maxW: '1400px', mx: 'auto', px: '4', py: '8' })}>
                    <div className={css({ textAlign: 'center', py: '20' })}>
                        <h1 className={css({ fontFamily: 'heading', fontSize: '3xl', mb: '4' })}>
                            Rezept nicht gefunden
                        </h1>
                        <p className={css({ color: 'text-muted' })}>
                            Das gesuchte Rezept existiert leider nicht.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <RecipeDetailClient
            recipe={recipe as any}
            author={recipe.author as any}
            recipeActivities={[]}
            cookImages={cookImages}
        />
    );
}
