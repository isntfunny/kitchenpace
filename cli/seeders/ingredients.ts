/**
 * Ingredients seeder -- Swiss Food Composition Database import.
 *
 * Creates ingredient categories, units, and ingredients from swiss-foods.json.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import type { PrismaClient } from '@prisma/client';

import {
    DEFAULT_UNITS_PER_CATEGORY,
    INGREDIENT_UNIT_GRAMS,
    UNITS,
} from '@app/lib/ingredients/constants';
import { slugify } from '@app/lib/slug';

import type { Seeder, SeederResult } from './index.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const SWISS_FOODS_PATH = join(
    __dir,
    '..',
    '..',
    'src',
    'lib',
    'swiss-food-db',
    'data',
    'swiss-foods.json',
);

interface SwissFood {
    id: number;
    name: string;
    swissName?: string;
    synonyms: string[];
    category: string;
    density: number | null;
    nutrients: Record<string, number>;
}

const NUTRIENT_KEYS = [
    'energyKj',
    'energyKcal',
    'fat',
    'saturatedFat',
    'monoUnsaturatedFat',
    'polyUnsaturatedFat',
    'linoleicAcid',
    'alphaLinolenicAcid',
    'epa',
    'dha',
    'cholesterol',
    'carbs',
    'sugar',
    'starch',
    'fiber',
    'protein',
    'salt',
    'alcohol',
    'water',
    'sodium',
    'vitaminA_RE',
    'vitaminA_RAE',
    'retinol',
    'betaCaroteneActivity',
    'betaCarotene',
    'vitaminB1',
    'vitaminB2',
    'vitaminB6',
    'vitaminB12',
    'niacin',
    'folate',
    'pantothenicAcid',
    'vitaminC',
    'vitaminD',
    'vitaminE',
    'potassium',
    'chloride',
    'calcium',
    'magnesium',
    'phosphorus',
    'iron',
    'iodine',
    'zinc',
    'selenium',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractCategoryTree(foods: SwissFood[]): Map<string, Set<string>> {
    const tree = new Map<string, Set<string>>();
    for (const food of foods) {
        for (const part of food.category.split(';')) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            if (trimmed.includes('/')) {
                const [parent, child] = trimmed.split('/', 2).map((s) => s.trim());
                if (!tree.has(parent)) tree.set(parent, new Set());
                tree.get(parent)!.add(child);
            } else {
                if (!tree.has(trimmed)) tree.set(trimmed, new Set());
            }
        }
    }
    return tree;
}

function loadFoods(): SwissFood[] {
    return JSON.parse(readFileSync(SWISS_FOODS_PATH, 'utf-8'));
}

const slugifyIng = (name: string) => slugify(name).slice(0, 80);

// ─────────────────────────────────────────────────────────────────────────────
// Shared: create categories from food data
// ─────────────────────────────────────────────────────────────────────────────

async function seedCategories(
    db: PrismaClient,
    foods: SwissFood[],
    mode: 'safe' | 'force',
): Promise<{ categoryMap: Map<string, string>; created: number; skipped: number }> {
    const categoryTree = extractCategoryTree(foods);
    const categoryMap = new Map<string, string>();
    let created = 0;
    let skipped = 0;
    let sortOrder = 0;

    for (const [parentName, children] of [...categoryTree.entries()].sort(([a], [b]) =>
        a.localeCompare(b),
    )) {
        const parentSlug = slugify(parentName);

        if (mode === 'force') {
            const parent = await db.ingredientCategory.upsert({
                where: { slug: parentSlug },
                update: { name: parentName, parentId: null },
                create: {
                    name: parentName,
                    slug: parentSlug,
                    sortOrder: sortOrder++,
                    parentId: null,
                },
            });
            categoryMap.set(parentName, parent.id);
            created++;
        } else {
            const existing = await db.ingredientCategory.findUnique({
                where: { slug: parentSlug },
            });
            if (existing) {
                categoryMap.set(parentName, existing.id);
                skipped++;
            } else {
                const cat = await db.ingredientCategory.create({
                    data: {
                        name: parentName,
                        slug: parentSlug,
                        sortOrder: sortOrder++,
                        parentId: null,
                    },
                });
                categoryMap.set(parentName, cat.id);
                created++;
            }
        }

        const parentId = categoryMap.get(parentName)!;
        for (const childName of [...children].sort()) {
            const childSlug = slugify(`${parentName}/${childName}`);

            if (mode === 'force') {
                const child = await db.ingredientCategory.upsert({
                    where: { slug: childSlug },
                    update: { name: childName, parentId },
                    create: { name: childName, slug: childSlug, sortOrder: sortOrder++, parentId },
                });
                categoryMap.set(`${parentName}/${childName}`, child.id);
                created++;
            } else {
                const existingChild = await db.ingredientCategory.findUnique({
                    where: { slug: childSlug },
                });
                if (existingChild) {
                    categoryMap.set(`${parentName}/${childName}`, existingChild.id);
                    skipped++;
                } else {
                    const child = await db.ingredientCategory.create({
                        data: {
                            name: childName,
                            slug: childSlug,
                            sortOrder: sortOrder++,
                            parentId,
                        },
                    });
                    categoryMap.set(`${parentName}/${childName}`, child.id);
                    created++;
                }
            }
        }
    }

    return { categoryMap, created, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: create units
// ─────────────────────────────────────────────────────────────────────────────

async function seedUnits(
    db: PrismaClient,
    mode: 'safe' | 'force',
): Promise<{ unitMap: Map<string, string>; created: number; skipped: number }> {
    const unitMap = new Map<string, string>();
    let created = 0;
    let skipped = 0;

    for (const u of UNITS) {
        if (mode === 'force') {
            const unit = await db.unit.upsert({
                where: { shortName: u.shortName },
                update: { longName: u.longName, gramsDefault: u.gramsDefault },
                create: {
                    shortName: u.shortName,
                    longName: u.longName,
                    gramsDefault: u.gramsDefault,
                },
            });
            unitMap.set(u.shortName, unit.id);
            created++;
        } else {
            const existing = await db.unit.findUnique({ where: { shortName: u.shortName } });
            if (existing) {
                unitMap.set(u.shortName, existing.id);
                skipped++;
            } else {
                const unit = await db.unit.create({ data: u });
                unitMap.set(u.shortName, unit.id);
                created++;
            }
        }
    }

    return { unitMap, created, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: create ingredients
// ─────────────────────────────────────────────────────────────────────────────

async function seedIngredientRecords(
    db: PrismaClient,
    foods: SwissFood[],
    categoryMap: Map<string, string>,
    unitMap: Map<string, string>,
): Promise<{ created: number; skipped: number }> {
    // Deduplicate by slug
    const seenSlugs = new Set<string>();
    const ingredientData: Array<{
        slug: string;
        food: SwissFood;
        topLevelCat: string;
        catIds: string[];
    }> = [];
    for (const food of foods) {
        const slug = slugifyIng(food.name);
        if (!slug || seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        const catIds: string[] = [];
        let topLevelCat = '';
        for (const part of food.category.split(';')) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            const exactId = categoryMap.get(trimmed);
            if (exactId) catIds.push(exactId);
            const parentName = trimmed.split('/')[0].trim();
            const parentId = categoryMap.get(parentName);
            if (parentId && !catIds.includes(parentId)) catIds.push(parentId);
            if (!topLevelCat) topLevelCat = parentName;
        }
        ingredientData.push({ slug, food, topLevelCat, catIds });
    }

    // Batch lookup existing slugs
    const allSlugs = ingredientData.map((d) => d.slug);
    const existingIngredients = await db.ingredient.findMany({
        where: { slug: { in: allSlugs } },
        select: { slug: true },
    });
    const existingSlugs = new Set(existingIngredients.map((i) => i.slug));

    let created = 0;
    const skipped = existingSlugs.size;

    for (const item of ingredientData) {
        if (existingSlugs.has(item.slug)) continue;

        const n = item.food.nutrients;
        const nutrientData: Record<string, number | null> = {};
        for (const key of NUTRIENT_KEYS) {
            nutrientData[key] = n[key] ?? null;
        }

        const ingredient = await db.ingredient.create({
            data: {
                name: item.food.name,
                slug: item.slug,
                aliases: item.food.synonyms,
                needsReview: false,
                swissFoodId: item.food.id,
                ...nutrientData,
                categories:
                    item.catIds.length > 0
                        ? { connect: item.catIds.map((id) => ({ id })) }
                        : undefined,
            },
        });

        // Link units
        const defaultUnits = DEFAULT_UNITS_PER_CATEGORY[item.topLevelCat] ?? ['g'];
        const overrides = INGREDIENT_UNIT_GRAMS[item.slug];
        const unitShortNames = new Set([
            ...defaultUnits,
            ...(overrides ? Object.keys(overrides) : []),
            'g',
        ]);
        const unitData = [...unitShortNames]
            .map((sn) => {
                const unitId = unitMap.get(sn);
                if (!unitId) return null;
                return { ingredientId: ingredient.id, unitId, grams: overrides?.[sn] ?? null };
            })
            .filter((d): d is NonNullable<typeof d> => d !== null);

        if (unitData.length > 0) {
            await db.ingredientUnit.createMany({ data: unitData, skipDuplicates: true });
        }

        created++;
    }

    return { created, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeder implementation
// ─────────────────────────────────────────────────────────────────────────────

export const ingredientsSeeder: Seeder = {
    name: 'ingredients',
    description: 'Swiss Food DB: ingredient categories, units, and ~1000 ingredients',

    async run(db: PrismaClient): Promise<SeederResult> {
        const foods = loadFoods();

        const cats = await seedCategories(db, foods, 'safe');
        const units = await seedUnits(db, 'safe');
        const ings = await seedIngredientRecords(db, foods, cats.categoryMap, units.unitMap);

        return {
            created: cats.created + units.created + ings.created,
            skipped: cats.skipped + units.skipped + ings.skipped,
            deleted: 0,
        };
    },

    async reset(db: PrismaClient): Promise<SeederResult> {
        // Delete all ingredient-related data
        const deletedIU = await db.ingredientUnit.deleteMany();
        const deletedRI = await db.recipeIngredient.deleteMany();
        await db.$executeRawUnsafe(`DELETE FROM "_IngredientToIngredientCategory"`);
        const deletedIng = await db.ingredient.deleteMany();
        const deletedCat = await db.ingredientCategory.deleteMany();
        const deletedUnit = await db.unit.deleteMany();
        const totalDeleted =
            deletedIU.count +
            deletedRI.count +
            deletedIng.count +
            deletedCat.count +
            deletedUnit.count;

        // Re-create everything
        const foods = loadFoods();
        const cats = await seedCategories(db, foods, 'force');
        const units = await seedUnits(db, 'force');
        const ings = await seedIngredientRecords(db, foods, cats.categoryMap, units.unitMap);

        return {
            created: cats.created + units.created + ings.created,
            skipped: 0,
            deleted: totalDeleted,
        };
    },
};
