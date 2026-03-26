import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { fetchCollectionBySlug } from '@app/app/actions/collections';
import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession } from '@app/lib/auth';
import { CollectionBlockRenderer } from '@app/lib/collections/block-renderer';
import { toRecipeCardData } from '@app/lib/recipe-card';
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
    if (!collection) return { title: 'Sammlung nicht gefunden' };
    return {
        title: `${collection.title} | Kuechentakt`,
        description: collection.description ?? `Rezeptsammlung von ${collection.author.name}`,
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

    let templateRecipes: any[] = [];
    if (collection.template !== 'INLINE') {
        const collectionRecipes = await prisma.collectionRecipe.findMany({
            where: { collectionId: collection.id },
            orderBy: { position: 'asc' },
            include: {
                recipe: { include: { categories: { include: { category: true } } } },
            },
        });
        templateRecipes = collectionRecipes
            .filter(
                (cr) =>
                    cr.recipe.status === 'PUBLISHED' &&
                    (cr.recipe.moderationStatus === 'AUTO_APPROVED' ||
                        cr.recipe.moderationStatus === 'APPROVED'),
            )
            .map((cr) => toRecipeCardData(cr.recipe));
    }

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
