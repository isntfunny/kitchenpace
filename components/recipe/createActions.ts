'use server';

import { fireEvent } from '@/lib/events/fire';
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
    status?: 'DRAFT' | 'PUBLISHED';
}

export async function createRecipe(data: CreateRecipeInput, authorId: string) {
    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await prisma.recipe.findUnique({ where: { slug: s } });
        return !!existing;
    });

    const recipeStatus = data.status ?? 'DRAFT';
    const isPublished = recipeStatus === 'PUBLISHED';

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
            status: recipeStatus,
            publishedAt: isPublished ? new Date() : null,
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

    if (isPublished) {
        await prisma.activityLog.create({
            data: {
                userId: authorId,
                type: 'RECIPE_CREATED',
                targetId: recipe.id,
                targetType: 'recipe',
            },
        });

        await sendNotificationsToFollowers(authorId, recipe.id, data.title);
    }

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

export type RecipeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export async function updateRecipeStatus(
    recipeId: string,
    status: RecipeStatus,
    authorId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { authorId: true, title: true },
        });

        if (!recipe) {
            return { success: false, error: 'Rezept nicht gefunden' };
        }

        if (recipe.authorId !== authorId) {
            return { success: false, error: 'Nicht autorisiert' };
        }

        const isPublished = status === 'PUBLISHED';

        await prisma.recipe.update({
            where: { id: recipeId },
            data: {
                status,
                publishedAt: isPublished ? new Date() : status === 'DRAFT' ? null : undefined,
            },
        });

        if (isPublished) {
            await prisma.activityLog.create({
                data: {
                    userId: authorId,
                    type: 'RECIPE_CREATED',
                    targetId: recipeId,
                    targetType: 'recipe',
                },
            });

            await sendNotificationsToFollowers(authorId, recipeId, recipe.title);
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating recipe status:', error);
        return { success: false, error: 'Fehler beim Aktualisieren des Status' };
    }
}

export async function bulkUpdateRecipeStatus(
    recipeIds: string[],
    status: RecipeStatus,
    authorId: string,
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    try {
        const isPublished = status === 'PUBLISHED';

        const result = await prisma.recipe.updateMany({
            where: {
                id: { in: recipeIds },
                authorId,
            },
            data: {
                status,
                publishedAt: isPublished ? new Date() : status === 'DRAFT' ? null : undefined,
            },
        });

        if (isPublished) {
            const publishedRecipes = await prisma.recipe.findMany({
                where: { id: { in: recipeIds }, authorId },
                select: { id: true, title: true },
            });

            await Promise.all(
                publishedRecipes.map((recipe) =>
                    fireEvent({
                        event: 'recipePublished',
                        actorId: authorId,
                        data: { recipeId: recipe.id, recipeTitle: recipe.title },
                    }),
                ),
            );

            for (const recipe of publishedRecipes) {
                await sendNotificationsToFollowers(authorId, recipe.id, recipe.title);
            }
        }

        return { success: true, updatedCount: result.count };
    } catch (error) {
        console.error('Error bulk updating recipe status:', error);
        return { success: false, updatedCount: 0, error: 'Fehler beim Massen-Update' };
    }
}

async function sendNotificationsToFollowers(
    authorId: string,
    recipeId: string,
    recipeTitle: string,
) {
    const followers = await prisma.follow.findMany({
        where: { followingId: authorId },
        select: { followerId: true },
    });

    if (followers.length === 0) return;

    await Promise.all(
        followers.map((follow) =>
            fireEvent({
                event: 'recipePublished',
                actorId: authorId,
                recipientId: follow.followerId,
                data: { recipeId, recipeTitle },
                skipActivity: true,
            }),
        ),
    );
}
