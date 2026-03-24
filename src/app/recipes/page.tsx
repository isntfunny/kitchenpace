import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Metadata } from 'next';

import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession } from '@app/lib/auth';
import {
    getTimeSeasonFilterSets,
    getFoodPeriodFilterSets,
    type FilterSetWithRelations,
} from '@app/lib/fits-now/db-queries';
import { toFilterCriteria } from '@app/lib/fits-now/mappings';
import { parseRecipeFilterParams } from '@app/lib/recipeFilters';
import { queryRecipes } from '@app/lib/recipeSearch';
import { APP_URL } from '@app/lib/url';
import { getQueryClient, trpc } from '@app/trpc/server';

import { fetchFilterIngredients, fetchFilterTags } from './actions';
import { RecipeSearchClient } from './components/RecipeSearchClient';

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

function mergeFilterSetIntoFilters(
    filters: ReturnType<typeof parseRecipeFilterParams>,
    filterSets: FilterSetWithRelations[],
) {
    if (!filters.filterSetId) return;

    const match = filterSets.find((fs) => fs.id === filters.filterSetId);
    if (!match) return;

    const criteria = toFilterCriteria(match);
    filters.tags = [...new Set([...(filters.tags ?? []), ...criteria.tagKeywords])];
    filters.categories = [...new Set([...(filters.categories ?? []), ...criteria.categorySlugs])];
    filters.ingredients = [
        ...new Set([...(filters.ingredients ?? []), ...criteria.ingredientKeywords]),
    ];
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
    const initialFilters = parseRecipeFilterParams(await toURLSearchParams(searchParams));
    const queryClient = getQueryClient();

    const session = await getServerAuthSession('recipes-page');

    const [tags, ingredients, categories, timeSeasonSets, foodPeriodSets] = await Promise.all([
        fetchFilterTags(),
        fetchFilterIngredients(),
        queryClient.fetchQuery(trpc.filters.categories.queryOptions()),
        getTimeSeasonFilterSets(),
        getFoodPeriodFilterSets(),
    ]);

    const filterSets = [...timeSeasonSets, ...foodPeriodSets].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );

    // Merge FilterSet criteria into initial filters for correct SSR
    mergeFilterSetIntoFilters(initialFilters, filterSets);

    const initialData = await queryRecipes(initialFilters, session?.user?.id);

    return (
        <PageShell>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <RecipeSearchClient
                    initialFilters={initialFilters}
                    filterOptions={{ tags, ingredients, categories }}
                    initialData={initialData}
                    filterSets={filterSets}
                    isLoggedIn={!!session?.user}
                />
            </HydrationBoundary>
        </PageShell>
    );
}
