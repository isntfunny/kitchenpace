'use server';

import { prisma } from '@/lib/prisma';
import { slugify, generateUniqueSlug } from '@/lib/slug';

type ShoppingCategory =
    | 'GEMUESE'
    | 'OBST'
    | 'FLEISCH'
    | 'FISCH'
    | 'MILCHPRODUKTE'
    | 'GEWURZE'
    | 'BACKEN'
    | 'GETRAENKE'
    | 'SONSTIGES';

const SHOPPING_CATEGORIES: ShoppingCategory[] = [
    'GEMUESE',
    'OBST',
    'FLEISCH',
    'FISCH',
    'MILCHPRODUKTE',
    'GEWURZE',
    'BACKEN',
    'GETRAENKE',
    'SONSTIGES',
];

function toShoppingCategory(category?: string): ShoppingCategory | null {
    if (!category) return null;
    const normalized = category.toUpperCase().replace(/[^A-Z]/g, '');
    const match = SHOPPING_CATEGORIES.find((c) => c.includes(normalized) || normalized.includes(c));
    return match ?? 'SONSTIGES';
}

export interface RecipeIngredientInput {
    ingredientId: string;
    amount: string;
    unit: string;
    notes?: string;
    isOptional: boolean;
}

export interface CreateRecipeInput {
    title: string;
    description: string;
    imageUrl?: string;
    servings: number;
    prepTime: number;
    cookTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    categoryIds: string[]; // Changed from categoryId to categoryIds array
    tagIds?: string[];
    ingredients: RecipeIngredientInput[];
}

export async function createRecipe(data: CreateRecipeInput, authorId: string) {
    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await prisma.recipe.findUnique({ where: { slug: s } });
        return !!existing;
    });

    const recipe = await prisma.recipe.create({
        data: {
            title: data.title,
            slug: slug,
            description: data.description,
            imageUrl: data.imageUrl,
            servings: data.servings,
            prepTime: data.prepTime,
            cookTime: data.cookTime,
            totalTime: data.prepTime + data.cookTime,
            difficulty: data.difficulty,
            status: 'DRAFT',
            authorId,
            recipeIngredients: {
                create: data.ingredients.map((ing, index) => ({
                    ingredientId: ing.ingredientId,
                    amount: ing.amount,
                    unit: ing.unit,
                    notes: ing.notes || null,
                    isOptional: ing.isOptional,
                    position: index,
                })),
            },
        },
    });

    // Add categories after recipe is created
    if (data.categoryIds && data.categoryIds.length > 0) {
        await prisma.recipeCategory.createMany({
            data: data.categoryIds.map((categoryId, index) => ({
                recipeId: recipe.id,
                categoryId,
                position: index,
            })),
        });
    }

    // Add tags after recipe is created
    if (data.tagIds && data.tagIds.length > 0) {
        await prisma.recipeTag.createMany({
            data: data.tagIds.map((tagId) => ({
                recipeId: recipe.id,
                tagId,
            })),
        });
    }

    return recipe;
}

export async function createIngredient(name: string, category?: string, units: string[] = []) {
    const slug = slugify(name);

    return prisma.ingredient.upsert({
        where: { slug },
        update: {},
        create: {
            name,
            slug,
            category: toShoppingCategory(category),
            units: units.length > 0 ? units : [name.includes('g') ? 'g' : 'Stück'],
        },
    });
}
