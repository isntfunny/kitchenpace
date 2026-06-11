import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { KeywordLandingContent } from '@app/components/features/KeywordLandingContent';
import { PageShell } from '@app/components/layouts/PageShell';
import { fetchIngredientLanding } from '@app/lib/keyword-landing';
import { APP_URL } from '@app/lib/url';

export const revalidate = 300;
export const dynamicParams = true;

// Dedupes the landing fetch between generateMetadata and the page render
const getIngredientLanding = cache((slug: string) => fetchIngredientLanding(slug));

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const data = await getIngredientLanding(slug);
    if (!data) return { title: 'Zutat nicht gefunden', robots: { index: false, follow: false } };

    const title = `Rezepte mit ${data.name}`;
    const description = `${data.totalCount} Rezepte mit ${data.name} auf KochTakt — mit Zutatenliste, Schritt-für-Schritt-Anleitung und Zeitplan zum Mitkochen.`;
    const url = `${APP_URL}/zutat/${data.slug}`;
    const topRecipe = data.recipes[0];
    const imageUrl = topRecipe?.image
        ? `${APP_URL}${topRecipe.image}`
        : `${APP_URL}/opengraph-image`;
    const brandedTitle = `${title} | KochTakt`;

    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title: brandedTitle,
            description,
            url,
            siteName: 'KochTakt',
            type: 'website',
            locale: 'de_DE',
            images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
        },
        twitter: {
            card: 'summary_large_image',
            title: brandedTitle,
            description,
            images: [imageUrl],
        },
    };
}

export default async function IngredientLandingPage({ params }: Props) {
    const { slug } = await params;
    const data = await getIngredientLanding(slug);

    if (!data) notFound();

    const url = `${APP_URL}/zutat/${data.slug}`;
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
                        name: 'Rezepte',
                        item: `${APP_URL}/recipes`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: `Rezepte mit ${data.name}`,
                        item: url,
                    },
                ],
            },
            {
                '@type': 'CollectionPage',
                '@id': `${url}#ingredient`,
                url,
                name: `Rezepte mit ${data.name}`,
                inLanguage: 'de-DE',
                mainEntity: {
                    '@type': 'ItemList',
                    numberOfItems: data.recipes.length,
                    itemListElement: data.recipes.map((recipe, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: recipe.title,
                        url: `${APP_URL}/recipe/${recipe.slug}`,
                    })),
                },
            },
        ],
    };

    return (
        <PageShell>
            <script
                type="application/ld+json"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <KeywordLandingContent
                data={data}
                heading={`Rezepte mit ${data.name}`}
                intro={`Entdecke ${data.totalCount} Rezepte mit ${data.name} — bewertet von der Community, mit Zutaten, Zeiten und interaktiver Koch-Anleitung.`}
                searchHref={`/recipes?ingredients=${encodeURIComponent(data.name)}`}
            />
        </PageShell>
    );
}
