import { Metadata } from 'next';

import {
    fetchFilterTags,
    fetchFilterIngredients,
    fetchFilterCategories,
} from '@/app/actions/filters';
import { PageShell } from '@/components/layouts/PageShell';
import { RecipeSearchClient } from '@/components/search/RecipeSearchClient';
import { parseRecipeFilterParams } from '@/lib/recipeFilters';

type RecipesPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
    title: 'Rezepte',
    description:
        'Durchsuche unsere Rezepte-Sammlung. Filtere nach Kategorien, Zutaten und Tags. Finde dein nächstes Lieblingsrezept.',
};

const toURLSearchParams = async (searchParams: RecipesPageProps['searchParams']) => {
    const params = await searchParams;
    const search = new URLSearchParams();

    if (!params) {
        return search;
    }

    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((entry) => entry && search.append(key, entry));
            return;
        }
        if (value) {
            search.append(key, value);
        }
    });

    return search;
};

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
    const [tags, ingredients, categories] = await Promise.all([
        fetchFilterTags(),
        fetchFilterIngredients(),
        fetchFilterCategories(),
    ]);

    const initialFilters = parseRecipeFilterParams(await toURLSearchParams(searchParams));

    return (
        <PageShell>
            <RecipeSearchClient
                initialFilters={initialFilters}
                filterOptions={{ tags, ingredients, categories }}
            />
        </PageShell>
    );
}
