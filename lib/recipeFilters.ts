type MaybeNumber = number | undefined;

const MultiValueKeys = [
    'tags',
    'mealTypes',
    'cuisines',
    'ingredients',
    'excludeIngredients',
    'difficulty',
    'timeOfDay',
] as const;

const NumberKeys = [
    'minTotalTime',
    'maxTotalTime',
    'minPrepTime',
    'maxPrepTime',
    'minCookTime',
    'maxCookTime',
    'minRating',
    'minCookCount',
] as const;

const DEFAULT_LIMIT = 24;
const DEFAULT_PAGE = 1;
const DEFAULT_FILTER_MODE: RecipeFilterSearchParams['filterMode'] = 'and';

export type RecipeFilterParams = {
    query?: string;
    tags?: string[];
    mealTypes?: string[];
    cuisines?: string[];
    ingredients?: string[];
    excludeIngredients?: string[];
    difficulty?: string[];
    timeOfDay?: string[];
    minTotalTime?: number;
    maxTotalTime?: number;
    minPrepTime?: number;
    maxPrepTime?: number;
    minCookTime?: number;
    maxCookTime?: number;
    minRating?: number;
    minCookCount?: number;
};

export type RecipeFilterSearchParams = RecipeFilterParams & {
    page?: number;
    limit?: number;
    filterMode?: 'and' | 'or';
};

const toNumber = (value: string | null): MaybeNumber => {
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    if (value.includes('.') && parsed < 1) {
        return parsed;
    }
    return parsed >= 0 ? parsed : undefined;
};

const normalizeArray = (values: string[]): string[] =>
    Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const clamp = (value: number | undefined, min: number, max: number) => {
    if (value === undefined) return undefined;
    return Math.min(Math.max(value, min), max);
};

export function parseRecipeFilterParams(params: URLSearchParams): RecipeFilterSearchParams {
    const multi: Record<string, string[]> = {};
    MultiValueKeys.forEach((key) => {
        multi[key] = normalizeArray(
            params
                .getAll(key)
                .flatMap((entry) => entry.split(','))
                .map((item) => item.trim()),
        );
    });

    const numbers: Record<string, MaybeNumber> = {};
    NumberKeys.forEach((key) => {
        numbers[key] = toNumber(params.get(key));
    });

    const pageValue = toNumber(params.get('page'));
    const limitValue = toNumber(params.get('limit'));
    const modeParam = params.get('mode');

    const result: RecipeFilterSearchParams = {
        query: params.get('query')?.trim() || undefined,
        tags: multi.tags,
        mealTypes: multi.mealTypes,
        cuisines: multi.cuisines,
        ingredients: multi.ingredients,
        excludeIngredients: multi.excludeIngredients,
        difficulty: multi.difficulty.map((difficulty) => difficulty.toUpperCase()),
        timeOfDay: multi.timeOfDay,
        minTotalTime: numbers.minTotalTime,
        maxTotalTime: numbers.maxTotalTime,
        minPrepTime: numbers.minPrepTime,
        maxPrepTime: numbers.maxPrepTime,
        minCookTime: numbers.minCookTime,
        maxCookTime: numbers.maxCookTime,
        minRating: clamp(numbers.minRating, 0, 5),
        minCookCount: numbers.minCookCount,
        page: Number.isFinite(pageValue ?? NaN)
            ? Math.max(DEFAULT_PAGE, pageValue ?? DEFAULT_PAGE)
            : DEFAULT_PAGE,
        limit: Number.isFinite(limitValue ?? NaN)
            ? Math.min(Math.max(1, limitValue ?? DEFAULT_LIMIT), 48)
            : DEFAULT_LIMIT,
        filterMode: modeParam === 'or' || modeParam === 'OR' ? 'or' : DEFAULT_FILTER_MODE,
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
    appendArray(params, 'mealTypes', filters.mealTypes);
    appendArray(params, 'cuisines', filters.cuisines);
    appendArray(params, 'ingredients', filters.ingredients);
    appendArray(params, 'excludeIngredients', filters.excludeIngredients);
    appendArray(
        params,
        'difficulty',
        filters.difficulty?.map((value) => value.toUpperCase()),
    );
    appendArray(params, 'timeOfDay', filters.timeOfDay);

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

    if (filters.filterMode && filters.filterMode !== DEFAULT_FILTER_MODE) {
        params.set('mode', filters.filterMode);
    }

    if (filters.page && filters.page !== DEFAULT_PAGE) {
        params.set('page', String(filters.page));
    }

    if (filters.limit && filters.limit !== DEFAULT_LIMIT) {
        params.set('limit', String(filters.limit));
    }

    return params;
}

export { DEFAULT_LIMIT as RECIPE_FILTER_DEFAULT_LIMIT, DEFAULT_PAGE as RECIPE_FILTER_DEFAULT_PAGE };
