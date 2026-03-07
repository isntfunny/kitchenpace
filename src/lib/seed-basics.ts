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
import bcrypt from 'bcrypt';

import { prisma } from '../../shared/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
    { name: 'Hauptgericht', slug: 'hauptgericht', color: 'orange' as const, icon: 'utensils', sortOrder: 0, description: 'Herzhafte Hauptgerichte für jeden Tag — von schnellen Pfannengerichten bis hin zu aufwendigen Sonntagsbraten.' },
    { name: 'Vorspeise', slug: 'vorspeise', color: 'purple' as const, icon: 'soup', sortOrder: 1, description: 'Leichte Vorspeisen und Suppen, die Appetit auf mehr machen.' },
    { name: 'Beilage', slug: 'beilage', color: 'emerald' as const, icon: 'carrot', sortOrder: 2, description: 'Die perfekte Ergänzung zu jedem Hauptgericht — Kartoffeln, Gemüse, Reis und mehr.' },
    { name: 'Salat', slug: 'salat', color: 'emerald' as const, icon: 'leaf', sortOrder: 3, description: 'Frische Salate für jede Jahreszeit — knackig, bunt und voller Geschmack.' },
    { name: 'Backen', slug: 'backen', color: 'gold' as const, icon: 'cake-slice', sortOrder: 4, description: 'Kuchen, Brot, Gebäck und Torten — alles rund ums Backen.' },
    { name: 'Dessert', slug: 'dessert', color: 'pink' as const, icon: 'ice-cream-cone', sortOrder: 5, description: 'Süße Versuchungen zum krönenden Abschluss jeder Mahlzeit.' },
    { name: 'Frühstück', slug: 'fruehstueck', color: 'gold' as const, icon: 'egg-fried', sortOrder: 6, description: 'Energiegeladene Frühstücksideen für einen guten Start in den Tag.' },
    { name: 'Getränk', slug: 'getraenk', color: 'blue' as const, icon: 'glass-water', sortOrder: 7, description: 'Smoothies, Cocktails, Limonaden und heiße Getränke für jeden Anlass.' },
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
// Ingredients
// ─────────────────────────────────────────────────────────────────────────────

type SC = 'GEMUESE' | 'OBST' | 'FLEISCH' | 'FISCH' | 'MILCHPRODUKTE' | 'GEWURZE' | 'BACKEN' | 'GETRAENKE' | 'SONSTIGES';

interface IngredientDef {
    name: string;
    units: string[];
    category?: SC;
}

const INGREDIENTS: IngredientDef[] = [
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
            role: 'ADMIN',
            isActive: true,
            profile: { create: { email: 'system@kitchenpace.internal', nickname: 'KüchenTakt', slug: 'kuechentakt' } },
        },
    });
    console.log(`✅ System user: ${systemUser.email}`);

    // ── Admin user ────────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash('voll1111', 12);
    const adminUser = await prisma.user.upsert({
        where: { email: 'info@isntfunny.de' },
        update: {
            role: 'ADMIN',
            isActive: true,
        },
        create: {
            email: 'info@isntfunny.de',
            name: 'Admin',
            hashedPassword: adminHash,
            role: 'ADMIN',
            isActive: true,
            profile: { create: { email: 'info@isntfunny.de', nickname: 'Admin', slug: 'admin' } },
        },
    });
    console.log(`✅ Admin user:  ${adminUser.email} (role: ${adminUser.role})`);

    // ── Categories ────────────────────────────────────────────────────────────
    let catCount = 0;
    for (const cat of CATEGORIES) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: { name: cat.name, color: cat.color, icon: cat.icon, sortOrder: cat.sortOrder, description: cat.description },
            create: { name: cat.name, slug: cat.slug, color: cat.color, icon: cat.icon, sortOrder: cat.sortOrder, description: cat.description },
        });
        catCount++;
    }
    console.log(`✅ Categories:  ${catCount} upserted`);

    // ── Tags ──────────────────────────────────────────────────────────────────
    let tagCount = 0;
    for (const tagName of TAGS) {
        const slug = tagName
            .toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName, slug },
        });
        tagCount++;
    }
    console.log(`✅ Tags:        ${tagCount} upserted`);

    // ── Ingredients ───────────────────────────────────────────────────────────
    let ingCount = 0;
    for (const ing of INGREDIENTS) {
        const slug = ing.name
            .toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        await prisma.ingredient.upsert({
            where: { slug },
            update: { units: ing.units },
            create: { name: ing.name, slug, units: ing.units, category: ing.category ?? null },
        });
        ingCount++;
    }
    console.log(`✅ Ingredients: ${ingCount} upserted`);

    console.log('\n🎉 Basics seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
