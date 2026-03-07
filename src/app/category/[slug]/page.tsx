import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
    fetchCategoryActivity,
    fetchCategoryBySlug,
    fetchCategoryMostCooked,
    fetchCategoryNewest,
    fetchCategoryPopular,
    fetchCategoryQuickRecipes,
    fetchCategoryTopRated,
} from '@app/app/actions/category';
import { PageShell } from '@app/components/layouts/PageShell';
import { APP_URL } from '@app/lib/url';

import { CategoryLanding } from './CategoryLanding';

export const revalidate = 60;

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const category = await fetchCategoryBySlug(slug);
    if (!category) return { title: 'Kategorie nicht gefunden | KüchenTakt' };

    const title = `${category.name} Rezepte | KüchenTakt`;
    const description =
        category.description ??
        `Entdecke ${category.recipeCount} ${category.name}-Rezepte auf KüchenTakt.`;
    const url = `${APP_URL}/category/${category.slug}`;
    const ogImageUrl = `${APP_URL}/api/og/category/${category.slug}`;

    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            siteName: 'KüchenTakt',
            type: 'website',
            locale: 'de_DE',
            images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${category.name} Rezepte` }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl],
        },
    };
}

export default async function CategoryPage({ params }: Props) {
    const { slug } = await params;
    const category = await fetchCategoryBySlug(slug);

    if (!category) notFound();

    const [newest, topRated, mostCooked, quick, popular, activity] = await Promise.allSettled([
        fetchCategoryNewest(category.id),
        fetchCategoryTopRated(category.id),
        fetchCategoryMostCooked(category.id),
        fetchCategoryQuickRecipes(category.id),
        fetchCategoryPopular(category.id),
        fetchCategoryActivity(category.id),
    ]);

    const safe = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
        r.status === 'fulfilled' ? r.value : fallback;

    return (
        <PageShell>
            <CategoryLanding
                category={category}
                newest={safe(newest, [])}
                topRated={safe(topRated, [])}
                mostCooked={safe(mostCooked, [])}
                quick={safe(quick, [])}
                popular={safe(popular, [])}
                activity={safe(activity, [])}
            />
        </PageShell>
    );
}
