'use server';

import { prisma } from '@/lib/prisma';

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
    categoryId?: string;
    tagIds?: string[];
    ingredients: RecipeIngredientInput[];
}

export async function createRecipe(data: CreateRecipeInput, authorId: string) {
    const slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9äöüß]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const recipe = await prisma.recipe.create({
        data: {
            title: data.title,
            slug: `${slug}-${Date.now()}`,
            description: data.description,
            imageUrl: data.imageUrl,
            servings: data.servings,
            prepTime: data.prepTime,
            cookTime: data.cookTime,
            totalTime: data.prepTime + data.cookTime,
            difficulty: data.difficulty,
            status: 'DRAFT',
            authorId,
            categoryId: data.categoryId,
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
        } as any,
    });

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
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9äöüß]+/g, '-')
        .replace(/(^-|-$)/g, '');

    return prisma.ingredient.upsert({
        where: { slug },
        update: {},
        create: {
            name,
            slug,
            category: (category as any) || null,
            units: units.length > 0 ? units : [name.includes('g') ? 'g' : 'Stück'],
        },
    });
}
