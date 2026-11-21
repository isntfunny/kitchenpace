// Fixed tag list (KUC-116): single source of truth for import, admin and the
// cleanup script. Tags are maintained here in code, not in the database.
//
// Each tag lists the old tag names that get merged into it. Old names are
// matched case-insensitively. DROPPED_TAGS lists old tags that are removed
// without replacement, grouped by the reason.
import slugifyLib from 'slugify';

export const TAG_GROUPS = {
    Mahlzeit: {
        Mittagessen: [],
        Abendessen: [],
    },
    Saison: {
        Frühling: [],
        Sommer: ['sommerlich leicht', 'Erdbeerzeit'],
        Herbst: ['Apfelzeit'],
        Winter: ['winterlich', 'Winterabende'],
        Ganzjährig: [],
    },
    Anlass: {
        Weihnachten: ['Nikolaus'],
        Advent: [],
        Ostern: ['Osterbrunch'],
        Silvester: [],
        Valentinstag: ['Romantisch'],
        Muttertag: [],
        Geburtstag: [],
        'Fasching & Karneval': ['Fasching/Karneval'],
        Halloween: [],
        Oktoberfest: [],
        'Für Gäste': ['Das perfekte Dinner', 'elegant'],
        Party: ['Fingerfood', 'Buffet', 'Jahrmarkt'],
        Grillen: [
            'Grillsaison',
            'Zum Grillen',
            'Grillabend',
            'BBQ',
            'Gegrillt',
            'Gartenparty',
            'Sommerfest',
            'Outdoor-Kochen',
        ],
        Picknick: [],
        Brunch: [],
        'Kaffee & Kuchen': ['Nachmittagskaffee', 'Kaffee und Kuchen', 'Teezeit'],
        Familienessen: ['familienfreundlich', 'Sonntagsessen', 'Sonntagsglück', 'Wochenend-Kochen'],
        Feierabendküche: ['Alltag', 'Büro-Lunch'],
        'Geschenk aus der Küche': ['Mitbringsel'],
        Festlich: ['Feierlich', 'zum Verwöhnen', 'für Verwöhnen'],
    },
    Ernährung: {
        Vegetarisch: [],
        Vegan: ['ohne tierische Produkte'],
        Glutenfrei: [],
        Laktosefrei: [],
        Eifrei: [],
        Nussfrei: [],
        Alkoholfrei: [],
        Alkoholisch: [
            'Likör',
            'Cocktail',
            'Aperitif',
            'Bowle',
            'Punsch',
            'Glühwein',
            'Rum',
            'Schnaps',
            'Whisky',
            'Wodka',
            'Amaretto',
            'Sekt',
            'Rotwein',
            'Weißwein',
        ],
        Proteinreich: ['High Protein', 'Eiweißreich'],
        'Low Carb': ['Keto'],
        Kalorienarm: ['Leicht', 'kalorienreduziert', 'Ohne Fett'],
        'Ohne Zucker': ['Zuckerfrei', 'Ohne Zuckerzusatz', 'Zuckerreduziert'],
        Vollwertig: ['gesund', 'Ballaststoffreich', 'Vitaminreich', 'Rohkost', 'Rohkostrezept'],
    },
    Küche: {
        Deutsch: [
            'Klassisch Deutsch',
            'Norddeutsch',
            'Schwäbisch',
            'Bayerisch',
            'Bayrisch',
            'Rheinisch',
        ],
        Österreichisch: [],
        Schweizerisch: [],
        Italienisch: ['Antipasti'],
        Französisch: [],
        Spanisch: ['kanarisch'],
        Griechisch: [],
        Mediterran: [],
        Türkisch: [],
        Orientalisch: ['Arabisch', 'Nordafrikanisch', 'Äthiopisch'],
        Osteuropäisch: ['Böhmisch', 'Polnisch', 'Russisch', 'Ungarisch', 'Balkanküche'],
        Skandinavisch: ['Schwedisch', 'dänisch'],
        Amerikanisch: [],
        Mexikanisch: ['lateinamerikanisch', 'Bolivianisch'],
        Indisch: [],
        Asiatisch: ['Fusion'],
        Chinesisch: [],
        Japanisch: [],
        Koreanisch: [],
        Thailändisch: ['Thaisch'],
        Vietnamesisch: [],
    },
    Charakter: {
        Süß: ['fruchtig-süß', 'Zuckerhaltig'],
        Herzhaft: ['pikant'],
        Fruchtig: ['zitronig'],
        Cremig: ['sahnig', 'sämig'],
        Würzig: ['Aromatisch'],
        Scharf: [],
        Knusprig: [],
        Saftig: [],
        Erfrischend: ['Frisch', 'spritzig', 'kühl serviert', 'Kalt serviert'],
        Wärmend: ['warm', 'Heißgetränk', 'Erkältungszeit'],
        Sättigend: [],
        'Comfort Food': ['gemütlich', 'Wohlfühlmoment', 'rustikal'],
        Klassiker: ['klassisch', 'traditionell', 'hausgemacht'],
        Schokoladig: [],
    },
    Praktisch: {
        'Vorbereitung möglich': ['Meal Prep', 'Make Ahead', 'Über Nacht', 'Kühlschrankgericht'],
        Einfrierbar: [],
        Vorratshaltung: ['Eingemacht', 'Kellerlager'],
        Resteverwertung: ['Reste verwerten'],
        Kinderfreundlich: ['Für Kinder'],
        Günstig: ['kostengünstig', 'Studentenküche'],
        'Für eine Person': [],
        Grundrezept: ['Küchenbasis'],
        Ofengericht: [],
        Pfannengericht: ['Wok'],
        'Ein Topf': ['Einpot'],
        'Ohne Backen': ['No-Bake', 'Ofenfrei'],
        Heißluftfritteuse: ['Airfryer'],
        Slowcooker: ['Slow Cooker', 'Crockpot', 'Instant Pot'],
        Frittiert: [],
    },
} as const satisfies Record<string, Record<string, readonly string[]>>;

/** Old tags removed without replacement, by reason. */
export const DROPPED_TAGS = {
    'Schwierigkeit (Feld)': ['Einfach', 'Mittel', 'Aufwendig', 'Für Einsteiger'],
    'Zeit (Feld)': [
        'Schnell',
        'schnell & unkompliziert',
        'Unter 15 Minuten',
        'Unter 30 Minuten',
        'Unter 1 Stunde',
        'Ruhezeit',
    ],
    Kategorie: [
        'Hauptgericht',
        'Vorspeise',
        'Beilage',
        'Dessert',
        'Nachtisch',
        'Nachttisch',
        'Frühstück',
        'Getränk',
        'Salat',
        'Backen',
        'Snack',
    ],
    'Tätigkeit/Technik': [
        'Kochen',
        'Gebacken',
        'Marinieren',
        'mariniert',
        'Beizen',
        'Gedämpft',
        'Sous Vide',
        'Fermentiert',
        'Mikrowelle',
        'Küchenmaschine',
        'Eismaschine',
        'Gefrierfach',
        'Vorteig',
        'Teig',
        'Hefeteig',
        'Sauerteig',
        'Blätterteig',
        'Tortenboden',
        'Biskuit',
    ],
    'Zutat (steht in Zutaten)': [
        'Zitrusfrüchte',
        'Beeren',
        'Kokos',
        'Kürbis',
        'Vanille',
        'Honig',
        'Ingwer',
        'Minze',
        'Karamell',
        'Karotte',
        'Basilikum',
        'Dill',
        'Dinkel',
        'Erdnuss',
        'Hackfleisch',
        'Kirschen',
        'Kräuter',
        'Paprika',
        'Petersilie',
        'Pflaumen',
        'Rindfleisch',
        'Sahne',
        'Schokolade',
        'Sesam',
        'Walnuss',
        'Zwiebel',
        'Kaffee',
        'Fisch',
        'Meeresfrüchte',
        'Blüten',
        'Gewürz',
    ],
    'Gerichtsname/-art': [
        'Brot',
        'Hefegebäck',
        'Kuchen',
        'Blechkuchen',
        'Rührkuchen',
        'Torte',
        'Waffeltorte',
        'Biskuitrolle',
        'Muffins',
        'Cupcakes',
        'Kekse',
        'Brötchen',
        'Waffeln',
        'Bananenbrot',
        'Quiche',
        'Suppe',
        'Schaumsuppe',
        'Eintopf',
        'Auflauf',
        'Curry',
        'Burger',
        'Bowl',
        'Smoothie',
        'Limonade',
        'Mixgetränke',
        'Kultgetränk',
        'Sirup',
        'Marmelade',
        'Dip',
        'Brotaufstrich',
        'Aufstrich',
        'Dessertsoße',
        'Eis',
        'Kloß',
        'Eiergericht',
        'Reisgericht',
        'Nudelgericht',
        'Kartoffelgericht',
        'Käsegericht',
        'Brotgericht',
    ],
    'zu vage': [
        'Modern',
        'kreativ',
        'Luftig',
        'nussig',
        'kernig',
        'blumig',
        'pilzig',
        'weich',
        'heiß',
        'stark',
        'Mild',
        'Lauwarm',
        'Sauer',
        'süß-sauer',
        'Dunkle Variante',
        'Helle Variante',
        'Saisonal',
        'Umami',
        'Immunsystem',
        'Antioxidantienreich',
        'Herzgesund',
        'Histaminarm',
        'Omega-3-reich',
        'Paleo',
        'Sportlerküche',
    ],
} as const satisfies Record<string, readonly string[]>;

/**
 * Old slugs that do not follow from the tag name (umlauts were stripped when
 * they were created), mapped to the list tag they now belong to. Needed for
 * redirects of old /tag/ URLs.
 */
const OLD_TAG_SLUGS: Record<string, string> = {
    'geschenk-aus-der-k-che': 'Geschenk aus der Küche',
    'balkank-che': 'Osteuropäisch',
    'b-hmisch': 'Osteuropäisch',
    thiopisch: 'Orientalisch',
};

export type TagGroup = keyof typeof TAG_GROUPS;
export type DropReason = keyof typeof DROPPED_TAGS;

export interface TagDefinition {
    name: string;
    slug: string;
    group: TagGroup;
    /** Old tag names merged into this tag */
    aliases: readonly string[];
}

/** Same rules as src/lib/slug.ts (checked by a test), kept local so shared/ has no src/ import. */
export function tagSlug(name: string): string {
    return slugifyLib(name, { lower: true, strict: true, locale: 'de' });
}

const key = (name: string) => name.trim().toLowerCase();

/** All list tags in group order. */
export const TAG_LIST: readonly TagDefinition[] = Object.entries(TAG_GROUPS).flatMap(
    ([group, tags]) =>
        Object.entries(tags).map(([name, aliases]) => ({
            name,
            slug: tagSlug(name),
            group: group as TagGroup,
            aliases,
        })),
);

/** All list tag names, alphabetically (German collation) — stable for prompt caching. */
export const TAG_NAMES_SORTED: readonly string[] = TAG_LIST.map((t) => t.name).sort((a, b) =>
    a.localeCompare(b, 'de'),
);

const byName = new Map(TAG_LIST.map((t) => [key(t.name), t]));
const bySlug = new Map(TAG_LIST.map((t) => [t.slug, t]));
const aliasByName = new Map(TAG_LIST.flatMap((t) => t.aliases.map((a) => [key(a), t] as const)));
const aliasBySlug = new Map([
    ...TAG_LIST.flatMap((t) => t.aliases.map((a) => [tagSlug(a), t] as const)),
    ...Object.entries(OLD_TAG_SLUGS).map(([slug, name]) => [slug, byName.get(key(name))!] as const),
]);
const dropByName = new Map(
    Object.entries(DROPPED_TAGS).flatMap(([reason, names]) =>
        names.map((n) => [key(n), reason as DropReason] as const),
    ),
);
const dropBySlug = new Map(
    Object.entries(DROPPED_TAGS).flatMap(([reason, names]) =>
        names.map((n) => [tagSlug(n), reason as DropReason] as const),
    ),
);

/** A list tag by its exact name (case-insensitive) or slug. Old names do not match. */
export function findListedTag(nameOrSlug: string): TagDefinition | undefined {
    return byName.get(key(nameOrSlug)) ?? bySlug.get(nameOrSlug.trim());
}

/** Keeps only names of list tags (canonical spelling, de-duplicated); everything else is dropped. */
export function pickListedTags(names: readonly string[]): TagDefinition[] {
    const picked = new Map<string, TagDefinition>();
    for (const name of names) {
        const tag = findListedTag(name);
        if (tag) picked.set(tag.slug, tag);
    }
    return [...picked.values()];
}

export type TagResolution =
    | { kind: 'list'; tag: TagDefinition }
    | { kind: 'merge'; tag: TagDefinition }
    | { kind: 'drop'; reason: DropReason }
    | { kind: 'unknown' };

/**
 * Where an existing database tag belongs: it is a list tag, an old name merged
 * into a list tag, a dropped tag, or unknown. Name wins over slug.
 */
export function resolveTag(name: string, slug: string): TagResolution {
    const k = key(name);
    const listed = byName.get(k);
    if (listed) return { kind: 'list', tag: listed };
    const alias = aliasByName.get(k);
    if (alias) return { kind: 'merge', tag: alias };
    const reason = dropByName.get(k);
    if (reason) return { kind: 'drop', reason };
    const listedSlug = bySlug.get(slug);
    if (listedSlug) return { kind: 'merge', tag: listedSlug };
    const aliasSlug = aliasBySlug.get(slug);
    if (aliasSlug) return { kind: 'merge', tag: aliasSlug };
    const reasonSlug = dropBySlug.get(slug);
    if (reasonSlug) return { kind: 'drop', reason: reasonSlug };
    return { kind: 'unknown' };
}

/** New slug for an old tag slug that was merged into a list tag; null otherwise. */
export function mergedTagSlugTarget(slug: string): string | null {
    if (bySlug.has(slug)) return null;
    return aliasBySlug.get(slug)?.slug ?? null;
}
