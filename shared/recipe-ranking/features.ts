/** What the ranking needs to know about a recipe, and the features derived from it. */

export type RankingRecipe = {
    id: string;
    title: string;
    categorySlugs: string[];
    tags: string[];
    ingredients: { id: string; name: string; root: string | null; optional: boolean }[];
    rating: number;
    ratingCount: number;
    totalTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    stepCount: number;
    /** Normalised (unit length) */
    embedding: number[] | null;
};

export const STYLE_TAGS = new Set([
    'Italienisch',
    'Deutsch',
    'Amerikanisch',
    'Mediterran',
    'Französisch',
    'Asiatisch',
    'Österreichisch',
    'Griechisch',
    'Mexikanisch',
    'Ofengericht',
    'Pfannengericht',
    'Ein Topf',
    'Grillen',
    'Frittiert',
]);

/** Ingredient root categories that are kitchen basics, not a "shared ingredient" */
export const STAPLE_ROOTS = new Set(['verschiedenes', 'fette-und-oele']);

export const PROTEIN_ROOTS = new Set([
    'fleisch-und-innereien',
    'fleisch-und-wurstwaren',
    'fisch',
    'eier',
    'pflanzliche-proteinlieferanten-und-alternativen-zu-tierischen-produkten',
]);

/** Kitchen basics by name: many ingredients have no category */
export const COMMON_NAME =
    /^(salz|pfeffer|wasser|zucker|mehl|butter|margarine|milch|sahne|schlagsahne|eier?|knoblauch.*|zwiebel.*|.*öl|essig.*|.*brühe|muskat.*|petersilie|schnittlauch|thymian|oregano|basilikum|paprikapulver|currypulver|speisestärke|backpulver)$/;

const lower = (s: string) => s.toLowerCase();

/** Non-optional ingredients (what the recipe really needs) */
export function requiredIngredients(r: RankingRecipe): RankingRecipe['ingredients'] {
    return r.ingredients.filter((i) => !i.optional);
}

/** Ingredient ids that say something about a dish: no staples, no kitchen basics. */
export function meaningfulIngredientIds(r: RankingRecipe): Set<string> {
    return new Set(
        requiredIngredients(r)
            .filter(
                (i) => !(i.root && STAPLE_ROOTS.has(i.root)) && !COMMON_NAME.test(lower(i.name)),
            )
            .map((i) => i.id),
    );
}

export function styleTags(r: RankingRecipe): string[] {
    return r.tags.filter((t) => STYLE_TAGS.has(t));
}

/** Root categories of the required ingredients */
export function rootsOf(r: RankingRecipe): Set<string> {
    const roots = new Set<string>();
    for (const i of requiredIngredients(r)) if (i.root) roots.add(i.root);
    return roots;
}

export function proteinRootsOf(r: RankingRecipe): string[] {
    return [...rootsOf(r)].filter((x) => PROTEIN_ROOTS.has(x));
}
