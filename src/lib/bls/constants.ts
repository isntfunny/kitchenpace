/**
 * BLS 4.0 code prefix → IngredientCategory mapping.
 * Each BLS food code starts with a letter indicating its group.
 */
export const BLS_PREFIX_TO_CATEGORIES: Record<string, string[]> = {
    B: ['Brot'],
    C: ['Getreide'],
    D: ['Backwaren'],
    E: ['Eier'],
    F: ['Obst'],
    G: ['Gemüse'],
    H: ['Hülsenfrüchte', 'Nüsse & Samen'],
    K: ['Kartoffeln & Pilze'],
    M: ['Milchprodukte'],
    N: ['Getränke'],
    Q: ['Öle & Fette'],
    R: ['Gewürze'],
    T: ['Fisch'],
    U: ['Fleisch'],
    V: ['Wild & Geflügel'],
    W: ['Wurst & Aufschnitt'],
};

/**
 * All ingredient categories to seed.
 */
export const INGREDIENT_CATEGORIES = [
    'Gemüse',
    'Obst',
    'Fleisch',
    'Fisch',
    'Milchprodukte',
    'Gewürze',
    'Getreide',
    'Backwaren',
    'Getränke',
    'Hülsenfrüchte',
    'Nüsse & Samen',
    'Kartoffeln & Pilze',
    'Öle & Fette',
    'Eier',
    'Wurst & Aufschnitt',
    'Brot',
    'Wild & Geflügel',
] as const;

/**
 * All units to seed (shortName, longName, default grams).
 */
export const UNITS: Array<{ shortName: string; longName: string; gramsDefault: number | null }> = [
    { shortName: 'g', longName: 'Gramm', gramsDefault: 1 },
    { shortName: 'kg', longName: 'Kilogramm', gramsDefault: 1000 },
    { shortName: 'ml', longName: 'Milliliter', gramsDefault: 1 },
    { shortName: 'l', longName: 'Liter', gramsDefault: 1000 },
    { shortName: 'EL', longName: 'Esslöffel', gramsDefault: 15 },
    { shortName: 'TL', longName: 'Teelöffel', gramsDefault: 5 },
    { shortName: 'Stk', longName: 'Stück', gramsDefault: null },
    { shortName: 'Prise', longName: 'Prise', gramsDefault: 0.5 },
    { shortName: 'Tasse', longName: 'Tasse', gramsDefault: 240 },
    { shortName: 'Becher', longName: 'Becher', gramsDefault: 150 },
    { shortName: 'Dose', longName: 'Dose', gramsDefault: null },
    { shortName: 'Bund', longName: 'Bund', gramsDefault: null },
    { shortName: 'Scheibe', longName: 'Scheibe', gramsDefault: null },
    { shortName: 'Zehe', longName: 'Zehe', gramsDefault: 5 },
    { shortName: 'Handvoll', longName: 'Handvoll', gramsDefault: 30 },
    { shortName: 'Tropfen', longName: 'Tropfen', gramsDefault: 0.05 },
    { shortName: 'Würfel', longName: 'Würfel', gramsDefault: 42 },
    { shortName: 'Päckchen', longName: 'Päckchen', gramsDefault: null },
    { shortName: 'Block', longName: 'Block', gramsDefault: null },
    { shortName: 'Filet', longName: 'Filet', gramsDefault: null },
    { shortName: 'Kugel', longName: 'Kugel', gramsDefault: null },
    { shortName: 'Stange', longName: 'Stange', gramsDefault: null },
];

/**
 * Default units per ingredient category.
 * Maps category name → array of unit shortNames to link.
 */
export const DEFAULT_UNITS_PER_CATEGORY: Record<string, string[]> = {
    Gemüse: ['g', 'kg', 'Stk'],
    Obst: ['g', 'kg', 'Stk'],
    Fleisch: ['g', 'kg'],
    Fisch: ['g', 'kg', 'Filet'],
    Milchprodukte: ['g', 'kg', 'ml', 'l', 'Becher', 'Stk'],
    Gewürze: ['g', 'TL', 'EL', 'Prise'],
    Getreide: ['g', 'kg'],
    Backwaren: ['g', 'kg', 'Stk', 'Scheibe'],
    Getränke: ['ml', 'l', 'Tasse'],
    Hülsenfrüchte: ['g', 'kg', 'Dose'],
    'Nüsse & Samen': ['g', 'Handvoll', 'EL'],
    'Kartoffeln & Pilze': ['g', 'kg', 'Stk'],
    'Öle & Fette': ['ml', 'l', 'EL', 'TL'],
    Eier: ['Stk', 'g'],
    'Wurst & Aufschnitt': ['g', 'Scheibe', 'Stk'],
    Brot: ['g', 'Stk', 'Scheibe'],
    'Wild & Geflügel': ['g', 'kg'],
};

/**
 * Curated ingredient-specific unit gram overrides.
 * Maps ingredient slug → { unitShortName: grams }.
 */
export const INGREDIENT_UNIT_GRAMS: Record<string, Record<string, number>> = {
    // Gemüse
    tomate: { Stk: 80 },
    speisezwiebel: { Stk: 80 },
    'gemuesepaprika-rot': { Stk: 160 },
    'gemuesepaprika-gruen': { Stk: 160 },
    'gemuesepaprika-gelb': { Stk: 160 },
    salatgurke: { Stk: 400 },
    'karotte-moehre': { Stk: 60 },
    zucchini: { Stk: 200 },
    aubergine: { Stk: 300 },
    'kartoffel-geschaelt': { Stk: 80 },
    'suesskartoffel-batate': { Stk: 200 },
    knoblauch: { Zehe: 5 },
    knollensellerie: { Stk: 400 },
    'lauch-porree': { Stange: 150 },
    blumenkohl: { Stk: 600 },
    brokkoli: { Stk: 400 },
    champignon: { Stk: 15 },
    avocado: { Stk: 150 },
    'fruehlingszwiebel-lauchzwiebel': { Stk: 15 },

    // Obst
    apfel: { Stk: 150 },
    banane: { Stk: 120 },
    'orange-apfelsine': { Stk: 170 },
    zitrone: { Stk: 85 },
    limette: { Stk: 50 },

    // Eier
    'huehnerei-ganz': { Stk: 60 },

    // Milchprodukte
    'butter-mild-gesaeuert': { EL: 12 },
    'schlagsahne-36': { EL: 15 },

    // Getreide
    'weizenmehl-type-405': { EL: 8 },
    'weizenmehl-type-550': { EL: 8 },
    'zucker-weiss-raffinade': { EL: 12, TL: 4 },
    bienenhonig: { EL: 21, TL: 7 },
    'reis-poliert': { Tasse: 200 },
    'hafer-flocken': { EL: 10 },

    // Öle & Fette
    olivenoel: { EL: 13, TL: 4.5 },
    sonnenblumenoel: { EL: 13, TL: 4.5 },
    'rapsoel-rueboel': { EL: 13, TL: 4.5 },

    // Gewürze
    'speisesalz-siedesalz-tafelsalz': { TL: 6, Prise: 0.3 },
    'pfeffer-schwarz-getrocknet': { TL: 3, Prise: 0.2 },
};
