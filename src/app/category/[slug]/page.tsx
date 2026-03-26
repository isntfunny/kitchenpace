import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
    fetchCategoryActivity,
    fetchCategoryAggregateStats,
    fetchCategoryBySlug,
    fetchCategoryDifficultyStats,
    fetchCategoryMostCooked,
    fetchCategoryNewest,
    fetchCategoryTopByViews,
    fetchCategoryTopRated,
    fetchActiveSeasonalRecipes,
} from '@app/app/actions/category';
import type { RecipeCardData } from '@app/app/actions/recipes';
import { PageShell } from '@app/components/layouts/PageShell';
import { detectContext } from '@app/lib/fits-now/context';
import { fetchCategoryFacets } from '@app/lib/recipeSearch';
import { APP_URL } from '@app/lib/url';

import { CategoryLanding } from './CategoryLanding';
import { SeasonalTeaserBar } from './components/SeasonalTeaserBar';

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
            images: [
                { url: ogImageUrl, width: 1200, height: 630, alt: `${category.name} Rezepte` },
            ],
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

    const results = await Promise.allSettled([
        fetchCategoryNewest(category.id), // 0
        fetchCategoryTopRated(category.id), // 1
        fetchCategoryMostCooked(category.id, 3), // 2 - take 3
        fetchCategoryActivity(category.id), // 3
        fetchCategoryTopByViews(category.id, 5), // 4
        fetchCategoryDifficultyStats(category.id), // 5
        fetchCategoryAggregateStats(category.id), // 6
        fetchCategoryFacets(category.slug), // 7 - uses slug
        detectContext(), // 8
    ]);

    const safe = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
        r.status === 'fulfilled' ? r.value : fallback;

    const newest = safe(results[0], []);
    const topRated = safe(results[1], []);
    const mostCooked = safe(results[2], []);
    const activity = safe(results[3], []);
    const topByViews = safe(results[4], []);
    const difficultyStats = safe(results[5], {});
    const aggregateStats = safe(results[6], {
        avgTime: null,
        avgCalories: null,
        caloriesCoverage: 0,
        fastestRecipe: null,
        mostPopularRecipe: null,
    });
    const facets = safe(results[7], { tags: [], ingredients: [], difficulties: [] });
    const detectResult = safe(results[8], { context: null as any, activePeriods: [] });

    const activePeriod = detectResult.activePeriods[0]?.filterSet ?? null;
    let seasonalRecipes: RecipeCardData[] = [];
    if (activePeriod) {
        seasonalRecipes = await fetchActiveSeasonalRecipes(category.id, activePeriod, 4);
    }

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'KüchenTakt', item: APP_URL },
            {
                '@type': 'ListItem',
                position: 2,
                name: category.name,
                item: `${APP_URL}/category/${category.slug}`,
            },
        ],
    };

    return (
        <>
            {activePeriod && seasonalRecipes.length > 0 && (
                <SeasonalTeaserBar
                    period={activePeriod}
                    recipes={seasonalRecipes}
                    categorySlug={category.slug}
                />
            )}
            <PageShell>
                <script
                    type="application/ld+json"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
                />
                <CategoryLanding
                    category={category}
                    newest={newest}
                    topRated={topRated}
                    mostCooked={mostCooked}
                    activity={activity}
                    topByViews={topByViews}
                    difficultyStats={difficultyStats}
                    aggregateStats={aggregateStats}
                    facets={facets}
                />
            </PageShell>
        </>
    );
}
