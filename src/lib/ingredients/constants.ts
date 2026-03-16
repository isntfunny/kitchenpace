/**
 * Shared ingredient constants: units, category defaults, ingredient-specific gram overrides.
 * Extracted from the former BLS constants — these are DB-agnostic and apply to both
 * BLS and Swiss Food Composition Database imports.
 */

// Categories are extracted dynamically from swiss-foods.json in the seeder.
// No hardcoded category list needed — the Swiss DB category field drives it.

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
/** Default units per top-level Swiss category. Used when linking IngredientUnits. */
export const DEFAULT_UNITS_PER_CATEGORY: Record<string, string[]> = {
    Gemüse: ['g', 'kg', 'Stk'],
    Früchte: ['g', 'kg', 'Stk'],
    'Fleisch und Innereien': ['g', 'kg'],
    Fisch: ['g', 'kg', 'Filet'],
    'Milch und Milchprodukte': ['g', 'kg', 'ml', 'l', 'EL', 'TL', 'Becher'],
    Eier: ['Stk'],
    'Fette und Öle': ['ml', 'l', 'EL', 'TL'],
    'Getreideprodukte, Hülsenfrüchte und Kartoffeln': ['g', 'kg', 'EL', 'TL', 'Tasse'],
    'Brote, Flocken und Frühstückscerealien': ['g', 'Stk', 'Scheibe'],
    'Nüsse, Samen und Ölfrüchte': ['g', 'Handvoll'],
    'Fleisch- und Wurstwaren': ['g', 'kg', 'Scheibe'],
    Verschiedenes: ['g', 'TL', 'EL', 'Prise'],
    Süssigkeiten: ['g', 'Stk'],
    'Alkoholfreie Getränke': ['ml', 'l'],
    'Alkoholhaltige Getränke': ['ml', 'l'],
    'Pflanzliche Alternativen': ['g', 'ml', 'Stk'],
    'Salzige Snacks': ['g', 'Stk'],
    Gerichte: ['g'],
    Speziallebensmittel: ['g'],
};

/**
 * Curated ingredient-specific unit gram overrides.
 * Keys must match the slugified Swiss Food DB names.
 */
export const INGREDIENT_UNIT_GRAMS: Record<string, Record<string, number>> = {
    // Gemüse
    'tomate-roh': { Stk: 80 },
    'zwiebel-roh': { Stk: 80 },
    'gurke-roh': { Stk: 400 },
    'karotte-roh': { Stk: 60 },
    'zucchini-roh': { Stk: 200 },
    'aubergine-roh': { Stk: 300 },
    'kartoffel-geschaelt-roh': { Stk: 80 },
    'suesskartoffel-roh': { Stk: 200 },
    'knoblauch-roh': { Zehe: 5 },
    'lauch-roh': { Stange: 150 },
    'blumenkohl-roh': { Stk: 600 },
    'brokkoli-roh': { Stk: 400 },
    'champignon-roh': { Stk: 15 },
    'avocado-roh': { Stk: 150 },

    // Obst
    'apfel-roh': { Stk: 150 },
    'banane-roh': { Stk: 120 },
    'orange-roh': { Stk: 170 },
    'zitrone-roh': { Stk: 85 },
    'limette-roh': { Stk: 50 },

    // Eier
    'huehnerei-ganz-roh': { Stk: 60 },

    // Milchprodukte
    butter: { EL: 12 },
    'schlagsahne-pasteurisiert': { EL: 15 },

    // Getreide
    'weizenmehl-backmehl-typ-550': { EL: 8 },
    'weizenmehl-weiss-typ-400': { EL: 8 },
    'zucker-weiss': { EL: 12, TL: 4 },
    'honig-bluetenhonig': { EL: 21, TL: 7 },
    haferflocken: { EL: 10 },

    // Öle & Fette
    olivenoel: { EL: 13, TL: 4.5 },
    sonnenblumenoel: { EL: 13, TL: 4.5 },
    rapsoel: { EL: 13, TL: 4.5 },

    // Gewürze
    jodsalz: { TL: 6, Prise: 0.3 },
    speisesalz: { TL: 6, Prise: 0.3 },
    'speisesalz-jodiert-fluoridiert': { TL: 6, Prise: 0.3 },
    'pfeffer-schwarz-getrocknet': { TL: 3, Prise: 0.2 },
};
