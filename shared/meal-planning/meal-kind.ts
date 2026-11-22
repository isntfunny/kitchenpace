/**
 * Meal kind of a slot and which recipes may fill it (KUC-126). One source for two forms of
 * the same rule: pure predicates (`mealKindOf`, `allowedFor`) for distributing and tests, and
 * `mealKindQuery` as the equivalent OpenSearch filter on `categorySlugs` and `tags`.
 */

export type MealKind = 'main' | 'breakfast' | 'snack';

export const MEAL_KIND_LABELS: Record<MealKind, string> = {
    main: 'Hauptgerichte',
    breakfast: 'Frühstück',
    snack: 'Kaffee & Snack',
};

const FIXED_SLOT_KINDS: Record<string, MealKind> = {
    BREAKFAST: 'breakfast',
    LUNCH: 'main',
    DINNER: 'main',
    SNACK: 'snack',
};

const BREAKFAST_END = 11 * 60;
const SNACK_START = 14 * 60;
const SNACK_END = 17 * 60;

/** Fixed slots have a fixed kind; custom slots follow their time of day ("HH:MM"). */
export function mealKindOf(slot: { key: string; time: string }): MealKind {
    const fixed = FIXED_SLOT_KINDS[slot.key];
    if (fixed) return fixed;
    const match = /^(\d{1,2}):(\d{2})/.exec(slot.time);
    if (!match) return 'main';
    const minutes = Number(match[1]) * 60 + Number(match[2]);
    if (minutes < BREAKFAST_END) return 'breakfast';
    if (minutes >= SNACK_START && minutes < SNACK_END) return 'snack';
    return 'main';
}

const MAIN = 'hauptgericht';
const GETRAENK = 'getraenk';
/** Never a dish on their own, unless the recipe is also a main dish. */
const NEVER_ALONE_CATEGORIES = ['getraenk', 'beilage', 'vorspeise', 'salat'];
/** Never in any slot. */
const EXCLUDED_TAGS = ['Grundrezept', 'Vorratshaltung', 'Geschenk aus der Küche'];

const BREAKFAST_CATEGORIES = ['fruehstueck'];
const BREAKFAST_TAGS = ['Brunch'];
const SNACK_CATEGORIES = ['backen', 'dessert'];
const SNACK_TAGS = ['Kaffee & Kuchen'];

export function allowedFor(
    kind: MealKind,
    recipe: { categorySlugs: string[]; tags: string[] },
): boolean {
    const { categorySlugs, tags } = recipe;
    if (tags.some((t) => EXCLUDED_TAGS.includes(t))) return false;
    const isMain = categorySlugs.includes(MAIN);
    if (!isMain && categorySlugs.some((c) => NEVER_ALONE_CATEGORIES.includes(c))) return false;
    switch (kind) {
        case 'main':
            return isMain;
        case 'breakfast':
            return (
                categorySlugs.some((c) => BREAKFAST_CATEGORIES.includes(c)) ||
                tags.some((t) => BREAKFAST_TAGS.includes(t))
            );
        case 'snack':
            return (
                !categorySlugs.includes(GETRAENK) &&
                (categorySlugs.some((c) => SNACK_CATEGORIES.includes(c)) ||
                    tags.some((t) => SNACK_TAGS.includes(t)))
            );
    }
}

/** The same rule as an OpenSearch bool query. Keep in sync with `allowedFor` (tested). */
export function mealKindQuery(kind: MealKind): Record<string, unknown> {
    const mustNot: Record<string, unknown>[] = [
        { terms: { tags: EXCLUDED_TAGS } },
        {
            bool: {
                must: [{ terms: { categorySlugs: NEVER_ALONE_CATEGORIES } }],
                must_not: [{ term: { categorySlugs: MAIN } }],
            },
        },
    ];
    let match: Record<string, unknown>;
    switch (kind) {
        case 'main':
            match = { term: { categorySlugs: MAIN } };
            break;
        case 'breakfast':
            match = {
                bool: {
                    should: [
                        { terms: { categorySlugs: BREAKFAST_CATEGORIES } },
                        { terms: { tags: BREAKFAST_TAGS } },
                    ],
                    minimum_should_match: 1,
                },
            };
            break;
        case 'snack':
            match = {
                bool: {
                    should: [
                        { terms: { categorySlugs: SNACK_CATEGORIES } },
                        { terms: { tags: SNACK_TAGS } },
                    ],
                    minimum_should_match: 1,
                },
            };
            mustNot.push({ term: { categorySlugs: GETRAENK } });
            break;
    }
    return { bool: { filter: [match], must_not: mustNot } };
}
