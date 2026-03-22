import type { DateResolveType } from '@prisma/client';

// ── Types ───────────────────────────────────────────────────────────────────

interface TimeSeasonSeed {
    timeSlot: string;
    season: string;
    displayLabel: string;
    categorySlugs: string[];
    tagNames: string[];
    maxTotalTime?: number;
}

interface FoodPeriodSeed {
    slug: string;
    label: string;
    description: string;
    override: boolean;
    resolveType: DateResolveType;
    startMonth?: number;
    startDay?: number;
    endMonth?: number;
    endDay?: number;
    startOffsetDays?: number;
    endOffsetDays?: number;
    leadDays?: number;
    trailDays?: number;
    categorySlugs: string[];
    tagNames: string[];
    maxTotalTime?: number;
    sortOrder?: number;
}

// ── Time-Season Filter Sets ─────────────────────────────────────────────────

export const TIME_SEASON_SEEDS: TimeSeasonSeed[] = [
    // Frühstück
    {
        timeSlot: 'fruehstueck',
        season: '*',
        displayLabel: 'Leckere Frühstücksideen',
        categorySlugs: ['fruehstueck'],
        tagNames: ['Frühstück', 'Müsli', 'Brötchen', 'Aufstrich', 'Porridge', 'Smoothie'],
        maxTotalTime: 25,
    },
    {
        timeSlot: 'fruehstueck',
        season: 'winter',
        displayLabel: 'Gemütliches Winter-Frühstück',
        categorySlugs: ['fruehstueck'],
        tagNames: ['Frühstück', 'Porridge', 'Brötchen', 'Warm'],
        maxTotalTime: 25,
    },
    {
        timeSlot: 'fruehstueck',
        season: 'fruehling',
        displayLabel: 'Frische Frühstücksideen für den Frühling',
        categorySlugs: ['fruehstueck'],
        tagNames: ['Frühstück', 'Müsli', 'Joghurt', 'Frisch', 'Kräuter'],
        maxTotalTime: 25,
    },
    {
        timeSlot: 'fruehstueck',
        season: 'sommer',
        displayLabel: 'Leichtes Frühstück für warme Sommertage',
        categorySlugs: ['fruehstueck'],
        tagNames: ['Frühstück', 'Smoothie', 'Müsli', 'Joghurt', 'Obst'],
        maxTotalTime: 20,
    },
    {
        timeSlot: 'fruehstueck',
        season: 'herbst',
        displayLabel: 'Warmes Frühstück für den Herbst',
        categorySlugs: ['fruehstueck'],
        tagNames: ['Frühstück', 'Porridge', 'Pfannkuchen', 'Warm', 'Gemütlich'],
        maxTotalTime: 25,
    },

    // Brunch
    {
        timeSlot: 'brunch',
        season: '*',
        displayLabel: 'Brunch-Ideen für jeden Tag',
        categorySlugs: ['fruehstueck', 'vorspeise'],
        tagNames: ['Brunch', 'Eierspeise', 'Pancake', 'Waffel', 'Aufstrich'],
        maxTotalTime: 35,
    },
    {
        timeSlot: 'brunch',
        season: 'fruehling',
        displayLabel: 'Frühlingsfrischer Brunch',
        categorySlugs: ['fruehstueck', 'vorspeise', 'salat'],
        tagNames: ['Brunch', 'Eierspeise', 'Frisch', 'Kräuter', 'Quiche'],
        maxTotalTime: 40,
    },
    {
        timeSlot: 'brunch',
        season: 'sommer',
        displayLabel: 'Leichter Sommerbrunch',
        categorySlugs: ['fruehstueck', 'vorspeise', 'salat'],
        tagNames: ['Brunch', 'Smoothie', 'Bowl', 'Obst', 'Leicht', 'Erfrischend'],
        maxTotalTime: 30,
    },
    {
        timeSlot: 'brunch',
        season: 'herbst',
        displayLabel: 'Herbstlicher Brunch',
        categorySlugs: ['fruehstueck', 'vorspeise', 'backen'],
        tagNames: ['Brunch', 'Pancake', 'Waffel', 'Kürbis', 'Gemütlich'],
        maxTotalTime: 40,
    },
    {
        timeSlot: 'brunch',
        season: 'winter',
        displayLabel: 'Gemütlicher Winterbrunch',
        categorySlugs: ['fruehstueck', 'vorspeise', 'backen'],
        tagNames: ['Brunch', 'Eierspeise', 'Warm', 'Deftig', 'Waffel'],
        maxTotalTime: 45,
    },

    // Mittagessen
    {
        timeSlot: 'mittag',
        season: '*',
        displayLabel: 'Schnelle Mittagsgerichte',
        categorySlugs: ['hauptgericht', 'beilage', 'vorspeise'],
        tagNames: ['Mittagessen', 'Schnell', 'Alltagsküche'],
        maxTotalTime: 45,
    },
    {
        timeSlot: 'mittag',
        season: 'winter',
        displayLabel: 'Herzhafte Winterküche zum Mittag',
        categorySlugs: ['hauptgericht', 'beilage', 'vorspeise'],
        tagNames: ['Eintopf', 'Suppe', 'Herzhaft', 'Deftig', 'Braten', 'Auflauf'],
        maxTotalTime: 60,
    },
    {
        timeSlot: 'mittag',
        season: 'sommer',
        displayLabel: 'Sommerlich-frische Mittagsgerichte',
        categorySlugs: ['hauptgericht', 'salat', 'vorspeise'],
        tagNames: ['Leicht', 'Salat', 'Grillen', 'Kalt', 'Erfrischend'],
        maxTotalTime: 40,
    },
    {
        timeSlot: 'mittag',
        season: 'herbst',
        displayLabel: 'Herbstliche Mittagsgerichte',
        categorySlugs: ['hauptgericht', 'beilage', 'vorspeise'],
        tagNames: ['Herzhaft', 'Suppe', 'Eintopf', 'Pilze', 'Herbstlich'],
        maxTotalTime: 50,
    },
    {
        timeSlot: 'mittag',
        season: 'fruehling',
        displayLabel: 'Leichte Frühlingsküche zum Mittag',
        categorySlugs: ['hauptgericht', 'salat', 'vorspeise'],
        tagNames: ['Frisch', 'Leicht', 'Frühling', 'Kräuter'],
        maxTotalTime: 45,
    },

    // Nachmittag
    {
        timeSlot: 'nachmittag',
        season: '*',
        displayLabel: 'Kaffee & Kuchen',
        categorySlugs: ['backen', 'dessert'],
        tagNames: ['Kuchen', 'Torte', 'Gebäck', 'Kaffee', 'Muffin'],
    },
    {
        timeSlot: 'nachmittag',
        season: 'sommer',
        displayLabel: 'Sommerliche Kuchen und Torten',
        categorySlugs: ['backen', 'dessert'],
        tagNames: ['Kuchen', 'Torte', 'Eis', 'Kalt', 'Erfrischend', 'Obstkuchen'],
    },
    {
        timeSlot: 'nachmittag',
        season: 'herbst',
        displayLabel: 'Herbstliches Gebäck',
        categorySlugs: ['backen', 'dessert'],
        tagNames: ['Kuchen', 'Apfelkuchen', 'Herbstlich'],
    },
    {
        timeSlot: 'nachmittag',
        season: 'fruehling',
        displayLabel: 'Frühlingshaftes zum Kaffee',
        categorySlugs: ['backen', 'dessert'],
        tagNames: ['Kuchen', 'Torte', 'Rhabarber', 'Leicht', 'Fruchtig'],
    },
    {
        timeSlot: 'nachmittag',
        season: 'winter',
        displayLabel: 'Gemütliches Wintergebäck',
        categorySlugs: ['backen', 'dessert'],
        tagNames: ['Kuchen', 'Plätzchen', 'Lebkuchen', 'Stollen', 'Gemütlich', 'Weihnachten'],
    },

    // Abendessen
    {
        timeSlot: 'abend',
        season: '*',
        displayLabel: 'Leckere Abendgerichte',
        categorySlugs: ['hauptgericht', 'vorspeise'],
        tagNames: ['Abendessen', 'Herzhaft'],
        maxTotalTime: 60,
    },
    {
        timeSlot: 'abend',
        season: 'winter',
        displayLabel: 'Deftige Wintergerichte zum Abend',
        categorySlugs: ['hauptgericht', 'beilage'],
        tagNames: ['Deftig', 'Herzhaft', 'Braten', 'Eintopf', 'Auflauf', 'Überbacken'],
        maxTotalTime: 75,
    },
    {
        timeSlot: 'abend',
        season: 'sommer',
        displayLabel: 'Sommerlich-leichte Abendgerichte',
        categorySlugs: ['hauptgericht', 'salat'],
        tagNames: ['Leicht', 'Grillen', 'Erfrischend', 'Salat', 'Kalt'],
        maxTotalTime: 45,
    },
    {
        timeSlot: 'abend',
        season: 'herbst',
        displayLabel: 'Herzhafte Herbstgerichte am Abend',
        categorySlugs: ['hauptgericht', 'beilage'],
        tagNames: ['Herzhaft', 'Pilze', 'Kürbis', 'Herbstlich', 'Schmoren'],
        maxTotalTime: 60,
    },
    {
        timeSlot: 'abend',
        season: 'fruehling',
        displayLabel: 'Leichte Frühlingsgerichte zum Abend',
        categorySlugs: ['hauptgericht', 'salat', 'vorspeise'],
        tagNames: ['Frisch', 'Leicht', 'Kräuter', 'Spargel', 'Frühling'],
        maxTotalTime: 50,
    },

    // Später Snack
    {
        timeSlot: 'spaet',
        season: '*',
        displayLabel: 'Kleine Snacks für den späten Abend',
        categorySlugs: ['vorspeise', 'dessert'],
        tagNames: ['Snack', 'Fingerfood', 'Häppchen', 'Schnell'],
        maxTotalTime: 20,
    },
    {
        timeSlot: 'spaet',
        season: 'fruehling',
        displayLabel: 'Frische Snacks für den späten Abend',
        categorySlugs: ['vorspeise', 'dessert'],
        tagNames: ['Snack', 'Fingerfood', 'Frisch', 'Dip', 'Leicht'],
        maxTotalTime: 20,
    },
    {
        timeSlot: 'spaet',
        season: 'sommer',
        displayLabel: 'Leichte Sommer-Snacks',
        categorySlugs: ['vorspeise', 'dessert', 'getraenk'],
        tagNames: ['Snack', 'Eis', 'Erfrischend', 'Kalt', 'Leicht'],
        maxTotalTime: 15,
    },
    {
        timeSlot: 'spaet',
        season: 'herbst',
        displayLabel: 'Herbstliche Snacks für den späten Abend',
        categorySlugs: ['vorspeise', 'dessert', 'backen'],
        tagNames: ['Snack', 'Gemütlich', 'Warm', 'Suppe', 'Muffin'],
        maxTotalTime: 25,
    },
    {
        timeSlot: 'spaet',
        season: 'winter',
        displayLabel: 'Warme Winter-Snacks',
        categorySlugs: ['vorspeise', 'dessert', 'getraenk'],
        tagNames: ['Snack', 'Glühwein', 'Plätzchen', 'Warm', 'Gemütlich'],
        maxTotalTime: 25,
    },
];

// ── Food-Cultural Periods ───────────────────────────────────────────────────

export const FOOD_PERIOD_SEEDS: FoodPeriodSeed[] = [
    {
        slug: 'adventszeit',
        label: 'Adventszeit',
        description: 'Adventszeit — Plätzchen, Glühwein und festliche Rezepte',
        override: true,
        resolveType: 'RELATIVE_ADVENT',
        startOffsetDays: 0,
        endOffsetDays: 24, // ~Dec 24 (1st Advent + 24 days)
        categorySlugs: ['backen'],
        tagNames: [
            'Advent',
            'Plätzchen',
            'Weihnachten',
            'Lebkuchen',
            'Stollen',
            'Glühwein',
            'Zimtsterne',
            'Vanillekipferl',
        ],
        sortOrder: 1,
    },
    {
        slug: 'weihnachtszeit',
        label: 'Weihnachtszeit',
        description: 'Weihnachtszeit — Festliche Gerichte und Weihnachtsbäckerei',
        override: true,
        resolveType: 'RELATIVE_ADVENT',
        startOffsetDays: 0,
        endOffsetDays: 26, // ~Dec 26
        trailDays: 2,
        categorySlugs: ['hauptgericht', 'backen'],
        tagNames: [
            'Weihnachten',
            'Weihnachtsbraten',
            'Festlich',
            'Gans',
            'Rotkohl',
            'Knödel',
            'Plätzchen',
            'Lebkuchen',
        ],
        sortOrder: 2,
    },
    {
        slug: 'plaetzchenzeit',
        label: 'Plätzchenzeit',
        description: 'Plätzchenzeit — Jetzt wird gebacken!',
        override: true,
        resolveType: 'FIXED',
        startMonth: 10, // Nov (0-indexed)
        startDay: 15,
        endMonth: 11, // Dec
        endDay: 25,
        categorySlugs: ['backen'],
        tagNames: [
            'Plätzchen',
            'Kekse',
            'Gebäck',
            'Weihnachtsbäckerei',
            'Lebkuchen',
            'Zimtsterne',
            'Vanillekipferl',
            'Stollen',
        ],
        sortOrder: 3,
    },
    {
        slug: 'osterzeit',
        label: 'Osterzeit',
        description: 'Osterzeit — Hefezopf, Osterlamm und Brunch-Ideen',
        override: true,
        resolveType: 'RELATIVE_EASTER',
        startOffsetDays: -7,
        endOffsetDays: 1,
        categorySlugs: [],
        tagNames: ['Ostern', 'Hefezopf', 'Osterlamm', 'Osterbrunch'],
        sortOrder: 4,
    },
    {
        slug: 'silvester',
        label: 'Silvester',
        description: 'Silvester — Fingerfood, Fondue und Party-Snacks',
        override: true,
        resolveType: 'FIXED',
        startMonth: 11,
        startDay: 31,
        endMonth: 11,
        endDay: 31,
        leadDays: 3,
        categorySlugs: [],
        tagNames: ['Silvester', 'Party', 'Fingerfood', 'Häppchen', 'Fondue', 'Raclette'],
        sortOrder: 5,
    },
    {
        slug: 'grillsaison',
        label: 'Grillsaison',
        description: 'Grillsaison — Ab auf den Grill!',
        override: false,
        resolveType: 'FIXED',
        startMonth: 4,
        startDay: 1,
        endMonth: 8,
        endDay: 30,
        categorySlugs: [],
        tagNames: ['Grillen', 'Marinade', 'BBQ', 'Grillbeilage'],
        sortOrder: 6,
    },
    {
        slug: 'spargelzeit',
        label: 'Spargelzeit',
        description: 'Spargelzeit — Weißer und grüner Spargel',
        override: false,
        resolveType: 'FIXED',
        startMonth: 3,
        startDay: 15,
        endMonth: 5,
        endDay: 24,
        categorySlugs: [],
        tagNames: ['Spargel', 'Hollandaise', 'Spargelsuppe'],
        sortOrder: 7,
    },
    {
        slug: 'erdbeerzeit',
        label: 'Erdbeerzeit',
        description: 'Erdbeerzeit — Frische Erdbeer-Rezepte',
        override: false,
        resolveType: 'FIXED',
        startMonth: 4,
        startDay: 15,
        endMonth: 6,
        endDay: 15,
        categorySlugs: [],
        tagNames: ['Erdbeere', 'Erdbeeren', 'Erdbeerkuchen', 'Erdbeertorte'],
        sortOrder: 8,
    },
    {
        slug: 'kuerbiszeit',
        label: 'Kürbiszeit',
        description: 'Kürbiszeit — Suppen, Ofengemüse und mehr',
        override: false,
        resolveType: 'FIXED',
        startMonth: 8,
        startDay: 15,
        endMonth: 10,
        endDay: 15,
        categorySlugs: [],
        tagNames: ['Kürbis', 'Kürbissuppe', 'Hokkaido', 'Butternut'],
        sortOrder: 9,
    },
];
