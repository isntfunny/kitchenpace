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

import { CategoryLanding } from './CategoryLanding';

export const revalidate = 60;

type Props = {
    params: Promise<{ slug: string }>;
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitchenpace.app').replace(/\/$/, '');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const category = await fetchCategoryBySlug(slug);
    if (!category) return { title: 'Kategorie nicht gefunden | KüchenTakt' };

    return {
        title: `${category.name} Rezepte | KüchenTakt`,
        description:
            category.description ??
            `Entdecke ${category.recipeCount} ${category.name}-Rezepte auf KüchenTakt.`,
        openGraph: {
            title: `${category.name} Rezepte | KüchenTakt`,
            description:
                category.description ??
                `Entdecke ${category.recipeCount} ${category.name}-Rezepte auf KüchenTakt.`,
            url: `${SITE_URL}/category/${category.slug}`,
            siteName: 'KüchenTakt',
            type: 'website',
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
