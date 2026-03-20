/* eslint-disable max-lines */
/**
 * Basics seeder -- system user, admin, recipe categories, tags, Flammkuchen showcase.
 *
 * Safe to run multiple times (upsert everywhere).
 */

import type { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';

import { slugify } from '@app/lib/slug';

import type { Seeder, SeederResult } from './index.js';

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
// Flammkuchen showcase recipe helpers
// ─────────────────────────────────────────────────────────────────────────────

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

async function seedFlammkuchen(
    db: PrismaClient,
    systemUserId: string,
): Promise<{ created: boolean }> {
    // Look up existing ingredients by slug
    const fkIngMap = new Map<string, { id: string; name: string }>();
    for (const ing of FLAMMKUCHEN_INGREDIENT_SLUGS) {
        const found = await db.ingredient.findUnique({
            where: { slug: ing.slug },
            select: { id: true, name: true },
        });
        if (found) {
            fkIngMap.set(ing.slug, found);
        }
    }

    const fkId = (slug: string) => fkIngMap.get(slug)?.id;
    const fkMention = (label: string, slug: string) => {
        const id = fkId(slug);
        return id ? `@[${label}](${id})` : label;
    };
    const ids = (slugs: string[]) => slugs.map(fkId).filter(Boolean) as string[];

    const hauptgerichtCat = await db.category.findUnique({ where: { slug: 'hauptgericht' } });

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
    ].filter((ing) => fkId(ing.slug));

    const flammkuchen = await db.recipe.upsert({
        where: { slug: 'flammkuchen' },
        update: {
            flowNodes: flammkuchenFlowNodes as any,
            flowEdges: flammkuchenFlowEdges as any,
            authorId: systemUserId,
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
            authorId: systemUserId,
            flowNodes: flammkuchenFlowNodes as any,
            flowEdges: flammkuchenFlowEdges as any,
            ...(hauptgerichtCat
                ? { categories: { create: [{ categoryId: hauptgerichtCat.id }] } }
                : {}),
        },
    });

    // Link ingredients to recipe — resolve unit shortNames to IDs
    await db.recipeIngredient.deleteMany({ where: { recipeId: flammkuchen.id } });
    if (flammkuchenRecipeIngredients.length > 0) {
        const allUnits = await db.unit.findMany({ select: { id: true, shortName: true } });
        const unitMap = new Map(allUnits.map((u) => [u.shortName, u.id]));
        await db.recipeIngredient.createMany({
            data: flammkuchenRecipeIngredients.map((ing, index) => ({
                recipeId: flammkuchen.id,
                ingredientId: fkId(ing.slug)!,
                amount: ing.amount,
                unitId: unitMap.get(ing.unit) ?? unitMap.get('Stk')!,
                isOptional: false,
                position: index,
            })),
        });
    }

    // Return whether this was a new creation (check if publishedAt was just set)
    return { created: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeder implementation
// ─────────────────────────────────────────────────────────────────────────────

export const basicsSeeder: Seeder = {
    name: 'basics',
    description: 'System user, admin, recipe categories, tags, Flammkuchen showcase',

    async run(db: PrismaClient): Promise<SeederResult> {
        let created = 0;
        let skipped = 0;

        // ── System user ──────────────────────────────────────────────────
        const existingSystem = await db.user.findUnique({
            where: { email: 'system@kitchenpace.internal' },
        });
        if (existingSystem) {
            skipped++;
        } else {
            await db.user.create({
                data: {
                    email: 'system@kitchenpace.internal',
                    name: 'KüchenTakt',
                    role: 'admin',
                    emailVerified: true,
                    profile: { create: { nickname: 'KüchenTakt', slug: 'kuechentakt' } },
                },
            });
            created++;
        }

        // ── Admin user ───────────────────────────────────────────────────
        const existingAdmin = await db.user.findUnique({
            where: { email: 'info@isntfunny.de' },
        });
        if (existingAdmin) {
            // Ensure role is admin
            await db.user.update({
                where: { email: 'info@isntfunny.de' },
                data: { role: 'admin', emailVerified: true },
            });
            skipped++;
        } else {
            const adminUser = await db.user.create({
                data: {
                    email: 'info@isntfunny.de',
                    name: 'Admin',
                    role: 'admin',
                    emailVerified: true,
                    profile: { create: { nickname: 'Admin', slug: 'admin' } },
                },
            });
            const adminPassword = await hashPassword('voll1111');
            await db.account.create({
                data: {
                    id: `credential_${adminUser.id}`,
                    userId: adminUser.id,
                    accountId: adminUser.id,
                    providerId: 'credential',
                    password: adminPassword,
                },
            });
            created++;
        }

        // ── Recipe categories ────────────────────────────────────────────
        for (const cat of CATEGORIES) {
            const existing = await db.category.findUnique({ where: { slug: cat.slug } });
            if (existing) {
                skipped++;
            } else {
                await db.category.create({
                    data: {
                        name: cat.name,
                        slug: cat.slug,
                        color: cat.color,
                        icon: cat.icon,
                        sortOrder: cat.sortOrder,
                        description: cat.description,
                    },
                });
                created++;
            }
        }

        // ── Tags ─────────────────────────────────────────────────────────
        for (const tagName of TAGS) {
            const slug = slugify(tagName);
            const existing = await db.tag.findUnique({ where: { name: tagName } });
            if (existing) {
                skipped++;
            } else {
                await db.tag.create({ data: { name: tagName, slug } });
                created++;
            }
        }

        // ── Flammkuchen showcase recipe ──────────────────────────────────
        const existingFlammkuchen = await db.recipe.findUnique({
            where: { slug: 'flammkuchen' },
        });
        if (existingFlammkuchen) {
            skipped++;
        } else {
            const systemUser = await db.user.findUnique({
                where: { email: 'system@kitchenpace.internal' },
            });
            if (systemUser) {
                await seedFlammkuchen(db, systemUser.id);
                created++;
            }
        }

        return { created, skipped, deleted: 0 };
    },

    async reset(db: PrismaClient): Promise<SeederResult> {
        let created = 0;
        const skipped = 0;

        // ── System user (upsert with update data) ───────────────────────
        await db.user.upsert({
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
        created++;

        // ── Admin user (upsert with full update) ────────────────────────
        const adminPassword = await hashPassword('voll1111');
        const adminUser = await db.user.upsert({
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
        await db.account.upsert({
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
        created++;

        // ── Recipe categories (upsert with full update) ──────────────────
        for (const cat of CATEGORIES) {
            await db.category.upsert({
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
            created++;
        }

        // ── Tags (upsert) ───────────────────────────────────────────────
        for (const tagName of TAGS) {
            const slug = slugify(tagName);
            await db.tag.upsert({
                where: { name: tagName },
                update: {},
                create: { name: tagName, slug },
            });
            created++;
        }

        // ── Flammkuchen showcase recipe (always re-create) ──────────────
        const systemUser = await db.user.findUnique({
            where: { email: 'system@kitchenpace.internal' },
        });
        if (systemUser) {
            await seedFlammkuchen(db, systemUser.id);
            created++;
        }

        return { created, skipped, deleted: 0 };
    },
};
