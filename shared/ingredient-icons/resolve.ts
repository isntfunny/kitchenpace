// Which icon an ingredient shows (KUC-125). Pure functions, no database.
//
// Order: icon of the ingredient → icon of its category (stored value, else the
// fixed slug mapping below) → the same for the parent category → neutral icon.
// Free-text shopping list items (no ingredient) get a household icon from a
// keyword list, else the neutral one.

import { FALLBACK_ICON, isIngredientIconName, type IngredientIconName } from './names';

/** Fixed icons of the 19 main categories, by category slug (Swiss food database) */
export const MAIN_CATEGORY_ICONS = {
    gemuese: 'carrot',
    fruechte: 'apple',
    'milch-und-milchprodukte': 'milk',
    fisch: 'fish',
    'fleisch-und-innereien': 'steak',
    'fleisch-und-wurstwaren': 'sausage',
    eier: 'egg',
    'fette-und-oele': 'olive-oil',
    'nuesse-samen-und-oelfruechte': 'peanut',
    'getreideprodukte-huelsenfruechte-und-kartoffeln': 'wheat',
    'brote-flocken-und-fruehstueckscerealien': 'bread',
    'pflanzliche-proteinlieferanten-und-alternativen-zu-tierischen-produkten': 'seed-pod',
    'alkoholfreie-getraenke': 'soda',
    'alkoholhaltige-getraenke': 'wine-bottle',
    'salzige-snacks': 'pretzel',
    suessigkeiten: 'chocolate-bar',
    gerichte: 'soup-bowl',
    speziallebensmittel: 'baby-food-jar',
    verschiedenes: 'salt-pepper',
} as const satisfies Record<string, IngredientIconName>;

export interface IconCategory {
    slug?: string | null;
    icon?: string | null;
    parent?: IconCategory | null;
}

export interface IconIngredient {
    icon?: string | null;
    categories?: readonly IconCategory[] | null;
}

/** Icon of one category: stored value, else the slug mapping; null if neither. */
export function categoryIcon(category: IconCategory): IngredientIconName | null {
    if (isIngredientIconName(category.icon)) return category.icon;
    const mapped = category.slug
        ? (MAIN_CATEGORY_ICONS as Record<string, IngredientIconName>)[category.slug]
        : undefined;
    return mapped ?? null;
}

/** Icon of a category or the closest ancestor that has one. */
export function resolveCategoryIcon(
    category: IconCategory | null | undefined,
): IngredientIconName | null {
    const seen = new Set<IconCategory>();
    for (let node = category; node && !seen.has(node); node = node.parent) {
        seen.add(node);
        const icon = categoryIcon(node);
        if (icon) return icon;
    }
    return null;
}

export function resolveIngredientIcon(
    ingredient: IconIngredient | null | undefined,
): IngredientIconName {
    if (ingredient && isIngredientIconName(ingredient.icon)) return ingredient.icon;
    for (const category of ingredient?.categories ?? []) {
        const icon = resolveCategoryIcon(category);
        if (icon) return icon;
    }
    return FALLBACK_ICON;
}

// ── Free-text items ─────────────────────────────────────────────────────

/** Lowercase, no diacritics (ü → u, ß → ss), single spaces. */
export function normalizeFreeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/ß/g, 'ss')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Keywords are matched as substrings of the normalized text (German compounds:
// "Geschirrspülmittel"). First match wins, so specific words come first.
const HOUSEHOLD_KEYWORDS: ReadonlyArray<readonly [IngredientIconName, readonly string[]]> = [
    ['toilet-brush', ['klobürste', 'wc-bürste', 'wc bürste']],
    ['toilet-paper', ['toilettenpapier', 'klopapier', 'wc-papier', 'wc papier']],
    ['dish-soap', ['spülmittel', 'spüli']],
    ['detergent', ['geschirrspül', 'spülmaschinen', 'klarspüler', 'maschinentab']],
    [
        'detergent-jug',
        [
            'waschmittel',
            'waschpulver',
            'weichspüler',
            'fleckenentferner',
            'reiniger',
            'putzmittel',
            'entkalker',
        ],
    ],
    ['sponge', ['schwamm', 'putztuch', 'spültuch']],
    [
        'kitchen-towel',
        ['küchenrolle', 'küchenpapier', 'haushaltspapier', 'haushaltsrolle', 'küchentuch'],
    ],
    ['tissue-box', ['taschentuch', 'taschentücher', 'kosmetiktuch']],
    ['napkin', ['serviette']],
    [
        'trash-bin-kitchen',
        [
            'müllbeutel',
            'müllsack',
            'mülltüte',
            'abfallsack',
            'abfallbeutel',
            'mülleimer',
            'biomüll',
        ],
    ],
    ['foil-roll', ['alufolie', 'aluminiumfolie', 'backpapier', 'butterbrotpapier']],
    ['cling-wrap', ['frischhaltefolie', 'klarsichtfolie', 'gefrierbeutel', 'frischhaltebeutel']],
    ['soap-dispenser', ['seife']],
    ['shampoo-bottle', ['shampoo', 'duschgel', 'haarspülung', 'duschbad']],
    ['tooth', ['zahnpasta', 'zahnbürste', 'zahnseide', 'mundspülung']],
    ['cotton-pads', ['wattepad', 'watte']],
    ['razor', ['rasierer', 'rasierklinge', 'rasierschaum']],
    ['diaper', ['windel', 'feuchttücher']],
    ['battery-aa', ['batterie', 'akku']],
    ['candle', ['kerze', 'teelicht']],
    ['broom', ['besen', 'kehrschaufel', 'handfeger']],
    ['mop', ['mopp', 'wischer', 'wischtuch']],
    ['bucket', ['eimer']],
];

const NORMALIZED_KEYWORDS = HOUSEHOLD_KEYWORDS.map(
    ([icon, keywords]) => [icon, keywords.map(normalizeFreeText)] as const,
);

/** Household icon for a free-text item (e.g. "Spülmittel"), else the neutral icon. */
export function resolveFreeTextIcon(text: string): IngredientIconName {
    const normalized = normalizeFreeText(text);
    if (!normalized) return FALLBACK_ICON;
    for (const [icon, keywords] of NORMALIZED_KEYWORDS) {
        if (keywords.some((keyword) => normalized.includes(keyword))) return icon;
    }
    return FALLBACK_ICON;
}
