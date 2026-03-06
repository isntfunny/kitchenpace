'use server';

import { fireEvent } from '@app/lib/events/fire';
import { moderateContent, persistModerationResult } from '@app/lib/moderation/moderationService';
import { slugify, generateUniqueSlug } from '@app/lib/slug';
import { prisma } from '@shared/prisma';
import { addSyncRecipeJob } from '@worker/queues';

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

/**
 * Extract all user-generated text from a recipe for content moderation
 */
function extractRecipeText(data: { title: string; description?: string; flowNodes?: FlowNodeInput[] }): string {
    const parts = [data.title, data.description || ''];
    if (data.flowNodes) {
        for (const node of data.flowNodes) {
            parts.push(node.label, node.description);
        }
    }
    return parts.filter(Boolean).join('\n');
}

export interface RecipeIngredientInput {
    ingredientId: string;
    ingredientName?: string; // For syncing missing ingredients
    amount: string;
    unit: string;
    notes?: string;
    isOptional: boolean;
}

export interface FlowNodeInput {
    id: string;
    type: string;
    label: string;
    description: string;
    duration?: number;
    ingredientIds?: string[];
    photoKey?: string;
    photoUrl?: string;
    position?: { x: number; y: number };
}

export interface FlowEdgeInput {
    id: string;
    source: string;
    target: string;
}

export interface UpdateRecipeInput {
    title: string;
    description?: string;
    imageUrl?: string;
    servings: number;
    prepTime: number;
    cookTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    categoryIds: string[];
    tagIds?: string[];
    ingredients: RecipeIngredientInput[];
    flowNodes?: FlowNodeInput[];
    flowEdges?: FlowEdgeInput[];
    status?: 'DRAFT' | 'PUBLISHED';
}

export async function updateRecipe(recipeId: string, data: UpdateRecipeInput, authorId: string) {
    const existing = await prisma.recipe.findFirst({
        where: { id: recipeId, authorId },
        select: { id: true, slug: true, title: true, status: true },
    });

    if (!existing) {
        throw new Error('Rezept nicht gefunden oder keine Berechtigung');
    }

    // Content moderation — check text before saving
    const recipeText = extractRecipeText(data);
    const modResult = await moderateContent({ text: recipeText });

    if (modResult.decision === 'REJECTED') {
        throw new Error('CONTENT_REJECTED:Dein Inhalt wurde abgelehnt — bitte überprüfe den Text deines Rezepts.');
    }

    // If moderation flags content for review, force draft status
    const intendedStatus = data.status ?? existing.status;
    const recipeStatus = modResult.decision === 'PENDING' ? 'DRAFT' : intendedStatus;
    const isPublishing = recipeStatus === 'PUBLISHED' && existing.status !== 'PUBLISHED';

    let slug = existing.slug;
    if (data.title !== existing.title) {
        slug = await generateUniqueSlug(data.title, async (s) => {
            const conflict = await prisma.recipe.findFirst({
                where: { slug: s, NOT: { id: recipeId } },
            });
            return !!conflict;
        });
    }

    const recipe = await prisma.recipe.update({
        where: { id: recipeId },
        data: {
            title: data.title,
            slug,
            description: data.description,
            imageKey: data.imageUrl,
            servings: data.servings,
            prepTime: data.prepTime,
            cookTime: data.cookTime,
            totalTime: data.prepTime + data.cookTime,
            difficulty: data.difficulty,
            status: recipeStatus as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
            publishedAt: isPublishing ? new Date() : undefined,
            moderationStatus: modResult.decision === 'PENDING' ? 'PENDING' : 'AUTO_APPROVED',
            aiModerationScore: modResult.score,
            moderationNote: modResult.decision === 'PENDING' ? null : undefined, // clear old note on re-check
            flowNodes: data.flowNodes ? (data.flowNodes as unknown as object) : undefined,
            flowEdges: data.flowEdges ? (data.flowEdges as unknown as object) : undefined,
        },
    });

    // Queue for moderation review if needed
    if (modResult.decision === 'PENDING') {
        await persistModerationResult('recipe', recipe.id, authorId, modResult, {
            contentType: 'recipe',
            contentId: recipe.id,
            authorId,
            title: data.title,
            description: data.description,
            text: recipeText,
        });
    }

    // Replace categories
    await prisma.recipeCategory.deleteMany({ where: { recipeId } });
    if (data.categoryIds.length > 0) {
        await prisma.recipeCategory.createMany({
            data: data.categoryIds.map((categoryId, index) => ({
                recipeId,
                categoryId,
                position: index,
            })),
        });
    }

    // Replace tags
    await prisma.recipeTag.deleteMany({ where: { recipeId } });
    if (data.tagIds && data.tagIds.length > 0) {
        await prisma.recipeTag.createMany({
            data: data.tagIds.map((tagId) => ({ recipeId, tagId })),
        });
    }

    // Replace ingredients
    // Verify and sync ingredients — ensure all referenced ingredient IDs exist
    const syncedIngredients = await Promise.all(
        data.ingredients.map(async (ing) => {
            const existing = await prisma.ingredient.findUnique({
                where: { id: ing.ingredientId },
            });
            if (existing) {
                return ing;
            }
            // If ingredient doesn't exist, try to create it using the name
            if (ing.ingredientName) {
                const created = await createIngredient(ing.ingredientName, undefined, [ing.unit]);
                return { ...ing, ingredientId: created.id };
            }
            // If we can't create it (no name), throw an error
            throw new Error(`Zutat mit ID ${ing.ingredientId} existiert nicht in der Datenbank.`);
        }),
    );

    await prisma.recipeIngredient.deleteMany({ where: { recipeId } });
    if (syncedIngredients.length > 0) {
        await prisma.recipeIngredient.createMany({
            data: syncedIngredients.map((ing, index) => ({
                recipeId,
                ingredientId: ing.ingredientId,
                amount: ing.amount,
                unit: ing.unit,
                notes: ing.notes || null,
                isOptional: ing.isOptional,
                position: index,
            })),
        });
    }

    if (isPublishing) {
        await prisma.activityLog.create({
            data: {
                userId: authorId,
                type: 'RECIPE_CREATED',
                targetId: recipe.id,
                targetType: 'recipe',
            },
        });
        await sendNotificationsToFollowers(authorId, recipeId, data.title);
    }

    if (recipeStatus === 'PUBLISHED' || existing.status === 'PUBLISHED') {
        await addSyncRecipeJob(recipeId).catch((err) =>
            console.error('[OpenSearch] Failed to queue sync for recipe update:', err),
        );
    }

    return recipe;
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
    flowNodes?: FlowNodeInput[];
    flowEdges?: FlowEdgeInput[];
    status?: 'DRAFT' | 'PUBLISHED';
}

export async function createRecipe(data: CreateRecipeInput, authorId: string) {
    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await prisma.recipe.findUnique({ where: { slug: s } });
        return !!existing;
    });

    // Content moderation — check text before saving
    const recipeText = extractRecipeText(data);
    const modResult = await moderateContent({ text: recipeText });

    if (modResult.decision === 'REJECTED') {
        throw new Error('CONTENT_REJECTED:Dein Inhalt wurde abgelehnt — bitte überprüfe den Text deines Rezepts.');
    }

    // If moderation flags content for review, force draft status
    const intendedStatus = data.status ?? 'DRAFT';
    const recipeStatus = modResult.decision === 'PENDING' ? 'DRAFT' : intendedStatus;
    const isPublished = recipeStatus === 'PUBLISHED';

    // Verify and sync ingredients — ensure all referenced ingredient IDs exist
    const syncedIngredients = await Promise.all(
        data.ingredients.map(async (ing) => {
            const existing = await prisma.ingredient.findUnique({
                where: { id: ing.ingredientId },
            });
            if (existing) {
                return ing;
            }
            // If ingredient doesn't exist, try to create it using the name
            if (ing.ingredientName) {
                const created = await createIngredient(ing.ingredientName, undefined, [ing.unit]);
                return { ...ing, ingredientId: created.id };
            }
            // If we can't create it (no name), throw an error
            throw new Error(`Zutat mit ID ${ing.ingredientId} existiert nicht in der Datenbank.`);
        }),
    );

    const recipe = await prisma.recipe.create({
        data: {
            title: data.title,
            slug: slug,
            description: data.description,
            imageKey: data.imageUrl,
            servings: data.servings,
            prepTime: data.prepTime,
            cookTime: data.cookTime,
            totalTime: data.prepTime + data.cookTime,
            difficulty: data.difficulty,
            status: recipeStatus,
            publishedAt: isPublished ? new Date() : null,
            moderationStatus: modResult.decision === 'PENDING' ? 'PENDING' : 'AUTO_APPROVED',
            aiModerationScore: modResult.score,
            authorId,
            flowNodes: (data.flowNodes as unknown as object) ?? undefined,
            flowEdges: (data.flowEdges as unknown as object) ?? undefined,
            recipeIngredients: {
                create: syncedIngredients.map((ing, index) => ({
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

    // Queue for moderation review if needed
    if (modResult.decision === 'PENDING') {
        await persistModerationResult('recipe', recipe.id, authorId, modResult, {
            contentType: 'recipe',
            contentId: recipe.id,
            authorId,
            title: data.title,
            description: data.description,
            text: recipeText,
        });
    }

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

    if (isPublished) {
        await addSyncRecipeJob(recipe.id).catch((err) =>
            console.error('[OpenSearch] Failed to queue sync for new recipe:', err),
        );
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

        await addSyncRecipeJob(recipeId).catch((err) =>
            console.error('[OpenSearch] Failed to queue sync for status change:', err),
        );

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

        await Promise.all(
            recipeIds.map((id) =>
                addSyncRecipeJob(id).catch((err) =>
                    console.error('[OpenSearch] Failed to queue sync for bulk update:', err),
                ),
            ),
        );

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

export async function bulkDeleteRecipes(
    recipeIds: string[],
    authorId: string,
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
        if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
            return { success: false, deletedCount: 0, error: 'Keine Rezept-IDs angegeben' };
        }

        // Verify all recipes belong to the user
        const recipes = await prisma.recipe.findMany({
            where: {
                id: { in: recipeIds },
                authorId,
            },
            select: { id: true },
        });

        if (recipes.length !== recipeIds.length) {
            return {
                success: false,
                deletedCount: 0,
                error: 'Nicht autorisiert oder Rezepte nicht gefunden',
            };
        }

        // Delete all related data in cascade
        const result = await prisma.recipe.deleteMany({
            where: {
                id: { in: recipeIds },
                authorId,
            },
        });

        await Promise.all(
            recipeIds.map((id) =>
                addSyncRecipeJob(id).catch((err) =>
                    console.error('[OpenSearch] Failed to queue sync for bulk delete:', err),
                ),
            ),
        );

        return { success: true, deletedCount: result.count };
    } catch (error) {
        console.error('Error bulk deleting recipes:', error);
        return { success: false, deletedCount: 0, error: 'Fehler beim Löschen der Rezepte' };
    }
}
