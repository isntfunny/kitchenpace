// Hidden base filter of the recipe search (KUC-126) as URL parameters. Client-safe: no
// server imports, the search hook in the browser uses it.
import type { MealKind } from '@shared/meal-planning/meal-kind';

/** Hidden base filter and ranking input of the week selection dialog. */
export type RecipeSearchContext = {
    /** Only recipes allowed for this meal kind */
    kind?: MealKind;
    /** Never in the result (the picks, which the dialog shows itself) */
    excludeIds?: string[];
    /** Chosen dishes: blended into the search vector of the `week` sort */
    pickIds?: string[];
    /** First day of the planned week (season, pantry) */
    week?: string;
};

const MEAL_KINDS: readonly MealKind[] = ['main', 'breakfast', 'snack'];
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EXCLUDE = 200;
const MAX_PICKS = 30;

const ids = (value: string | null, max: number) =>
    [
        ...new Set(
            (value ?? '')
                .split(',')
                .map((id) => id.trim())
                .filter((id) => ID_PATTERN.test(id)),
        ),
    ].slice(0, max);

/** Reads the context params (`kind`, `exclude`, `picks`, `week`); undefined when none is set. */
export function parseRecipeSearchContext(params: URLSearchParams): RecipeSearchContext | undefined {
    const context: RecipeSearchContext = {};
    const kind = params.get('kind');
    if (kind && (MEAL_KINDS as readonly string[]).includes(kind)) context.kind = kind as MealKind;
    const excludeIds = ids(params.get('exclude'), MAX_EXCLUDE);
    if (excludeIds.length) context.excludeIds = excludeIds;
    const pickIds = ids(params.get('picks'), MAX_PICKS);
    if (pickIds.length) context.pickIds = pickIds;
    const week = params.get('week');
    if (week && DATE_PATTERN.test(week)) context.week = week;
    return Object.keys(context).length ? context : undefined;
}

export function appendRecipeSearchContext(params: URLSearchParams, context?: RecipeSearchContext) {
    if (!context) return;
    if (context.kind) params.set('kind', context.kind);
    if (context.excludeIds?.length) params.set('exclude', context.excludeIds.join(','));
    if (context.pickIds?.length) params.set('picks', context.pickIds.join(','));
    if (context.week) params.set('week', context.week);
}
