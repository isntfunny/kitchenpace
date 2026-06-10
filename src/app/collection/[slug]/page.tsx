import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { fetchCollectionBySlug } from '@app/app/actions/collections';
import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession } from '@app/lib/auth';
import { CollectionBlockRenderer } from '@app/lib/collections/block-renderer';
import { toRecipeCardData } from '@app/lib/recipe-card';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';
import { APP_URL } from '@app/lib/url';
import { prisma } from '@shared/prisma';

import { CollectionDetailClient } from './CollectionDetailClient';
import { GridBelowLayout } from './templates/GridBelowLayout';
import { HeroPicksLayout } from './templates/HeroPicksLayout';
import { InlineLayout } from './templates/InlineLayout';
import { SidebarLayout } from './templates/SidebarLayout';

export const revalidate = 60;
export const dynamicParams = true;

interface CollectionPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
    const { slug } = await params;
    const collection = await fetchCollectionBySlug(slug);
    if (!collection) {
        // Drafts render for their owner but must never be indexed
        return { title: 'Sammlung nicht gefunden', robots: { index: false, follow: false } };
    }

    const description =
        collection.description ??
        `Rezeptsammlung von ${collection.author.name} mit ${collection.recipeCount} Rezepten auf KochTakt.`;
    const url = `${APP_URL}/collection/${collection.slug}`;
    const imageUrl = collection.coverImageKey
        ? `${APP_URL}${getThumbnailUrl(collection.coverImageKey, '16:9', 1280)}`
        : `${APP_URL}/opengraph-image`;
    const brandedTitle = `${collection.title} | KochTakt`;

    return {
        title: collection.title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title: brandedTitle,
            description,
            url,
            siteName: 'KochTakt',
            type: 'website',
            locale: 'de_DE',
            images: [{ url: imageUrl, width: 1200, height: 630, alt: collection.title }],
        },
        twitter: {
            card: 'summary_large_image',
            title: brandedTitle,
            description,
            images: [imageUrl],
        },
    };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
    const { slug } = await params;
    const session = await getServerAuthSession('collection-detail');
    const viewerId = session?.user?.id ?? null;

    let collection = await fetchCollectionBySlug(slug, viewerId);
    if (!collection && viewerId) {
        collection = await fetchCollectionBySlug(slug, viewerId, true);
        if (collection && collection.authorId !== viewerId) {
            const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'moderator';
            if (!isAdmin) collection = null;
        }
    }

    if (!collection) notFound();

    const mdxContent = collection.blocks ? (
        <CollectionBlockRenderer blocks={collection.blocks} viewerUserId={viewerId} />
    ) : null;

    const collectionRecipes = await prisma.collectionRecipe.findMany({
        where: { collectionId: collection.id },
        orderBy: { position: 'asc' },
        include: {
            recipe: { include: { categories: { include: { category: true } } } },
        },
    });
    const publishedRecipes = collectionRecipes.filter(
        (cr) =>
            cr.recipe.status === 'PUBLISHED' &&
            (cr.recipe.moderationStatus === 'AUTO_APPROVED' ||
                cr.recipe.moderationStatus === 'APPROVED'),
    );

    let templateRecipes: any[] = [];
    if (collection.template !== 'INLINE') {
        templateRecipes = publishedRecipes.map((cr) => toRecipeCardData(cr.recipe));
    }

    const collectionUrl = `${APP_URL}/collection/${collection.slug}`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'KochTakt', item: APP_URL },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: 'Sammlungen',
                        item: `${APP_URL}/collections`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: collection.title,
                        item: collectionUrl,
                    },
                ],
            },
            {
                '@type': 'CollectionPage',
                '@id': `${collectionUrl}#collection`,
                url: collectionUrl,
                name: collection.title,
                ...(collection.description && { description: collection.description }),
                inLanguage: 'de-DE',
                dateModified: collection.updatedAt,
                author: {
                    '@type': 'Person',
                    name: collection.author.name,
                    url: `${APP_URL}/user/${collection.author.slug}`,
                },
                ...(publishedRecipes.length > 0 && {
                    mainEntity: {
                        '@type': 'ItemList',
                        numberOfItems: publishedRecipes.length,
                        itemListElement: publishedRecipes.map((cr, i) => ({
                            '@type': 'ListItem',
                            position: i + 1,
                            name: cr.recipe.title,
                            url: `${APP_URL}/recipe/${cr.recipe.slug}`,
                        })),
                    },
                }),
            },
        ],
    };

    let layout = null;
    switch (collection.template) {
        case 'SIDEBAR':
            layout = <SidebarLayout mdxContent={mdxContent} sidebarRecipes={templateRecipes} />;
            break;
        case 'GRID_BELOW':
            layout = <GridBelowLayout mdxContent={mdxContent} recipes={templateRecipes} />;
            break;
        case 'HERO_PICKS':
            layout = (
                <HeroPicksLayout
                    mdxContent={mdxContent}
                    heroRecipes={templateRecipes.slice(0, 3)}
                />
            );
            break;
        case 'INLINE':
        default:
            layout = <InlineLayout mdxContent={mdxContent} />;
            break;
    }

    return (
        <PageShell>
            <script
                type="application/ld+json"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <CollectionDetailClient
                collection={collection}
                isAuthenticated={!!viewerId}
                isOwner={viewerId === collection.authorId}
            >
                {layout}
            </CollectionDetailClient>
        </PageShell>
    );
}
