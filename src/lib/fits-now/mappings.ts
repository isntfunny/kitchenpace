import type { Season, TimeSlot } from './context';

// ── Filter Criteria ──────────────────────────────────────────────────────────

export interface FilterCriteria {
    categorySlugs: string[];
    tagKeywords: string[];
    ingredientKeywords: string[];
    maxTotalTime?: number;
}

// ── Time + Season Baseline Mappings ──────────────────────────────────────────

type MappingKey = `${TimeSlot}:${Season}` | `${TimeSlot}:*`;

const MAPPINGS: Record<MappingKey, FilterCriteria> = {
    // ── Fruehstueck (all seasons share base, season-specific overrides below)
    'fruehstueck:*': {
        categorySlugs: ['fruehstueck'],
        tagKeywords: ['fruehstueck', 'muesli', 'broetchen', 'aufstrich', 'porridge', 'smoothie'],
        ingredientKeywords: [],
        maxTotalTime: 25,
    },
    'fruehstueck:winter': {
        categorySlugs: ['fruehstueck'],
        tagKeywords: ['fruehstueck', 'porridge', 'haferbrei', 'broetchen', 'warm'],
        ingredientKeywords: ['haferflocken', 'zimt'],
        maxTotalTime: 25,
    },
    'fruehstueck:sommer': {
        categorySlugs: ['fruehstueck'],
        tagKeywords: ['fruehstueck', 'smoothie', 'muesli', 'joghurt', 'obst'],
        ingredientKeywords: ['beeren', 'joghurt'],
        maxTotalTime: 20,
    },

    // ── Brunch
    'brunch:*': {
        categorySlugs: ['fruehstueck', 'vorspeise'],
        tagKeywords: ['brunch', 'eierspeise', 'pancake', 'waffel', 'aufstrich'],
        ingredientKeywords: [],
        maxTotalTime: 35,
    },

    // ── Mittagessen
    'mittag:*': {
        categorySlugs: ['hauptgericht', 'beilage', 'vorspeise'],
        tagKeywords: ['mittagessen', 'schnell', 'alltagskueche'],
        ingredientKeywords: [],
        maxTotalTime: 45,
    },
    'mittag:winter': {
        categorySlugs: ['hauptgericht', 'beilage', 'vorspeise'],
        tagKeywords: ['eintopf', 'suppe', 'herzhaft', 'deftig', 'braten', 'auflauf'],
        ingredientKeywords: ['kartoffel', 'kohl'],
        maxTotalTime: 60,
    },
    'mittag:sommer': {
        categorySlugs: ['hauptgericht', 'salat', 'vorspeise'],
        tagKeywords: ['leicht', 'salat', 'grillen', 'kalt', 'erfrischend'],
        ingredientKeywords: ['tomate', 'gurke'],
        maxTotalTime: 40,
    },
    'mittag:herbst': {
        categorySlugs: ['hauptgericht', 'beilage', 'vorspeise'],
        tagKeywords: ['herzhaft', 'suppe', 'eintopf', 'pilze', 'herbstlich'],
        ingredientKeywords: ['pilze', 'kuerbis'],
        maxTotalTime: 50,
    },
    'mittag:fruehling': {
        categorySlugs: ['hauptgericht', 'salat', 'vorspeise'],
        tagKeywords: ['frisch', 'leicht', 'fruehling', 'kraeuter'],
        ingredientKeywords: ['baerlauch', 'radieschen'],
        maxTotalTime: 45,
    },

    // ── Nachmittag (Kaffee & Kuchen)
    'nachmittag:*': {
        categorySlugs: ['backen', 'dessert'],
        tagKeywords: ['kuchen', 'torte', 'gebaeck', 'kaffee', 'muffin'],
        ingredientKeywords: [],
    },
    'nachmittag:sommer': {
        categorySlugs: ['backen', 'dessert'],
        tagKeywords: ['kuchen', 'torte', 'eis', 'kalt', 'erfrischend', 'obstkuchen'],
        ingredientKeywords: ['erdbeere', 'beeren'],
    },
    'nachmittag:herbst': {
        categorySlugs: ['backen', 'dessert'],
        tagKeywords: ['kuchen', 'apfelkuchen', 'zimt', 'pflaume', 'herbstlich'],
        ingredientKeywords: ['apfel', 'zimt', 'pflaume'],
    },

    // ── Abendessen
    'abend:*': {
        categorySlugs: ['hauptgericht', 'vorspeise'],
        tagKeywords: ['abendessen', 'herzhaft'],
        ingredientKeywords: [],
        maxTotalTime: 60,
    },
    'abend:winter': {
        categorySlugs: ['hauptgericht', 'beilage'],
        tagKeywords: ['deftig', 'herzhaft', 'braten', 'eintopf', 'auflauf', 'ueberbacken'],
        ingredientKeywords: ['kartoffel', 'kaese'],
        maxTotalTime: 75,
    },
    'abend:sommer': {
        categorySlugs: ['hauptgericht', 'salat'],
        tagKeywords: ['leicht', 'grillen', 'erfrischend', 'salat', 'kalt'],
        ingredientKeywords: [],
        maxTotalTime: 45,
    },
    'abend:herbst': {
        categorySlugs: ['hauptgericht', 'beilage'],
        tagKeywords: ['herzhaft', 'pilze', 'kuerbis', 'herbstlich', 'schmoren'],
        ingredientKeywords: ['pilze', 'kuerbis'],
        maxTotalTime: 60,
    },

    // ── Spaeter Snack
    'spaet:*': {
        categorySlugs: ['vorspeise', 'dessert'],
        tagKeywords: ['snack', 'fingerfood', 'haeppchen', 'schnell'],
        ingredientKeywords: [],
        maxTotalTime: 20,
    },
};

// ── Lookup ───────────────────────────────────────────────────────────────────

export function getTimeSeasonCriteria(timeSlot: TimeSlot, season: Season): FilterCriteria {
    // Try specific combo first, fall back to wildcard
    const specific = MAPPINGS[`${timeSlot}:${season}`];
    if (specific) return specific;
    return MAPPINGS[`${timeSlot}:*`];
}
