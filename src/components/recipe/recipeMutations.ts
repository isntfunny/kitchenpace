'use server';

import { createActivityLog } from '@app/lib/events/persist';
import { moderateContent, persistModerationResult } from '@app/lib/moderation/moderationService';
import { updateRecipeNutrition } from '@app/lib/nutrition/update-recipe-nutrition';
import { generateUniqueSlug } from '@app/lib/slug';
import { prisma } from '@shared/prisma';
import { addSyncRecipeJob, addGenerateRecipeOgJob } from '@worker/queues';

import { createIngredient, findOrCreateUnit } from './ingredientActions';
import {
    assertPublishableFlow,
    extractRecipeText,
    moveRecipeImage,
    sendNotificationsToFollowers,
    stripPhotoKeys,
    syncStepImages,
} from './recipeFormHelpers';
import type {
    CreateRecipeInput,
    RecipeIngredientInput,
    UpdateRecipeInput,
} from './recipeFormTypes';

/** Verify and sync ingredients — ensure all referenced ingredient/unit IDs exist. */
async function syncIngredients(ingredients: RecipeIngredientInput[]) {
    const synced = await Promise.all(
        ingredients.map(async (ing) => {
            // Resolve ingredient
            let ingredientId = ing.ingredientId;
            const existing = await prisma.ingredient.findUnique({
                where: { id: ingredientId },
            });
            if (!existing) {
                if (ing.ingredientName) {
                    const created = await createIngredient(ing.ingredientName, undefined, [
                        ing.unit,
                    ]);
                    ingredientId = created.id;
                } else {
                    throw new Error(
                        `Zutat mit ID ${ingredientId} existiert nicht in der Datenbank.`,
                    );
                }
            }

            // Resolve unit string → unitId
            const unitId = await findOrCreateUnit(ing.unit);

            return { ...ing, ingredientId, unitId };
        }),
    );

    // Deduplicate by ingredientId (AI imports can produce duplicates)
    const seen = new Set<string>();
    return synced.filter((ing) => {
        if (seen.has(ing.ingredientId)) return false;
        seen.add(ing.ingredientId);
        return true;
    });
}

export async function updateRecipe(
    recipeId: string,
    data: UpdateRecipeInput,
    authorId: string,
    isUserAdmin = false,
) {
    const existing = await prisma.recipe.findFirst({
        where: isUserAdmin ? { id: recipeId } : { id: recipeId, authorId },
        select: { id: true, slug: true, title: true, status: true, authorId: true },
    });

    if (!existing) {
        throw new Error('Rezept nicht gefunden oder keine Berechtigung');
    }

    const effectiveAuthorId = existing.authorId;
    assertPublishableFlow(data);

    // Content moderation
    const recipeText = extractRecipeText(data);
    const modResult = await moderateContent({ text: recipeText });

    if (modResult.decision === 'REJECTED') {
        throw new Error(
            'CONTENT_REJECTED:Dein Inhalt wurde abgelehnt — bitte überprüfe den Text deines Rezepts.',
        );
    }

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
            imageKey: data.imageKey,
            servings: data.servings,
            prepTime: data.prepTime,
            cookTime: data.cookTime,
            totalTime: data.prepTime + data.cookTime,
            difficulty: data.difficulty,
            status: recipeStatus as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
            publishedAt: isPublishing ? new Date() : undefined,
            moderationStatus: modResult.decision === 'PENDING' ? 'PENDING' : 'AUTO_APPROVED',
            aiModerationScore: modResult.score,
            moderationNote: modResult.decision === 'PENDING' ? null : undefined,
            flowNodes: data.flowNodes ? stripPhotoKeys(data.flowNodes) : undefined,
            flowEdges: data.flowEdges ? (data.flowEdges as unknown as object) : undefined,
        },
    });

    if (data.flowNodes) {
        await syncStepImages(recipeId, data.flowNodes);
    }

    // Move recipe image from uploads/ to approved/ if auto-approved
    let finalImageKey = recipe.imageKey;
    if (modResult.decision === 'AUTO_APPROVED' && recipe.imageKey?.startsWith('uploads/')) {
        finalImageKey = await moveRecipeImage(recipe.id, recipe.imageKey);
    }

    await persistModerationResult('recipe', recipe.id, effectiveAuthorId, modResult, {
        contentType: 'recipe',
        contentId: recipe.id,
        authorId: effectiveAuthorId,
        title: data.title,
        description: data.description,
        text: recipeText,
        imageKey: finalImageKey ?? undefined,
    });

    if (modResult.decision === 'AUTO_APPROVED' && finalImageKey) {
        addGenerateRecipeOgJob(recipe.id, finalImageKey).catch((err) => {
            console.error('[createActions] Failed to enqueue OG job', err);
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
    const uniqueIngredients = await syncIngredients(data.ingredients);
    await prisma.recipeIngredient.deleteMany({ where: { recipeId } });
    if (uniqueIngredients.length > 0) {
        await prisma.recipeIngredient.createMany({
            data: uniqueIngredients.map((ing, index) => ({
                recipeId,
                ingredientId: ing.ingredientId,
                unitId: ing.unitId,
                amount: ing.amount,
                notes: ing.notes || null,
                isOptional: ing.isOptional,
                position: index,
            })),
        });
    }

    await updateRecipeNutrition(recipeId, data.servings);

    if (isPublishing) {
        await createActivityLog({
            userId: effectiveAuthorId,
            type: 'RECIPE_CREATED',
            targetId: recipe.id,
            targetType: 'recipe',
        });
        await sendNotificationsToFollowers(effectiveAuthorId, recipeId, data.title);
    }

    if (recipeStatus === 'PUBLISHED' || existing.status === 'PUBLISHED') {
        await addSyncRecipeJob(recipeId).catch((err) =>
            console.error('[OpenSearch] Failed to queue sync for recipe update:', err),
        );
    }

    return { ...recipe, imageKey: finalImageKey };
}

export async function createRecipe(data: CreateRecipeInput, authorId: string) {
    assertPublishableFlow(data);

    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await prisma.recipe.findUnique({ where: { slug: s } });
        return !!existing;
    });

    // Content moderation
    const recipeText = extractRecipeText(data);
    const modResult = await moderateContent({ text: recipeText });

    if (modResult.decision === 'REJECTED') {
        throw new Error(
            'CONTENT_REJECTED:Dein Inhalt wurde abgelehnt — bitte überprüfe den Text deines Rezepts.',
        );
    }

    const intendedStatus = data.status ?? 'DRAFT';
    const recipeStatus = modResult.decision === 'PENDING' ? 'DRAFT' : intendedStatus;
    const isPublished = recipeStatus === 'PUBLISHED';

    const uniqueIngredients = await syncIngredients(data.ingredients);

    const recipe = await prisma.recipe.create({
        data: {
            title: data.title,
            slug,
            description: data.description,
            imageKey: data.imageKey,
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
            flowNodes: data.flowNodes ? stripPhotoKeys(data.flowNodes) : undefined,
            flowEdges: (data.flowEdges as unknown as object) ?? undefined,
            recipeIngredients: {
                create: uniqueIngredients.map((ing, index) => ({
                    ingredientId: ing.ingredientId,
                    unitId: ing.unitId,
                    amount: ing.amount,
                    notes: ing.notes || null,
                    isOptional: ing.isOptional,
                    position: index,
                })),
            },
        },
    });

    if (data.flowNodes) {
        await syncStepImages(recipe.id, data.flowNodes);
    }

    // Move recipe image from uploads/ to approved/ if auto-approved
    let finalImageKey = recipe.imageKey;
    if (modResult.decision === 'AUTO_APPROVED' && recipe.imageKey?.startsWith('uploads/')) {
        finalImageKey = await moveRecipeImage(recipe.id, recipe.imageKey);
    }

    await persistModerationResult('recipe', recipe.id, authorId, modResult, {
        contentType: 'recipe',
        contentId: recipe.id,
        authorId,
        title: data.title,
        description: data.description,
        text: recipeText,
        imageKey: finalImageKey ?? undefined,
    });

    await updateRecipeNutrition(recipe.id, data.servings);

    if (modResult.decision === 'AUTO_APPROVED' && finalImageKey) {
        addGenerateRecipeOgJob(recipe.id, finalImageKey).catch((err) => {
            console.error('[createActions] Failed to enqueue OG job for new recipe', err);
        });
    }

    if (isPublished) {
        await createActivityLog({
            userId: authorId,
            type: 'RECIPE_CREATED',
            targetId: recipe.id,
            targetType: 'recipe',
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
