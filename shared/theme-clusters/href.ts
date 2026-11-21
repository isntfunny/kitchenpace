import { buildRecipeFilterHref } from '../../src/lib/recipeFilters';

import type { ClusterSearchFilter } from './profile';

/** Link into the recipe search with the cluster's filters prefilled (like a FilterSet). */
export function clusterSearchHref(filter: ClusterSearchFilter): string {
    return buildRecipeFilterHref({
        tags: filter.tags,
        categories: filter.categories,
    });
}
