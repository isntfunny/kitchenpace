/* eslint-disable max-lines */
/**
 * Basics Seeder — no demo recipes, just structural data
 *
 * Creates:
 *   - System user (internal, never logs in)
 *   - Admin user: info@isntfunny.de / voll1111 / ADMIN
 *   - All 8 recipe categories
 *   - ~120 curated German tags
 *   - ~200 common ingredients with units and shopping categories
 *
 * Safe to run multiple times — uses upsert everywhere.
 *
 * Run with:  npx tsx src/lib/seed-basics.ts
 */

import 'dotenv/config';

import { hashPassword } from 'better-auth/crypto';

import { prisma } from '../../shared/prisma';

import { slugify } from './slug';

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
    {
        name: 'Hauptgericht',
        slug: 'hauptgericht',
        color: 'orange' as const,
        icon: 'utensils',
        sortOrder: 0,
        description:
            'Herzhafte Hauptgerichte für jeden Tag — von schnellen Pfannengerichten bis hin zu aufwendigen Sonntagsbraten.',
    },
    {
        name: 'Vorspeise',
        slug: 'vorspeise',
        color: 'purple' as const,
        icon: 'soup',
        sortOrder: 1,
        description: 'Leichte Vorspeisen und Suppen, die Appetit auf mehr machen.',
    },
    {
        name: 'Beilage',
        slug: 'beilage',
        color: 'emerald' as const,
        icon: 'carrot',
        sortOrder: 2,
        description:
            'Die perfekte Ergänzung zu jedem Hauptgericht — Kartoffeln, Gemüse, Reis und mehr.',
    },
    {
        name: 'Salat',
        slug: 'salat',
        color: 'emerald' as const,
        icon: 'leaf',
        sortOrder: 3,
        description: 'Frische Salate für jede Jahreszeit — knackig, bunt und voller Geschmack.',
    },
    {
        name: 'Backen',
        slug: 'backen',
        color: 'gold' as const,
        icon: 'cake-slice',
        sortOrder: 4,
        description: 'Kuchen, Brot, Gebäck und Torten — alles rund ums Backen.',
    },
    {
        name: 'Dessert',
        slug: 'dessert',
        color: 'pink' as const,
        icon: 'ice-cream-cone',
        sortOrder: 5,
        description: 'Süße Versuchungen zum krönenden Abschluss jeder Mahlzeit.',
    },
    {
        name: 'Frühstück',
        slug: 'fruehstueck',
        color: 'gold' as const,
        icon: 'egg-fried',
        sortOrder: 6,
        description: 'Energiegeladene Frühstücksideen für einen guten Start in den Tag.',
    },
    {
        name: 'Getränk',
        slug: 'getraenk',
        color: 'blue' as const,
        icon: 'glass-water',
        sortOrder: 7,
        description: 'Smoothies, Cocktails, Limonaden und heiße Getränke für jeden Anlass.',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tags
// ─────────────────────────────────────────────────────────────────────────────

const TAGS = [
    // Ernährungsweise
    'Vegetarisch',
    'Vegan',
    'Glutenfrei',
    'Laktosefrei',
    'Low Carb',
    'Keto',
    'Paleo',
    'Vollwertig',
    'Rohkost',
    'Zuckerfrei',
    'Zuckerreduziert',
    'Histaminarm',
    'Nussfrei',
    'Eifrei',

    // Küche / Herkunft
    'Italienisch',
    'Asiatisch',
    'Deutsch',
    'Französisch',
    'Mexikanisch',
    'Griechisch',
    'Indisch',
    'Japanisch',
    'Chinesisch',
    'Spanisch',
    'Türkisch',
    'Arabisch',
    'Amerikanisch',
    'Österreichisch',
    'Schweizerisch',
    'Vietnamesisch',
    'Thaisch',
    'Koreanisch',
    'Nordafrikanisch',
    'Skandinavisch',

    // Zeit & Aufwand
    'Schnell',
    'Einfach',
    'Unter 30 Minuten',
    'Unter 15 Minuten',
    'Meal Prep',
    'Vorbereitung möglich',
    'Einpot',
    'Aufwendig',
    'Wochenend-Kochen',
    'Make Ahead',

    // Anlass
    'Familienessen',
    'Party',
    'Feierlich',
    'Romantisch',
    'Mittagessen',
    'Abendessen',
    'Brunch',
    'Picknick',
    'Grillen',
    'Weihnachten',
    'Ostern',
    'Halloween',
    'Valentinstag',
    'Silvester',
    'Geburtstag',

    // Zubereitung
    'Ofengericht',
    'Pfannengericht',
    'Kochen',
    'Rohkostrezept',
    'Smoothie',
    'No-Bake',
    'Slow Cooker',
    'Instant Pot',
    'Frittiert',
    'Gedämpft',
    'Gegrillt',
    'Gebacken',
    'Fermentiert',
    'Eingemacht',

    // Protein
    'Mit Fleisch',
    'Mit Fisch',
    'Mit Meeresfrüchten',
    'Mit Hühnchen',
    'Mit Rindfleisch',
    'Mit Schweinefleisch',
    'Mit Tofu',
    'Mit Ei',
    'Mit Hülsenfrüchten',
    'High Protein',

    // Jahreszeit
    'Sommer',
    'Winter',
    'Frühling',
    'Herbst',
    'Saisonal',

    // Textur / Charakter
    'Scharf',
    'Mild',
    'Cremig',
    'Knusprig',
    'Herzhaft',
    'Süß',
    'Sauer',
    'Umami',
    'Leicht',
    'Sättigend',
    'Comfort Food',
    'Klassiker',
    'Modern',
    'Fusion',

    // Zielgruppe
    'Für Kinder',
    'Studentenküche',
    'Für Einsteiger',
    'Für Gäste',
    'Für Eine Person',

    // Diät / Gesundheit
    'Kalorienarm',
    'Ballaststoffreich',
    'Omega-3-reich',
    'Vitaminreich',
    'Antioxidantienreich',
    'Herzgesund',
    'Sportlerküche',
    'Immunsystem',

    // Sonstiges
    'Reste verwerten',
    'Günstig',
    'Mit Resten',
    'Klassisch Deutsch',
    'Bayrisch',
    'Norddeutsch',
    'Rheinisch',
    'Schwäbisch',
];

// ─────────────────────────────────────────────────────────────────────────────
// Ingredients (legacy list — kept for reference, import now uses BLS data)
// ─────────────────────────────────────────────────────────────────────────────

const _LEGACY_INGREDIENTS = [
    // GEMÜSE
    { name: 'Tomate', units: ['g', 'Stück', 'kg'], category: 'GEMUESE' },
    { name: 'Zwiebel', units: ['Stück', 'g', 'kg'], category: 'GEMUESE' },
    { name: 'Knoblauch', units: ['Zehe', 'Stück', 'g'], category: 'GEMUESE' },
    { name: 'Karotte', units: ['Stück', 'g', 'kg'], category: 'GEMUESE' },
    { name: 'Kartoffel', units: ['g', 'kg', 'Stück'], category: 'GEMUESE' },
    { name: 'Paprika', units: ['Stück', 'g'], category: 'GEMUESE' },
    { name: 'Zucchini', units: ['Stück', 'g'], category: 'GEMUESE' },
    { name: 'Brokkoli', units: ['g', 'Stück'], category: 'GEMUESE' },
    { name: 'Blumenkohl', units: ['g', 'Stück'], category: 'GEMUESE' },
    { name: 'Spinat', units: ['g', 'Handvoll'], category: 'GEMUESE' },
    { name: 'Salat', units: ['Kopf', 'g', 'Handvoll'], category: 'GEMUESE' },
    { name: 'Gurke', units: ['Stück', 'g'], category: 'GEMUESE' },
    { name: 'Aubergine', units: ['Stück', 'g'], category: 'GEMUESE' },
    { name: 'Süßkartoffel', units: ['g', 'Stück'], category: 'GEMUESE' },
    { name: 'Erbsen', units: ['g', 'TL', 'EL'], category: 'GEMUESE' },
    { name: 'Mais', units: ['Dose', 'g', 'Kolben'], category: 'GEMUESE' },
    { name: 'Sellerie', units: ['Stange', 'g', 'Stück'], category: 'GEMUESE' },
    { name: 'Lauch', units: ['Stange', 'g'], category: 'GEMUESE' },
    { name: 'Rote Bete', units: ['Stück', 'g'], category: 'GEMUESE' },
    { name: 'Fenchel', units: ['Knolle', 'g'], category: 'GEMUESE' },
    { name: 'Kohlrabi', units: ['Stück', 'g'], category: 'GEMUESE' },
    { name: 'Rosenkohl', units: ['g', 'Stück'], category: 'GEMUESE' },
    { name: 'Wirsing', units: ['g', 'Kopf'], category: 'GEMUESE' },
    { name: 'Weißkohl', units: ['g', 'Kopf'], category: 'GEMUESE' },
    { name: 'Rotkohl', units: ['g', 'Kopf'], category: 'GEMUESE' },
    { name: 'Spargel', units: ['g', 'Stück', 'Bund'], category: 'GEMUESE' },
    { name: 'Pilze', units: ['g', 'Stück'], category: 'GEMUESE' },
    { name: 'Champignons', units: ['g', 'Stück'], category: 'GEMUESE' },
    { name: 'Ingwer', units: ['cm', 'g', 'TL'], category: 'GEMUESE' },
    { name: 'Chili', units: ['Stück', 'TL', 'g'], category: 'GEMUESE' },
    { name: 'Frühlingszwiebeln', units: ['Stück', 'Bund', 'g'], category: 'GEMUESE' },
    { name: 'Schalotten', units: ['Stück', 'g'], category: 'GEMUESE' },
    { name: 'Avocado', units: ['Stück', 'g'], category: 'GEMUESE' },
    { name: 'Kürbis', units: ['g', 'Stück'], category: 'GEMUESE' },

    // OBST
    { name: 'Zitrone', units: ['Stück', 'EL', 'ml'], category: 'OBST' },
    { name: 'Orange', units: ['Stück', 'ml'], category: 'OBST' },
    { name: 'Apfel', units: ['Stück', 'g'], category: 'OBST' },
    { name: 'Banane', units: ['Stück', 'g'], category: 'OBST' },
    { name: 'Erdbeeren', units: ['g', 'Stück'], category: 'OBST' },
    { name: 'Heidelbeeren', units: ['g'], category: 'OBST' },
    { name: 'Himbeeren', units: ['g'], category: 'OBST' },
    { name: 'Mango', units: ['Stück', 'g'], category: 'OBST' },
    { name: 'Ananas', units: ['Stück', 'g', 'Scheibe'], category: 'OBST' },
    { name: 'Limette', units: ['Stück', 'EL', 'ml'], category: 'OBST' },
    { name: 'Birne', units: ['Stück', 'g'], category: 'OBST' },
    { name: 'Weintrauben', units: ['g', 'Traube'], category: 'OBST' },
    { name: 'Kirschen', units: ['g', 'Stück'], category: 'OBST' },
    { name: 'Pfirsich', units: ['Stück', 'g'], category: 'OBST' },

    // FLEISCH
    { name: 'Hähnchenbrust', units: ['g', 'Stück'], category: 'FLEISCH' },
    { name: 'Hähnchenkeule', units: ['Stück', 'g'], category: 'FLEISCH' },
    { name: 'Hackfleisch', units: ['g'], category: 'FLEISCH' },
    { name: 'Rinderfilet', units: ['g', 'Stück'], category: 'FLEISCH' },
    { name: 'Rinderhack', units: ['g'], category: 'FLEISCH' },
    { name: 'Schweinefilet', units: ['g', 'Stück'], category: 'FLEISCH' },
    { name: 'Schweinekotelett', units: ['Stück', 'g'], category: 'FLEISCH' },
    { name: 'Speck', units: ['g', 'Scheibe'], category: 'FLEISCH' },
    { name: 'Bacon', units: ['g', 'Scheibe', 'Streifen'], category: 'FLEISCH' },
    { name: 'Wurst', units: ['g', 'Scheibe', 'Stück'], category: 'FLEISCH' },
    { name: 'Salami', units: ['g', 'Scheibe'], category: 'FLEISCH' },
    { name: 'Schinken', units: ['g', 'Scheibe'], category: 'FLEISCH' },
    { name: 'Lammkeule', units: ['g', 'Stück'], category: 'FLEISCH' },
    { name: 'Putenbrustfilet', units: ['g', 'Stück'], category: 'FLEISCH' },
    { name: 'Chorizo', units: ['g', 'Stück', 'Scheibe'], category: 'FLEISCH' },

    // FISCH
    { name: 'Lachs', units: ['g', 'Stück', 'Filet'], category: 'FISCH' },
    { name: 'Thunfisch', units: ['Dose', 'g'], category: 'FISCH' },
    { name: 'Garnelen', units: ['g', 'Stück'], category: 'FISCH' },
    { name: 'Kabeljau', units: ['g', 'Filet'], category: 'FISCH' },
    { name: 'Forelle', units: ['Stück', 'g'], category: 'FISCH' },
    { name: 'Sardinen', units: ['Dose', 'g'], category: 'FISCH' },
    { name: 'Miesmuscheln', units: ['g', 'Stück'], category: 'FISCH' },
    { name: 'Calamari', units: ['g'], category: 'FISCH' },
    { name: 'Dorsch', units: ['g', 'Filet'], category: 'FISCH' },

    // MILCHPRODUKTE
    { name: 'Butter', units: ['g', 'EL', 'TL'], category: 'MILCHPRODUKTE' },
    { name: 'Milch', units: ['ml', 'l', 'EL'], category: 'MILCHPRODUKTE' },
    { name: 'Sahne', units: ['ml', 'g', 'EL'], category: 'MILCHPRODUKTE' },
    { name: 'Crème fraîche', units: ['g', 'EL'], category: 'MILCHPRODUKTE' },
    { name: 'Schmand', units: ['g', 'EL'], category: 'MILCHPRODUKTE' },
    { name: 'Joghurt', units: ['g', 'EL', 'Becher'], category: 'MILCHPRODUKTE' },
    { name: 'Quark', units: ['g', 'EL'], category: 'MILCHPRODUKTE' },
    { name: 'Frischkäse', units: ['g', 'EL'], category: 'MILCHPRODUKTE' },
    { name: 'Mozzarella', units: ['g', 'Kugel'], category: 'MILCHPRODUKTE' },
    { name: 'Parmesan', units: ['g', 'EL'], category: 'MILCHPRODUKTE' },
    { name: 'Feta', units: ['g'], category: 'MILCHPRODUKTE' },
    { name: 'Gouda', units: ['g', 'Scheibe'], category: 'MILCHPRODUKTE' },
    { name: 'Emmentaler', units: ['g', 'Scheibe'], category: 'MILCHPRODUKTE' },
    { name: 'Ricotta', units: ['g', 'EL'], category: 'MILCHPRODUKTE' },
    { name: 'Mascarpone', units: ['g', 'EL'], category: 'MILCHPRODUKTE' },
    { name: 'Ei', units: ['Stück'], category: 'MILCHPRODUKTE' },
    { name: 'Eigelb', units: ['Stück'], category: 'MILCHPRODUKTE' },
    { name: 'Eiweiß', units: ['Stück', 'g'], category: 'MILCHPRODUKTE' },
    { name: 'Schlagsahne', units: ['ml', 'g'], category: 'MILCHPRODUKTE' },
    { name: 'Kondensmilch', units: ['ml', 'g', 'Dose'], category: 'MILCHPRODUKTE' },

    // GEWÜRZE & KRÄUTER
    { name: 'Salz', units: ['TL', 'Prise', 'g'], category: 'GEWURZE' },
    { name: 'Pfeffer', units: ['TL', 'Prise', 'g'], category: 'GEWURZE' },
    { name: 'Paprikapulver', units: ['TL', 'EL', 'g'], category: 'GEWURZE' },
    { name: 'Kreuzkümmel', units: ['TL', 'g'], category: 'GEWURZE' },
    { name: 'Oregano', units: ['TL', 'EL', 'g'], category: 'GEWURZE' },
    { name: 'Basilikum', units: ['Blatt', 'g', 'Handvoll', 'TL'], category: 'GEWURZE' },
    { name: 'Thymian', units: ['TL', 'Zweig', 'g'], category: 'GEWURZE' },
    { name: 'Rosmarin', units: ['Zweig', 'TL', 'g'], category: 'GEWURZE' },
    { name: 'Petersilie', units: ['Bund', 'EL', 'g', 'Handvoll'], category: 'GEWURZE' },
    { name: 'Schnittlauch', units: ['EL', 'Bund', 'g'], category: 'GEWURZE' },
    { name: 'Koriander', units: ['TL', 'g', 'Handvoll'], category: 'GEWURZE' },
    { name: 'Kurkuma', units: ['TL', 'g'], category: 'GEWURZE' },
    { name: 'Zimt', units: ['TL', 'g', 'Stange'], category: 'GEWURZE' },
    { name: 'Muskatnuss', units: ['Prise', 'TL'], category: 'GEWURZE' },
    { name: 'Lorbeerblatt', units: ['Stück', 'Blatt'], category: 'GEWURZE' },
    { name: 'Curry', units: ['TL', 'EL', 'g'], category: 'GEWURZE' },
    { name: 'Chili-Flocken', units: ['TL', 'Prise'], category: 'GEWURZE' },
    { name: 'Senfkörner', units: ['TL', 'g'], category: 'GEWURZE' },
    { name: 'Kardamom', units: ['TL', 'Prise', 'Kapsel'], category: 'GEWURZE' },
    { name: 'Kümmel', units: ['TL', 'g'], category: 'GEWURZE' },
    { name: 'Anis', units: ['TL', 'g'], category: 'GEWURZE' },
    { name: 'Nelken', units: ['Stück', 'TL', 'g'], category: 'GEWURZE' },
    { name: 'Dill', units: ['Bund', 'TL', 'g'], category: 'GEWURZE' },
    { name: 'Majoran', units: ['TL', 'g'], category: 'GEWURZE' },
    { name: 'Minze', units: ['Blatt', 'Zweig', 'g', 'Handvoll'], category: 'GEWURZE' },
    { name: 'Safran', units: ['Prise', 'g'], category: 'GEWURZE' },

    // BACKEN & TROCKENWAREN
    { name: 'Mehl', units: ['g', 'EL', 'TL'], category: 'BACKEN' },
    { name: 'Zucker', units: ['g', 'EL', 'TL'], category: 'BACKEN' },
    { name: 'Brauner Zucker', units: ['g', 'EL', 'TL'], category: 'BACKEN' },
    { name: 'Puderzucker', units: ['g', 'EL'], category: 'BACKEN' },
    { name: 'Backpulver', units: ['TL', 'Päckchen', 'g'], category: 'BACKEN' },
    { name: 'Natron', units: ['TL', 'g'], category: 'BACKEN' },
    { name: 'Hefe', units: ['g', 'Würfel', 'Päckchen'], category: 'BACKEN' },
    { name: 'Stärke', units: ['EL', 'TL', 'g'], category: 'BACKEN' },
    { name: 'Paniermehl', units: ['g', 'EL'], category: 'BACKEN' },
    { name: 'Haferflocken', units: ['g', 'EL'], category: 'BACKEN' },
    { name: 'Mandeln', units: ['g', 'EL', 'Stück'], category: 'BACKEN' },
    { name: 'Walnüsse', units: ['g', 'EL', 'Stück'], category: 'BACKEN' },
    { name: 'Cashews', units: ['g', 'EL'], category: 'BACKEN' },
    { name: 'Pinienkerne', units: ['g', 'EL'], category: 'BACKEN' },
    { name: 'Sesam', units: ['EL', 'TL', 'g'], category: 'BACKEN' },
    { name: 'Rosinen', units: ['g', 'EL'], category: 'BACKEN' },
    { name: 'Dunkle Schokolade', units: ['g', 'Stück'], category: 'BACKEN' },
    { name: 'Kakaopulver', units: ['EL', 'TL', 'g'], category: 'BACKEN' },
    { name: 'Vanilleextrakt', units: ['TL', 'ml'], category: 'BACKEN' },
    { name: 'Vanillezucker', units: ['Päckchen', 'EL', 'g'], category: 'BACKEN' },
    { name: 'Kokosnussraspeln', units: ['g', 'EL'], category: 'BACKEN' },
    { name: 'Leinsamen', units: ['EL', 'g'], category: 'BACKEN' },
    { name: 'Chiasamen', units: ['EL', 'g'], category: 'BACKEN' },

    // SONSTIGES (Öle, Saucen, Hülsenfrüchte, Pasta, Reis etc.)
    { name: 'Olivenöl', units: ['EL', 'ml', 'TL'], category: 'SONSTIGES' },
    { name: 'Sonnenblumenöl', units: ['EL', 'ml'], category: 'SONSTIGES' },
    { name: 'Rapsöl', units: ['EL', 'ml'], category: 'SONSTIGES' },
    { name: 'Kokosöl', units: ['EL', 'g', 'TL'], category: 'SONSTIGES' },
    { name: 'Sesamöl', units: ['EL', 'TL', 'ml'], category: 'SONSTIGES' },
    { name: 'Essig', units: ['EL', 'ml', 'TL'], category: 'SONSTIGES' },
    { name: 'Balsamico', units: ['EL', 'ml', 'TL'], category: 'SONSTIGES' },
    { name: 'Sojasauce', units: ['EL', 'ml', 'TL'], category: 'SONSTIGES' },
    { name: 'Tomatenmark', units: ['EL', 'g', 'TL'], category: 'SONSTIGES' },
    { name: 'Tomaten (Dose)', units: ['Dose', 'g', 'ml'], category: 'SONSTIGES' },
    { name: 'Kokosmilch', units: ['ml', 'Dose', 'EL'], category: 'SONSTIGES' },
    { name: 'Brühe', units: ['ml', 'l', 'EL'], category: 'SONSTIGES' },
    { name: 'Gemüsebrühe', units: ['ml', 'l', 'EL'], category: 'SONSTIGES' },
    { name: 'Hühnerbrühe', units: ['ml', 'l'], category: 'SONSTIGES' },
    { name: 'Rinderbrühe', units: ['ml', 'l'], category: 'SONSTIGES' },
    { name: 'Senf', units: ['EL', 'TL', 'g'], category: 'SONSTIGES' },
    { name: 'Mayonnaise', units: ['EL', 'g', 'TL'], category: 'SONSTIGES' },
    { name: 'Honig', units: ['EL', 'TL', 'g'], category: 'SONSTIGES' },
    { name: 'Ahornsirup', units: ['EL', 'ml', 'TL'], category: 'SONSTIGES' },
    { name: 'Worcestersauce', units: ['EL', 'TL', 'ml'], category: 'SONSTIGES' },
    { name: 'Tabasco', units: ['Tropfen', 'TL', 'ml'], category: 'SONSTIGES' },
    { name: 'Pasta (Spaghetti)', units: ['g'], category: 'SONSTIGES' },
    { name: 'Pasta (Penne)', units: ['g'], category: 'SONSTIGES' },
    { name: 'Pasta (Tagliatelle)', units: ['g'], category: 'SONSTIGES' },
    { name: 'Pasta (Rigatoni)', units: ['g'], category: 'SONSTIGES' },
    { name: 'Nudeln', units: ['g'], category: 'SONSTIGES' },
    { name: 'Reis', units: ['g', 'Tasse'], category: 'SONSTIGES' },
    { name: 'Basmatireis', units: ['g', 'Tasse'], category: 'SONSTIGES' },
    { name: 'Risottoreis', units: ['g'], category: 'SONSTIGES' },
    { name: 'Couscous', units: ['g', 'Tasse'], category: 'SONSTIGES' },
    { name: 'Quinoa', units: ['g', 'Tasse'], category: 'SONSTIGES' },
    { name: 'Linsen', units: ['g', 'Tasse'], category: 'SONSTIGES' },
    { name: 'Kichererbsen', units: ['g', 'Dose', 'Tasse'], category: 'SONSTIGES' },
    { name: 'Bohnen (Weiß)', units: ['g', 'Dose'], category: 'SONSTIGES' },
    { name: 'Bohnen (Kidney)', units: ['g', 'Dose'], category: 'SONSTIGES' },
    { name: 'Tofu', units: ['g', 'Block'], category: 'SONSTIGES' },
    { name: 'Tempeh', units: ['g'], category: 'SONSTIGES' },
    { name: 'Brot', units: ['Scheibe', 'g'], category: 'SONSTIGES' },
    { name: 'Toast', units: ['Scheibe', 'Stück'], category: 'SONSTIGES' },
    { name: 'Weißwein', units: ['ml', 'EL'], category: 'SONSTIGES' },
    { name: 'Rotwein', units: ['ml', 'EL'], category: 'SONSTIGES' },
    { name: 'Wasser', units: ['ml', 'l', 'EL'], category: 'SONSTIGES' },

    // GETRÄNKE
    { name: 'Zitronensaft', units: ['EL', 'ml', 'TL'], category: 'GETRAENKE' },
    { name: 'Orangensaft', units: ['ml', 'EL'], category: 'GETRAENKE' },
    { name: 'Apfelsaft', units: ['ml', 'EL'], category: 'GETRAENKE' },
    { name: 'Milch (pflanzlich)', units: ['ml', 'EL'], category: 'GETRAENKE' },
    { name: 'Hafermilch', units: ['ml', 'EL'], category: 'GETRAENKE' },
    { name: 'Mandelmilch', units: ['ml'], category: 'GETRAENKE' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Slash name expansion
// ─────────────────────────────────────────────────────────────────────────────

const MEAT_PREFIXES = new Set([
    'schwein',
    'rind',
    'kalb',
    'lamm',
    'schaf',
    'hammel',
    'wild',
    'ziege',
    'hirsch',
    'kaninchen',
    'hase',
    'pferd',
]);

/**
 * Expand "/" in BLS names as a multiplier.
 * "Butterkekse/Butterplätzchen (Mürbeteig)" →
 *   displayName: "Butterkekse (Mürbeteig)"
 *   aliases:     ["Butterplätzchen (Mürbeteig)"]
 *
 * The "/" replaces one word-group; the suffix (parentheses, qualifiers) applies to all alternatives.
 * Skips splitting when "/" is inside parentheses, after prepositions, or after hyphens.
 */
function _expandSlashName(name: string): { displayName: string; aliases: string[] } {
    if (!name.includes('/')) return { displayName: name, aliases: [] };

    // Skip "/" inside parentheses
    let depth = 0;
    let hasOuterSlash = false;
    for (const ch of name) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === '/' && depth === 0) {
            hasOuterSlash = true;
            break;
        }
    }
    if (!hasOuterSlash) return { displayName: name, aliases: [] };

    // Skip preposition/hyphen context (e.g., "für Gebäck/Torten", "Fleisch-/Wurst")
    const slashIdx = name.indexOf('/');
    const before = name.slice(0, slashIdx);
    if (/\b(für|mit|und|oder|im|vom|nach|zum)\s+\S*$/.test(before) || before.endsWith('-')) {
        return { displayName: name, aliases: [] };
    }

    // Split at "/" outside parentheses
    const parts: string[] = [];
    const current: string[] = [];
    depth = 0;
    for (const ch of name) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === '/' && depth === 0) {
            parts.push(current.join('').trim());
            current.length = 0;
            continue;
        }
        current.push(ch);
    }
    parts.push(current.join('').trim());
    if (parts.length < 2) return { displayName: name, aliases: [] };

    const first = parts[0];
    const last = parts[parts.length - 1];
    const middle = parts.slice(1, -1);

    // Prefix: only for meat categories ("Schwein Speck/Rückenspeck")
    const firstWords = first.split(/\s+/);
    let prefix = '';
    let firstAlt = first;
    if (firstWords.length > 1 && MEAT_PREFIXES.has(firstWords[0].toLowerCase())) {
        prefix = firstWords[0];
        firstAlt = firstWords.slice(1).join(' ');
    }

    // Suffix: everything after the first word-group in the last part
    const lastMatch = /^(\S+(?:\s+[A-ZÄÖÜ]\S*)*)(.*)/.exec(last);
    const lastAlt = lastMatch ? lastMatch[1] : last;
    const suffix = (lastMatch ? lastMatch[2] : '').trim();

    const allAlts = [firstAlt, ...middle, lastAlt];

    const build = (alt: string) => {
        const r = prefix ? `${prefix} ${alt}` : alt;
        return suffix ? `${r} ${suffix}`.trim() : r.trim();
    };

    return {
        displayName: build(allAlts[0]),
        aliases: allAlts.slice(1).map(build),
    };
}

// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱 Seeding basics...\n');

    // ── System user ───────────────────────────────────────────────────────────
    const systemUser = await prisma.user.upsert({
        where: { email: 'system@kitchenpace.internal' },
        update: {},
        create: {
            email: 'system@kitchenpace.internal',
            name: 'KüchenTakt',
            role: 'admin',
            emailVerified: true,
            profile: { create: { nickname: 'KüchenTakt', slug: 'kuechentakt' } },
        },
    });
    console.log(`✅ System user: ${systemUser.email}`);

    // ── Admin user ────────────────────────────────────────────────────────────
    const adminUser = await prisma.user.upsert({
        where: { email: 'info@isntfunny.de' },
        update: {
            role: 'admin',
            emailVerified: true,
        },
        create: {
            email: 'info@isntfunny.de',
            name: 'Admin',
            role: 'admin',
            emailVerified: true,
            profile: { create: { nickname: 'Admin', slug: 'admin' } },
        },
    });
    // Create credential account for admin (password: voll1111)
    const adminPassword = await hashPassword('voll1111');
    await prisma.account.upsert({
        where: { id: `credential_${adminUser.id}` },
        update: { password: adminPassword },
        create: {
            id: `credential_${adminUser.id}`,
            userId: adminUser.id,
            accountId: adminUser.id,
            providerId: 'credential',
            password: adminPassword,
        },
    });
    console.log(`✅ Admin user:  ${adminUser.email} (role: ${adminUser.role})`);

    // ── Categories ────────────────────────────────────────────────────────────
    let catCount = 0;
    for (const cat of CATEGORIES) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {
                name: cat.name,
                color: cat.color,
                icon: cat.icon,
                sortOrder: cat.sortOrder,
                description: cat.description,
            },
            create: {
                name: cat.name,
                slug: cat.slug,
                color: cat.color,
                icon: cat.icon,
                sortOrder: cat.sortOrder,
                description: cat.description,
            },
        });
        catCount++;
    }
    console.log(`✅ Categories:  ${catCount} upserted`);

    // ── Tags ──────────────────────────────────────────────────────────────────
    let tagCount = 0;
    for (const tagName of TAGS) {
        const slug = slugify(tagName);
        await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName, slug },
        });
        tagCount++;
    }
    console.log(`✅ Tags:        ${tagCount} upserted`);

    // ── Ingredient Categories (extracted from Swiss Food DB) ───────────────────
    const { UNITS, DEFAULT_UNITS_PER_CATEGORY, INGREDIENT_UNIT_GRAMS } =
        await import('./ingredients/constants');

    interface SwissFood {
        id: number;
        name: string;
        swissName?: string;
        synonyms: string[];
        category: string;
        density: number | null;
        nutrients: Record<string, number>;
    }

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dir = path.dirname(fileURLToPath(import.meta.url));
    const swissFoodsPath = path.join(__dir, 'swiss-food-db', 'data', 'swiss-foods.json');
    const swissFoods: SwissFood[] = JSON.parse(fs.readFileSync(swissFoodsPath, 'utf-8'));

    // Extract category tree from food data: "Gemüse/Pilze" → parent "Gemüse", child "Pilze"
    // Some foods have multiple categories separated by ";"
    const categoryTree = new Map<string, Set<string>>(); // parent → Set<child>
    for (const food of swissFoods) {
        for (const part of food.category.split(';')) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            if (trimmed.includes('/')) {
                const [parent, child] = trimmed.split('/', 2).map((s) => s.trim());
                if (!categoryTree.has(parent)) categoryTree.set(parent, new Set());
                categoryTree.get(parent)!.add(child);
            } else {
                if (!categoryTree.has(trimmed)) categoryTree.set(trimmed, new Set());
            }
        }
    }

    // Create parent categories, then children
    const categoryMap = new Map<string, string>(); // "Parent" or "Parent/Child" → id
    let catSort = 0;
    for (const [parentName, children] of [...categoryTree.entries()].sort(([a], [b]) =>
        a.localeCompare(b),
    )) {
        const parent = await prisma.ingredientCategory.upsert({
            where: { slug: slugify(parentName) },
            update: { name: parentName, parentId: null },
            create: {
                name: parentName,
                slug: slugify(parentName),
                sortOrder: catSort++,
                parentId: null,
            },
        });
        categoryMap.set(parentName, parent.id);

        for (const childName of [...children].sort()) {
            const fullName = `${parentName}/${childName}`;
            const child = await prisma.ingredientCategory.upsert({
                where: { slug: slugify(fullName) },
                update: { name: childName, parentId: parent.id },
                create: {
                    name: childName,
                    slug: slugify(fullName),
                    sortOrder: catSort++,
                    parentId: parent.id,
                },
            });
            categoryMap.set(fullName, child.id);
        }
    }
    console.log(
        `✅ IngredientCategories: ${categoryMap.size} (${categoryTree.size} parents + ${categoryMap.size - categoryTree.size} children)`,
    );

    // ── Units ────────────────────────────────────────────────────────────────
    const unitMap = new Map<string, string>(); // shortName → id
    for (const u of UNITS) {
        const unit = await prisma.unit.upsert({
            where: { shortName: u.shortName },
            update: { longName: u.longName, gramsDefault: u.gramsDefault },
            create: { shortName: u.shortName, longName: u.longName, gramsDefault: u.gramsDefault },
        });
        unitMap.set(u.shortName, unit.id);
    }
    console.log(`✅ Units: ${unitMap.size} upserted`);

    // ── Ingredients (Swiss Food Composition Database) ─────────────────────────
    // Clear old ingredients to avoid swissFoodId conflicts from renamed entries
    await prisma.ingredientUnit.deleteMany();
    await prisma.recipeIngredient.deleteMany();
    await prisma.$executeRawUnsafe(`DELETE FROM "_IngredientToIngredientCategory"`);
    await prisma.ingredient.deleteMany();

    const slugifyIngredient = (name: string) => slugify(name).slice(0, 80);

    let ingCount = 0;
    const seenSlugs = new Set<string>();

    for (const food of swissFoods) {
        const slug = slugifyIngredient(food.name);
        if (!slug || seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        // Link to all matching categories (a food can have multiple via ";")
        const catIds: string[] = [];
        let topLevelCat = '';
        for (const part of food.category.split(';')) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            // Try exact match first (e.g. "Gemüse/Pilze"), then parent only (e.g. "Gemüse")
            const exactId = categoryMap.get(trimmed);
            if (exactId) catIds.push(exactId);
            const parentName = trimmed.split('/')[0].trim();
            const parentId = categoryMap.get(parentName);
            if (parentId && !catIds.includes(parentId)) catIds.push(parentId);
            if (!topLevelCat) topLevelCat = parentName;
        }
        const n = food.nutrients;

        // Resolve default units per top-level category
        const unitShortNames = new Set<string>();
        unitShortNames.add('g');
        for (const u of DEFAULT_UNITS_PER_CATEGORY[topLevelCat] ?? []) {
            unitShortNames.add(u);
        }
        // Add specific unit overrides
        const overrides = INGREDIENT_UNIT_GRAMS[slug];
        if (overrides) {
            for (const unitName of Object.keys(overrides)) {
                unitShortNames.add(unitName);
            }
        }

        const ingredient = await prisma.ingredient.upsert({
            where: { slug },
            update: {
                name: food.name,
                swissFoodId: food.id,
                energyKj: n.energyKj ?? null,
                energyKcal: n.energyKcal ?? null,
                fat: n.fat ?? null,
                saturatedFat: n.saturatedFat ?? null,
                monoUnsaturatedFat: n.monoUnsaturatedFat ?? null,
                polyUnsaturatedFat: n.polyUnsaturatedFat ?? null,
                linoleicAcid: n.linoleicAcid ?? null,
                alphaLinolenicAcid: n.alphaLinolenicAcid ?? null,
                epa: n.epa ?? null,
                dha: n.dha ?? null,
                cholesterol: n.cholesterol ?? null,
                carbs: n.carbs ?? null,
                sugar: n.sugar ?? null,
                starch: n.starch ?? null,
                fiber: n.fiber ?? null,
                protein: n.protein ?? null,
                salt: n.salt ?? null,
                alcohol: n.alcohol ?? null,
                water: n.water ?? null,
                sodium: n.sodium ?? null,
                vitaminA_RE: n.vitaminA_RE ?? null,
                vitaminA_RAE: n.vitaminA_RAE ?? null,
                retinol: n.retinol ?? null,
                betaCaroteneActivity: n.betaCaroteneActivity ?? null,
                betaCarotene: n.betaCarotene ?? null,
                vitaminB1: n.vitaminB1 ?? null,
                vitaminB2: n.vitaminB2 ?? null,
                vitaminB6: n.vitaminB6 ?? null,
                vitaminB12: n.vitaminB12 ?? null,
                niacin: n.niacin ?? null,
                folate: n.folate ?? null,
                pantothenicAcid: n.pantothenicAcid ?? null,
                vitaminC: n.vitaminC ?? null,
                vitaminD: n.vitaminD ?? null,
                vitaminE: n.vitaminE ?? null,
                potassium: n.potassium ?? null,
                chloride: n.chloride ?? null,
                calcium: n.calcium ?? null,
                magnesium: n.magnesium ?? null,
                phosphorus: n.phosphorus ?? null,
                iron: n.iron ?? null,
                iodine: n.iodine ?? null,
                zinc: n.zinc ?? null,
                selenium: n.selenium ?? null,
                aliases: food.synonyms,
                categories: { set: catIds.map((id) => ({ id })) },
            },
            create: {
                name: food.name,
                slug,
                swissFoodId: food.id,
                aliases: food.synonyms,
                energyKj: n.energyKj ?? null,
                energyKcal: n.energyKcal ?? null,
                fat: n.fat ?? null,
                saturatedFat: n.saturatedFat ?? null,
                monoUnsaturatedFat: n.monoUnsaturatedFat ?? null,
                polyUnsaturatedFat: n.polyUnsaturatedFat ?? null,
                linoleicAcid: n.linoleicAcid ?? null,
                alphaLinolenicAcid: n.alphaLinolenicAcid ?? null,
                epa: n.epa ?? null,
                dha: n.dha ?? null,
                cholesterol: n.cholesterol ?? null,
                carbs: n.carbs ?? null,
                sugar: n.sugar ?? null,
                starch: n.starch ?? null,
                fiber: n.fiber ?? null,
                protein: n.protein ?? null,
                salt: n.salt ?? null,
                alcohol: n.alcohol ?? null,
                water: n.water ?? null,
                sodium: n.sodium ?? null,
                vitaminA_RE: n.vitaminA_RE ?? null,
                vitaminA_RAE: n.vitaminA_RAE ?? null,
                retinol: n.retinol ?? null,
                betaCaroteneActivity: n.betaCaroteneActivity ?? null,
                betaCarotene: n.betaCarotene ?? null,
                vitaminB1: n.vitaminB1 ?? null,
                vitaminB2: n.vitaminB2 ?? null,
                vitaminB6: n.vitaminB6 ?? null,
                vitaminB12: n.vitaminB12 ?? null,
                niacin: n.niacin ?? null,
                folate: n.folate ?? null,
                pantothenicAcid: n.pantothenicAcid ?? null,
                vitaminC: n.vitaminC ?? null,
                vitaminD: n.vitaminD ?? null,
                vitaminE: n.vitaminE ?? null,
                potassium: n.potassium ?? null,
                chloride: n.chloride ?? null,
                calcium: n.calcium ?? null,
                magnesium: n.magnesium ?? null,
                phosphorus: n.phosphorus ?? null,
                iron: n.iron ?? null,
                iodine: n.iodine ?? null,
                zinc: n.zinc ?? null,
                selenium: n.selenium ?? null,
                categories: { connect: catIds.map((id) => ({ id })) },
            },
        });

        // Link units (upsert via deleteMany + createMany for idempotency)
        const unitData = [...unitShortNames]
            .map((sn) => {
                const unitId = unitMap.get(sn);
                if (!unitId) return null;
                const grams = overrides?.[sn] ?? null;
                return { ingredientId: ingredient.id, unitId, grams };
            })
            .filter((d): d is NonNullable<typeof d> => d !== null);

        if (unitData.length > 0) {
            await prisma.ingredientUnit.createMany({ data: unitData, skipDuplicates: true });
        }

        ingCount++;
        if (ingCount % 500 === 0) {
            console.log(`  ... ${ingCount} ingredients processed`);
        }
    }
    console.log(`✅ Ingredients: ${ingCount} upserted (Swiss Food DB)`);

    // ── Showcase recipe: Flammkuchen (used as tutorial redirect target) ──────
    // Look up existing ingredients by slug (these should already exist from BLS or legacy seed)
    const FLAMMKUCHEN_INGREDIENT_SLUGS = [
        { label: 'Mehl', slug: 'weizenmehl-backmehl-typ-550' },
        { label: 'Olivenöl', slug: 'olivenoel' },
        { label: 'Salz', slug: 'jodsalz' },
        { label: 'Crème fraîche', slug: 'creme-fraiche' },
        { label: 'Milch', slug: 'vollmilch-pasteurisiert' },
        { label: 'Speck', slug: 'speck-durchwachsen' },
        { label: 'Zwiebel', slug: 'zwiebel-roh' },
        { label: 'Apfel', slug: 'apfel-roh' },
        { label: 'Zitronensaft', slug: 'zitronensaft' },
        { label: 'Zimtzucker', slug: 'zucker-weiss' },
        { label: 'Mandelblättchen', slug: 'mandel' },
    ] as const;

    const fkIngMap = new Map<string, { id: string; name: string }>(); // slug → { id, name }
    for (const ing of FLAMMKUCHEN_INGREDIENT_SLUGS) {
        const found = await prisma.ingredient.findUnique({
            where: { slug: ing.slug },
            select: { id: true, name: true },
        });
        if (found) {
            fkIngMap.set(ing.slug, found);
        } else {
            console.warn(`  ⚠ Ingredient not found: ${ing.label} (${ing.slug}) — skipping`);
        }
    }

    const fkId = (slug: string) => fkIngMap.get(slug)?.id;
    const fkMention = (label: string, slug: string) => {
        const id = fkId(slug);
        return id ? `@[${label}](${id})` : label;
    };

    const hauptgerichtCat = await prisma.category.findUnique({ where: { slug: 'hauptgericht' } });

    // Shorthand aliases for readable node definitions
    const mehl = 'weizenmehl-backmehl-typ-550';
    const oel = 'olivenoel';
    const salz = 'jodsalz';
    const creme = 'creme-fraiche';
    const milch = 'vollmilch-pasteurisiert';
    const speck = 'speck-durchwachsen';
    const zwiebel = 'zwiebel-roh';
    const apfel = 'apfel-roh';
    const zitrone = 'zitronensaft';
    const zimt = 'zucker-weiss';
    const mandel = 'mandel';

    const ids = (slugs: string[]) => slugs.map(fkId).filter(Boolean) as string[];

    const flammkuchenFlowNodes = [
        {
            id: 'start',
            type: 'start',
            label: "Los geht's!",
            position: { x: 40, y: 145.25 },
            description: 'Bereite alle Zutaten für Teig und gewünschten Belag vor.',
            ingredientIds: [],
        },
        {
            id: 'step-1',
            type: 'mixen',
            label: 'Teig herstellen',
            duration: 10,
            position: { x: 360, y: 145.25 },
            description: `${fkMention('Mehl', mehl)}, Mineralwasser mit Kohlensäure, Öl und ${fkMention('Salz', salz)} zu einem glatten, nicht klebenden Teig verarbeiten. Falls nötig etwas mehr Wasser, Öl oder Mehl ergänzen.`,
            ingredientIds: ids([mehl, oel, salz]),
        },
        {
            id: 'step-2',
            type: 'warten',
            label: 'Teig kühlen',
            duration: 10,
            position: { x: 680, y: 145.25 },
            description:
                'Den Teig zu einer Kugel formen, in Frischhaltefolie wickeln und im Kühlschrank ruhen lassen.',
            ingredientIds: [],
        },
        {
            id: 'step-3',
            type: 'backen',
            label: 'Ofen vorheizen',
            duration: 10,
            position: { x: 1000, y: 54.75 },
            description: 'Den Backofen auf 220 °C Umluft oder 230 °C Ober-/Unterhitze vorheizen.',
            ingredientIds: [],
        },
        {
            id: 'step-4',
            type: 'mixen',
            label: 'Creme verrühren',
            duration: 3,
            position: { x: 1000, y: 235.75 },
            description: `${fkMention('Crème fraîche', creme)} oder Schmand mit ${fkMention('Milch', milch)} oder Sahne glatt verrühren und bis zur Verwendung kühl stellen.`,
            ingredientIds: ids([creme, milch]),
        },
        {
            id: 'step-5',
            type: 'anrichten',
            label: 'Teig ausrollen',
            duration: 7,
            position: { x: 1320, y: 145.25 },
            description:
                'Den gekühlten Teig 3 bis 5 mm dick auf Blechgröße ausrollen und auf ein gefettetes oder mit Backpapier belegtes Blech legen.',
            ingredientIds: [],
        },
        {
            id: 'step-6',
            type: 'anrichten',
            label: 'Creme aufstreichen',
            duration: 2,
            position: { x: 1640, y: 145.25 },
            description: 'Die vorbereitete Creme gleichmäßig auf dem ausgerollten Teig verteilen.',
            ingredientIds: ids([creme, milch]),
        },
        {
            id: 'step-7',
            type: 'schneiden',
            label: 'Herzhaften Belag schneiden',
            duration: 5,
            position: { x: 1960, y: 39.5 },
            description: `Die ${fkMention('Zwiebel', zwiebel)} würfeln oder in Halbringe schneiden. Den ${fkMention('Speck', speck)} in feine, gleich große Würfel schneiden, falls nötig.`,
            ingredientIds: ids([speck, zwiebel]),
        },
        {
            id: 'step-8',
            type: 'anrichten',
            label: 'Herzhaft belegen',
            duration: 2,
            position: { x: 2280, y: 39.5 },
            description: `${fkMention('Speck', speck)} und Zwiebeln gleichmäßig auf der Creme verteilen.`,
            ingredientIds: ids([speck, zwiebel]),
        },
        {
            id: 'step-9',
            type: 'schneiden',
            label: 'Süßen Belag vorbereiten',
            duration: 6,
            position: { x: 1960, y: 251 },
            description: `Die Äpfel schälen und in dünne Scheiben schneiden. Mit etwas ${fkMention('Zitronensaft', zitrone)} beträufeln.`,
            ingredientIds: ids([apfel, zitrone]),
        },
        {
            id: 'step-10',
            type: 'anrichten',
            label: 'Süß belegen',
            duration: 3,
            position: { x: 2280, y: 251 },
            description: `Die Apfelscheiben nebeneinander auf den Teig legen, mit ${fkMention('Mandelblättchen', mandel)} bestreuen und anschließend ${fkMention('Zimtzucker', zimt)} darüber streuen.`,
            ingredientIds: ids([apfel, zimt, mandel]),
        },
        {
            id: 'step-11',
            type: 'backen',
            label: 'Flammkuchen backen',
            duration: 15,
            position: { x: 2600, y: 145.25 },
            description:
                'Den belegten Flammkuchen im heißen Ofen 10 bis 15 Minuten backen, bis der Rand braun ist.',
            ingredientIds: [],
        },
        {
            id: 'step-12',
            type: 'anrichten',
            label: 'Flammkuchen teilen',
            duration: 2,
            position: { x: 2920, y: 145.25 },
            description: 'Den fertigen Flammkuchen aus dem Ofen nehmen und in Stücke teilen.',
            ingredientIds: [],
        },
        {
            id: 'servieren',
            type: 'servieren',
            label: 'Servieren',
            position: { x: 3240, y: 145.25 },
            description:
                'Den Flammkuchen warm servieren, nach Wunsch mit Federweißem, Weißwein oder Pils.',
            ingredientIds: [],
        },
    ];
    const flammkuchenFlowEdges = [
        { id: 'edge-1', source: 'start', target: 'step-1' },
        { id: 'edge-2', source: 'step-1', target: 'step-2' },
        { id: 'edge-3', source: 'step-2', target: 'step-4' },
        { id: 'edge-4', source: 'step-2', target: 'step-3' },
        { id: 'edge-5', source: 'step-3', target: 'step-5' },
        { id: 'edge-6', source: 'step-4', target: 'step-5' },
        { id: 'edge-7', source: 'step-5', target: 'step-6' },
        { id: 'edge-8', source: 'step-6', target: 'step-7' },
        { id: 'edge-9', source: 'step-6', target: 'step-9' },
        { id: 'edge-10', source: 'step-7', target: 'step-8' },
        { id: 'edge-11', source: 'step-8', target: 'step-11' },
        { id: 'edge-12', source: 'step-9', target: 'step-10' },
        { id: 'edge-13', source: 'step-10', target: 'step-11' },
        { id: 'edge-14', source: 'step-11', target: 'step-12' },
        { id: 'edge-15', source: 'step-12', target: 'servieren' },
    ];

    // Flammkuchen recipe ingredients with amounts (only those found in DB)
    const flammkuchenRecipeIngredients = [
        { slug: mehl, amount: '250', unit: 'g' },
        { slug: oel, amount: '2', unit: 'EL' },
        { slug: salz, amount: '1', unit: 'TL' },
        { slug: creme, amount: '200', unit: 'g' },
        { slug: milch, amount: '2', unit: 'EL' },
        { slug: speck, amount: '150', unit: 'g' },
        { slug: zwiebel, amount: '2', unit: 'Stk' },
        { slug: apfel, amount: '2', unit: 'Stk' },
        { slug: zitrone, amount: '1', unit: 'EL' },
        { slug: zimt, amount: '2', unit: 'EL' },
        { slug: mandel, amount: '30', unit: 'g' },
    ].filter((ing) => fkId(ing.slug)); // only include found ingredients

    const flammkuchen = await prisma.recipe.upsert({
        where: { slug: 'flammkuchen' },
        update: {
            flowNodes: flammkuchenFlowNodes as any,
            flowEdges: flammkuchenFlowEdges as any,
            authorId: systemUser.id,
            description:
                'Knuspriger Elsässer Flammkuchen mit Crème fraîche, Zwiebeln und Speck — ein Klassiker, der immer gelingt. Wahlweise herzhaft oder süß mit Äpfeln und Zimtzucker.',
        },
        create: {
            title: 'Flammkuchen',
            slug: 'flammkuchen',
            description:
                'Knuspriger Elsässer Flammkuchen mit Crème fraîche, Zwiebeln und Speck — ein Klassiker, der immer gelingt. Wahlweise herzhaft oder süß mit Äpfeln und Zimtzucker.',
            servings: 4,
            prepTime: 25,
            cookTime: 15,
            totalTime: 40,
            difficulty: 'EASY',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            rating: 4.7,
            ratingCount: 412,
            viewCount: 6800,
            cookCount: 1540,
            moderationStatus: 'AUTO_APPROVED',
            authorId: systemUser.id,
            flowNodes: flammkuchenFlowNodes as any,
            flowEdges: flammkuchenFlowEdges as any,
            ...(hauptgerichtCat
                ? { categories: { create: [{ categoryId: hauptgerichtCat.id }] } }
                : {}),
        },
    });

    // Link ingredients to recipe (only those found in DB)
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: flammkuchen.id } });
    if (flammkuchenRecipeIngredients.length > 0) {
        await prisma.recipeIngredient.createMany({
            data: flammkuchenRecipeIngredients.map((ing, index) => ({
                recipeId: flammkuchen.id,
                ingredientId: fkId(ing.slug)!,
                amount: ing.amount,
                unit: ing.unit,
                isOptional: false,
                position: index,
            })),
        });
    }
    console.log(
        `✅ Showcase recipe: Flammkuchen (14 nodes, ${flammkuchenRecipeIngredients.length} ingredients, ${fkIngMap.size}/${FLAMMKUCHEN_INGREDIENT_SLUGS.length} ingredients found)`,
    );

    console.log('\n🎉 Basics seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
