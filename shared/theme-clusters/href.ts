import { buildRecipeFilterHref } from '../recipe-filters';

import type { ClusterSearchFilter } from './profile';

/** Link into the recipe search with the cluster's filters prefilled (like a FilterSet). */
export function clusterSearchHref(filter: ClusterSearchFilter): string {
    return buildRecipeFilterHref({
        tags: filter.tags,
        categories: filter.categories,
    });
}
