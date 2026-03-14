type MaybeNumber = number | undefined;

export const MULTI_VALUE_KEYS = [
    'tags',
    'categories',
    'ingredients',
    'excludeIngredients',
    'difficulty',
] as const;

export const NUMBER_KEYS = [
    'minTotalTime',
    'maxTotalTime',
    'minPrepTime',
    'maxPrepTime',
    'minCookTime',
    'maxCookTime',
    'minRating',
    'minCookCount',
    'minStepCount',
    'maxStepCount',
    'minCalories',
    'maxCalories',
] as const;

const DEFAULT_LIMIT = 30;
const DEFAULT_PAGE = 1;
const DEFAULT_FILTER_MODE: RecipeFilterSearchParams['filterMode'] = 'and';
const DEFAULT_SORT: RecipeSortOption = 'rating';

export type RecipeSortOption = 'rating' | 'newest' | 'fastest' | 'popular';

export type RecipeFilterParams = {
    query?: string;
    tags?: string[];
    categories?: string[];
    ingredients?: string[];
    excludeIngredients?: string[];
    difficulty?: string[];
    minTotalTime?: number;
    maxTotalTime?: number;
    minPrepTime?: number;
    maxPrepTime?: number;
    minCookTime?: number;
    maxCookTime?: number;
    minRating?: number;
    minCookCount?: number;
    minStepCount?: number;
    maxStepCount?: number;
    minCalories?: number;
    maxCalories?: number;
};

export type RecipeFilterSearchParams = RecipeFilterParams & {
    page?: number;
    limit?: number;
    filterMode?: 'and' | 'or';
    sort?: RecipeSortOption;
};

const MAX_FILTER_VALUE = 100_000;

const toNumber = (value: string | null): MaybeNumber => {
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_FILTER_VALUE) return undefined;
    return parsed;
};

const normalizeArray = (values: string[]): string[] =>
    Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const clamp = (value: number | undefined, min: number, max: number) => {
    if (value === undefined) return undefined;
    return Math.min(Math.max(value, min), max);
};

export function parseRecipeFilterParams(params: URLSearchParams): RecipeFilterSearchParams {
    const multi: Record<string, string[]> = {};
    MULTI_VALUE_KEYS.forEach((key) => {
        multi[key] = normalizeArray(
            params
                .getAll(key)
                .flatMap((entry) => entry.split(','))
                .map((item) => item.trim()),
        );
    });

    const numbers: Record<string, MaybeNumber> = {};
    NUMBER_KEYS.forEach((key) => {
        numbers[key] = toNumber(params.get(key));
    });

    const pageValue = toNumber(params.get('page'));
    const limitValue = toNumber(params.get('limit'));
    const modeParam = params.get('mode');
    const sortParam = params.get('sort');
    const validSorts: RecipeSortOption[] = ['rating', 'newest', 'fastest', 'popular'];
    const sort = validSorts.includes(sortParam as RecipeSortOption)
        ? (sortParam as RecipeSortOption)
        : DEFAULT_SORT;

    const result: RecipeFilterSearchParams = {
        query: params.get('query')?.trim() || undefined,
        tags: multi.tags,
        categories: multi.categories,
        ingredients: multi.ingredients,
        excludeIngredients: multi.excludeIngredients,
        difficulty: multi.difficulty.map((difficulty) => difficulty.toUpperCase()),
        minTotalTime: numbers.minTotalTime,
        maxTotalTime: numbers.maxTotalTime,
        minPrepTime: numbers.minPrepTime,
        maxPrepTime: numbers.maxPrepTime,
        minCookTime: numbers.minCookTime,
        maxCookTime: numbers.maxCookTime,
        minRating: clamp(numbers.minRating, 0, 5),
        minCookCount: numbers.minCookCount,
        minStepCount: numbers.minStepCount,
        maxStepCount: numbers.maxStepCount,
        minCalories: numbers.minCalories,
        maxCalories: numbers.maxCalories,
        page: Number.isFinite(pageValue ?? NaN)
            ? Math.max(DEFAULT_PAGE, pageValue ?? DEFAULT_PAGE)
            : DEFAULT_PAGE,
        limit: Number.isFinite(limitValue ?? NaN)
            ? Math.min(Math.max(1, limitValue ?? DEFAULT_LIMIT), DEFAULT_LIMIT)
            : DEFAULT_LIMIT,
        filterMode: modeParam === 'or' || modeParam === 'OR' ? 'or' : DEFAULT_FILTER_MODE,
        sort,
    };

    return result;
}

function appendArray(params: URLSearchParams, key: string, values?: string[]) {
    values?.forEach((value) => {
        if (!value) return;
        params.append(key, value);
    });
}

export function buildRecipeFilterQuery(filters: RecipeFilterSearchParams): URLSearchParams {
    const params = new URLSearchParams();

    if (filters.query) {
        params.set('query', filters.query);
    }

    appendArray(params, 'tags', filters.tags);
    appendArray(params, 'categories', filters.categories);
    appendArray(params, 'ingredients', filters.ingredients);
    appendArray(params, 'excludeIngredients', filters.excludeIngredients);
    appendArray(
        params,
        'difficulty',
        filters.difficulty?.map((value) => value.toUpperCase()),
    );

    const setNumber = (key: string, value?: number) => {
        if (value !== undefined) {
            params.set(key, String(value));
        }
    };

    setNumber('minTotalTime', filters.minTotalTime);
    setNumber('maxTotalTime', filters.maxTotalTime);
    setNumber('minPrepTime', filters.minPrepTime);
    setNumber('maxPrepTime', filters.maxPrepTime);
    setNumber('minCookTime', filters.minCookTime);
    setNumber('maxCookTime', filters.maxCookTime);
    setNumber('minRating', filters.minRating);
    setNumber('minCookCount', filters.minCookCount);
    setNumber('minStepCount', filters.minStepCount);
    setNumber('maxStepCount', filters.maxStepCount);
    setNumber('minCalories', filters.minCalories);
    setNumber('maxCalories', filters.maxCalories);

    if (filters.filterMode && filters.filterMode !== DEFAULT_FILTER_MODE) {
        params.set('mode', filters.filterMode);
    }

    if (filters.sort && filters.sort !== DEFAULT_SORT) {
        params.set('sort', filters.sort);
    }

    if (filters.page && filters.page !== DEFAULT_PAGE) {
        params.set('page', String(filters.page));
    }

    if (filters.limit && filters.limit !== DEFAULT_LIMIT) {
        params.set('limit', String(filters.limit));
    }

    return params;
}

export function buildRecipeFilterHref(filters: Partial<RecipeFilterSearchParams>) {
    const params = buildRecipeFilterQuery(filters as RecipeFilterSearchParams).toString();
    return params ? `/recipes?${params}` : '/recipes';
}

export { DEFAULT_LIMIT as RECIPE_FILTER_DEFAULT_LIMIT };
