// Start data of the recipe filters (KUC-126): the recipe page loads it while rendering,
// the week selection dialog through a server action when it opens. Server only.
import 'server-only';

import { TZDate } from '@date-fns/tz';

import {
    getFoodPeriodFilterSets,
    getTimeSeasonFilterSets,
    type FilterSetWithRelations,
} from '@app/lib/fits-now/db-queries';
import type { Season } from '@app/lib/fits-now/labels';
import { detectSeason } from '@app/lib/fits-now/season';
import { getThemeChips } from '@app/lib/theme-clusters/queries';
import { prisma } from '@shared/prisma';
import type { ThemeChip } from '@shared/theme-clusters/release';

import { fetchFilterIngredients, fetchFilterTags, type CategoryOption } from './actions';

export type SearchStartData = {
    filterOptions: { tags: string[]; ingredients: string[]; categories: CategoryOption[] };
    filterSets: FilterSetWithRelations[];
    themes: ThemeChip[];
    currentSeason: Season;
};

/** Categories with at least one published recipe (same query as trpc filters.categories). */
function loadCategoryOptions(): Promise<CategoryOption[]> {
    return prisma.category.findMany({
        where: { recipes: { some: { recipe: { publishedAt: { not: null } } } } },
        orderBy: { name: 'asc' },
        select: { slug: true, name: true },
    });
}

export async function loadSearchStartData(): Promise<SearchStartData> {
    const [tags, ingredients, categories, timeSeasonSets, foodPeriodSets, themes] =
        await Promise.all([
            fetchFilterTags(),
            fetchFilterIngredients(),
            loadCategoryOptions(),
            getTimeSeasonFilterSets(),
            getFoodPeriodFilterSets(),
            // Released theme clusters; search must keep working if the cluster tables are empty
            getThemeChips().catch(() => [] as ThemeChip[]),
        ]);

    return {
        filterOptions: { tags, ingredients, categories },
        filterSets: [...timeSeasonSets, ...foodPeriodSets].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        ),
        themes,
        currentSeason: detectSeason(new TZDate(new Date(), 'Europe/Berlin').getMonth()),
    };
}
