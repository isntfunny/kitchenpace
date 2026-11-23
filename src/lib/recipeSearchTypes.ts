export type HistogramBucket = {
    key: number;
    count: number;
};

export type HistogramFacet = {
    interval: number;
    min: number;
    max: number;
    buckets: HistogramBucket[];
};

export type TermFacet = Array<{
    key: string;
    count: number;
}>;

export type RecipeSearchFacets = {
    tags: TermFacet;
    ingredients: TermFacet;
    difficulties: TermFacet;
    categories: TermFacet;
    cookTime?: HistogramFacet;
    totalTime?: HistogramFacet;
    prepTime?: HistogramFacet;
    stepCount?: HistogramFacet;
    calories?: HistogramFacet;
    rating?: HistogramFacet;
    cookCount?: HistogramFacet;
};

export type RecipeSearchMeta = {
    total: number;
    page: number;
    limit: number;
    facets?: RecipeSearchFacets;
};

/** Which personal quick filters and sorts the search may offer this user (KUC-131/132). */
export type PersonalSearchFlags = {
    /** Recipes are planned in the week: the week plan quick filters are shown */
    hasPlan: boolean;
    /** Pantry has usable items: the sort "Verbraucht meine Reste" is shown */
    hasPantry: boolean;
};

export const NO_PERSONAL_SEARCH: PersonalSearchFlags = { hasPlan: false, hasPantry: false };
