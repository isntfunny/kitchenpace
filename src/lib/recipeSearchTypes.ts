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
