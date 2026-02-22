import { Metadata } from 'next';

import { fetchRecipeBySlug } from '@/app/actions/recipes';
import { css } from 'styled-system/css';
import { container } from 'styled-system/patterns';

import { RecipeDetailClient } from './RecipeDetailClient';

type RecipePageParams = {
    id: string;
};

type RecipePageProps = {
    params: RecipePageParams | Promise<RecipePageParams>;
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitchenpace.app').replace(/\/$/, '');

const buildRecipeMetadata = (recipe: Awaited<ReturnType<typeof fetchRecipeBySlug>>): Metadata => {
    if (!recipe) {
        return {
            title: 'Rezept nicht gefunden | KüchenTakt',
            description: 'Das gewünschte Rezept konnte nicht gefunden werden.',
        };
    }

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
                    url: recipe.image,
                    alt: recipe.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${recipe.title} | KüchenTakt`,
            description: recipe.description,
            images: [recipe.image],
        },
    };
};

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const recipe = await fetchRecipeBySlug(resolvedParams.id);
    return buildRecipeMetadata(recipe);
}

export async function generateStaticParams() {
    const { prisma } = await import('@/lib/prisma');
    const recipes = await prisma.recipe.findMany({
        where: { publishedAt: { not: null } },
        select: { slug: true },
        take: 100,
    });

    return recipes.map((recipe) => ({ id: recipe.slug }));
}

export default async function RecipePage({ params }: RecipePageProps) {
    const resolvedParams = await params;
    const recipe = await fetchRecipeBySlug(resolvedParams.id);

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
        />
    );
}
