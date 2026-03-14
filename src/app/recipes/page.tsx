import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Metadata } from 'next';

import { fetchFilterIngredients, fetchFilterTags } from '@app/app/actions/filters';
import { PageShell } from '@app/components/layouts/PageShell';
import { RecipeSearchClient } from '@app/components/search/RecipeSearchClient';
import { parseRecipeFilterParams } from '@app/lib/recipeFilters';
import { queryRecipes } from '@app/lib/recipeSearch';
import { APP_URL } from '@app/lib/url';
import { getQueryClient, trpc } from '@app/trpc/server';

type RecipesPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
    title: 'Rezepte',
    description:
        'Durchsuche unsere Rezepte-Sammlung. Filtere nach Kategorien, Zutaten und Tags. Finde dein nächstes Lieblingsrezept.',
    alternates: { canonical: `${APP_URL}/recipes` },
};

export const revalidate = 60;

const toURLSearchParams = async (searchParams: RecipesPageProps['searchParams']) => {
    const params = await searchParams;
    const search = new URLSearchParams();

    if (!params) return search;

    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((entry) => entry && search.append(key, entry));
            return;
        }
        if (value) search.append(key, value);
    });

    return search;
};

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
    const initialFilters = parseRecipeFilterParams(await toURLSearchParams(searchParams));
    const queryClient = getQueryClient();

    const [tags, ingredients, categories, initialData] = await Promise.all([
        fetchFilterTags(),
        fetchFilterIngredients(),
        queryClient.fetchQuery(trpc.filters.categories.queryOptions()),
        queryRecipes(initialFilters),
    ]);

    return (
        <PageShell>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <RecipeSearchClient
                    initialFilters={initialFilters}
                    filterOptions={{ tags, ingredients, categories }}
                    initialData={initialData}
                />
            </HydrationBoundary>
        </PageShell>
    );
}
