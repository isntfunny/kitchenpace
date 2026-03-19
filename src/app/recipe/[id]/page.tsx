import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { fetchRecipeCookImages } from '@app/app/actions/cooks';
import { fetchRecipeBySlug } from '@app/app/actions/recipes';
import { isAdmin } from '@app/lib/admin/check-admin';
import { getServerAuthSession } from '@app/lib/auth';
import { loadRecipeProgress } from '@app/lib/recipe-progress/redis';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';
import { APP_URL } from '@app/lib/url';
import { prisma } from '@shared/prisma';

import { RecipeDetailClient } from './RecipeDetailClient';
import { RecipeJsonLd } from './RecipeJsonLd';

export const revalidate = 60;
export const dynamicParams = true;

type RecipePageParams = {
    id: string;
};

type RecipePageProps = {
    params: RecipePageParams | Promise<RecipePageParams>;
};

const buildRecipeMetadata = (
    recipe: Awaited<ReturnType<typeof fetchRecipeBySlug>>,
    isDraft = false,
): Metadata => {
    if (!recipe) {
        return {
            title: 'Rezept nicht gefunden | KüchenTakt',
            description: 'Das gewünschte Rezept konnte nicht gefunden werden.',
        };
    }

    const fallbackDescription = `Rezept von ${recipe.author?.name ?? 'KüchenTakt'} – Zutaten, Schritte und Zeiten auf einen Blick.`;
    const description = recipe.description || fallbackDescription;

    const bannerUrl = recipe.imageKey
        ? getThumbnailUrl(recipe.imageKey, '16:9', 1280)
        : '/og-image.png';

    const recipeUrl = `${APP_URL}/recipe/${recipe.slug}`;

    return {
        title: `${recipe.title} | KüchenTakt`,
        description,
        alternates: { canonical: recipeUrl },
        ...(isDraft && { robots: { index: false, follow: false } }),
        openGraph: {
            title: `${recipe.title} | KüchenTakt`,
            description,
            url: recipeUrl,
            siteName: 'KüchenTakt',
            type: 'article',
            publishedTime: recipe.publishedAt ?? undefined,
            modifiedTime: recipe.updatedAt,
            images: [
                {
                    url: bannerUrl,
                    width: 1200,
                    height: 630,
                    alt: recipe.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${recipe.title} | KüchenTakt`,
            description,
            images: [bannerUrl],
        },
    };
};

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
    const resolvedParams = await params;
    // For generateMetadata we fetch with unpublished to detect draft status
    const published = await fetchRecipeBySlug(resolvedParams.id);
    if (published) return buildRecipeMetadata(published, false);
    const draft = await fetchRecipeBySlug(resolvedParams.id, undefined, true);
    return buildRecipeMetadata(draft, true);
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

    // Query for anyone live-cooking this recipe
    const livePlanned = await prisma.plannedStream.findFirst({
        where: {
            recipeId: recipe.id,
            user: { twitchStream: { isLive: true } },
        },
        select: {
            user: {
                select: {
                    profile: { select: { twitchUsername: true, nickname: true, slug: true } },
                },
            },
        },
    });
    const liveCook = livePlanned;

    // Load saved cooking progress from Redis (if authenticated)
    const initialProgress = viewerId
        ? await loadRecipeProgress(viewerId, recipe.slug).catch(() => null)
        : null;

    const ogImageUrl = recipe.imageKey
        ? getThumbnailUrl(recipe.imageKey, '16:9', 1280)
        : '/og-image.png';

    return (
        <>
            <RecipeJsonLd recipe={recipe} ogImageUrl={ogImageUrl} />
            <RecipeDetailClient
                recipe={recipe as any}
                author={recipe.author as any}
                recipeActivities={[]}
                cookImages={cookImages}
                isDraft={isDraft}
                initialProgress={initialProgress}
                isAuthenticated={!!viewerId}
                liveCook={
                    liveCook?.user?.profile?.twitchUsername
                        ? {
                              channel: liveCook.user.profile.twitchUsername,
                              userName:
                                  liveCook.user.profile.nickname ??
                                  liveCook.user.profile.twitchUsername,
                              userSlug: liveCook.user.profile.slug ?? '',
                          }
                        : null
                }
            />
        </>
    );
}
