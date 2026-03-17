'use server';

import { fireEvent } from '@app/lib/events/fire';
import { createActivityLog, createUserNotification } from '@app/lib/events/persist';
import { uploadImageFromUrl as uploadImageFromUrlShared } from '@app/lib/importer/upload-image-from-url';
import { moderateContent, persistModerationResult } from '@app/lib/moderation/moderationService';
import { updateRecipeNutrition } from '@app/lib/nutrition/update-recipe-nutrition';
import { moveObject } from '@app/lib/s3';
import { approvedKey } from '@app/lib/s3/keys';
import { slugify, generateUniqueSlug } from '@app/lib/slug';
import { formatValidationErrors, validateFlow } from '@app/lib/validation/flowValidation';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';
import { addSyncRecipeJob, addGenerateRecipeOgJob } from '@worker/queues';

/**
 * Extract all user-generated text from a recipe for content moderation
 */
function extractRecipeText(data: {
    title: string;
    description?: string;
    flowNodes?: FlowNodeInput[];
}): string {
    const parts = [data.title, data.description || ''];
    if (data.flowNodes) {
        for (const node of data.flowNodes) {
            parts.push(node.label, node.description);
        }
    }
    return parts.filter(Boolean).join('\n');
}

function assertPublishableFlow(data: {
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    flowNodes?: FlowNodeInput[];
    flowEdges?: FlowEdgeInput[];
}) {
    if (data.status !== 'PUBLISHED') return;

    const flowNodes = data.flowNodes ?? [];
    const flowEdges = data.flowEdges ?? [];

    if (flowNodes.length === 0 && flowEdges.length === 0) {
        throw new Error(
            'Bitte erstelle zuerst einen Rezept-Flow mit mindestens einem Schritt, bevor du veröffentlichst.',
        );
    }

    const validation = validateFlow(flowNodes, flowEdges, { scope: 'publish' });
    if (!validation.isValid) {
        throw new Error(formatValidationErrors(validation));
    }
}

function assertStoredRecipeCanBePublished(recipe: {
    title: string;
    flowNodes: unknown;
    flowEdges: unknown;
}) {
    const validation = validateFlow(
        (recipe.flowNodes as FlowNodeInput[] | null) ?? [],
        (recipe.flowEdges as FlowEdgeInput[] | null) ?? [],
        { scope: 'publish' },
    );

    if (!validation.isValid) {
        throw new Error(`${recipe.title}: ${formatValidationErrors(validation)}`);
    }
}

export interface RecipeIngredientInput {
    ingredientId: string;
    ingredientName?: string; // For syncing missing ingredients
    amount: string;
    unit: string;
    notes?: string;
    isOptional: boolean;
}

/** Alias for FlowNodeSerialized with a looser `type` (accepts any string, not just StepType). */
export type FlowNodeInput = Omit<
    import('../flow/editor/editorTypes').FlowNodeSerialized,
    'type'
> & {
    type: string;
};

/** Strip photoKey from nodes before writing to the flowNodes JSON column.
 *  Photos are stored in RecipeStepImage instead. */
function stripPhotoKeys(nodes: FlowNodeInput[]): object {
    return nodes.map(({ photoKey: _, ...n }) => n) as unknown as object;
}

/** Sync RecipeStepImage rows for a recipe after create/update. */
async function syncStepImages(recipeId: string, nodes: FlowNodeInput[]): Promise<void> {
    const currentStepIds = nodes.map((n) => n.id);

    // Delete images for steps that were removed or had their photo cleared
    const stepsWithPhoto = new Set(nodes.filter((n) => n.photoKey).map((n) => n.id));
    await prisma.recipeStepImage.deleteMany({
        where: {
            recipeId,
            OR: [
                { stepId: { notIn: currentStepIds } },
                { stepId: { in: currentStepIds.filter((id) => !stepsWithPhoto.has(id)) } },
            ],
        },
    });

    // Upsert for steps that have a photo; move uploads/ → approved/ if needed
    for (const node of nodes) {
        if (!node.photoKey) continue;
        let photoKey = node.photoKey;
        if (photoKey.startsWith('uploads/')) {
            const filename = photoKey.split('/').pop() ?? photoKey;
            const destKey = `approved/step/${filename}`;
            try {
                await moveObject(photoKey, destKey);
                photoKey = destKey;
            } catch {
                // already moved or missing — keep original key
            }
        }
        await prisma.recipeStepImage.upsert({
            where: { recipeId_stepId: { recipeId, stepId: node.id } },
            create: { recipeId, stepId: node.id, photoKey },
            update: { photoKey },
        });
    }
}

import type { FlowEdgeSerialized } from '../flow/editor/editorTypes';
export type FlowEdgeInput = FlowEdgeSerialized;

export interface UpdateRecipeInput {
    title: string;
    description?: string;
    imageKey?: string;
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

    // Use the actual recipe author for activity logs and moderation audit
    const effectiveAuthorId = existing.authorId;

    assertPublishableFlow(data);

    // Content moderation — check text before saving
    const recipeText = extractRecipeText(data);
    const modResult = await moderateContent({ text: recipeText });

    if (modResult.decision === 'REJECTED') {
        throw new Error(
            'CONTENT_REJECTED:Dein Inhalt wurde abgelehnt — bitte überprüfe den Text deines Rezepts.',
        );
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
            moderationNote: modResult.decision === 'PENDING' ? null : undefined, // clear old note on re-check
            flowNodes: data.flowNodes ? stripPhotoKeys(data.flowNodes) : undefined,
            flowEdges: data.flowEdges ? (data.flowEdges as unknown as object) : undefined,
        },
    });

    // Sync step images (after recipe exists so FK is valid)
    if (data.flowNodes) {
        await syncStepImages(recipeId, data.flowNodes);
    }

    // Move recipe image from uploads/ to approved/ if auto-approved
    let finalImageKey = recipe.imageKey;
    if (modResult.decision === 'AUTO_APPROVED' && recipe.imageKey?.startsWith('uploads/')) {
        const ext = recipe.imageKey.split('.').pop() ?? 'jpg';
        const destKey = approvedKey('recipe', recipe.id, ext);
        try {
            await moveObject(recipe.imageKey, destKey);
        } catch (err: unknown) {
            const s3Err = err as { Code?: string };
            if (s3Err.Code !== 'NoSuchKey') throw err;
            // File was already moved on a previous save (stale uploads/ key from client) — just fix the DB key
        }
        await prisma.recipe.update({ where: { id: recipe.id }, data: { imageKey: destKey } });
        finalImageKey = destKey;
    }

    // Persist moderation result for audit trail
    await persistModerationResult('recipe', recipe.id, effectiveAuthorId, modResult, {
        contentType: 'recipe',
        contentId: recipe.id,
        authorId: effectiveAuthorId,
        title: data.title,
        description: data.description,
        text: recipeText,
        imageKey: finalImageKey ?? undefined,
    });

    // Queue OG image generation for auto-approved recipes with an image
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

    // Deduplicate ingredients by ingredientId (AI imports can produce duplicates)
    const seenIngredientIds = new Set<string>();
    const uniqueIngredients = syncedIngredients.filter((ing) => {
        if (seenIngredientIds.has(ing.ingredientId)) return false;
        seenIngredientIds.add(ing.ingredientId);
        return true;
    });

    await prisma.recipeIngredient.deleteMany({ where: { recipeId } });
    if (uniqueIngredients.length > 0) {
        await prisma.recipeIngredient.createMany({
            data: uniqueIngredients.map((ing, index) => ({
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

    // Auto-calculate nutrition from ingredients
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

export interface CreateRecipeInput {
    title: string;
    description: string;
    imageKey?: string;
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
    assertPublishableFlow(data);

    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await prisma.recipe.findUnique({ where: { slug: s } });
        return !!existing;
    });

    // Content moderation — check text before saving
    const recipeText = extractRecipeText(data);
    const modResult = await moderateContent({ text: recipeText });

    if (modResult.decision === 'REJECTED') {
        throw new Error(
            'CONTENT_REJECTED:Dein Inhalt wurde abgelehnt — bitte überprüfe den Text deines Rezepts.',
        );
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

    // Deduplicate ingredients by ingredientId (AI imports can produce duplicates)
    const seenIngredientIds = new Set<string>();
    const uniqueIngredients = syncedIngredients.filter((ing) => {
        if (seenIngredientIds.has(ing.ingredientId)) return false;
        seenIngredientIds.add(ing.ingredientId);
        return true;
    });

    const recipe = await prisma.recipe.create({
        data: {
            title: data.title,
            slug: slug,
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
                    amount: ing.amount,
                    unit: ing.unit,
                    notes: ing.notes || null,
                    isOptional: ing.isOptional,
                    position: index,
                })),
            },
        },
    });

    // Sync step images
    if (data.flowNodes) {
        await syncStepImages(recipe.id, data.flowNodes);
    }

    // Move recipe image from uploads/ to approved/ if auto-approved
    let finalImageKey = recipe.imageKey;
    if (modResult.decision === 'AUTO_APPROVED' && recipe.imageKey?.startsWith('uploads/')) {
        const ext = recipe.imageKey.split('.').pop() ?? 'jpg';
        const destKey = approvedKey('recipe', recipe.id, ext);
        await moveObject(recipe.imageKey, destKey);
        await prisma.recipe.update({ where: { id: recipe.id }, data: { imageKey: destKey } });
        finalImageKey = destKey;
    }

    // Persist moderation result for audit trail
    await persistModerationResult('recipe', recipe.id, authorId, modResult, {
        contentType: 'recipe',
        contentId: recipe.id,
        authorId,
        title: data.title,
        description: data.description,
        text: recipeText,
        imageKey: finalImageKey ?? undefined,
    });

    // Auto-calculate nutrition from ingredients
    await updateRecipeNutrition(recipe.id, data.servings);

    // Queue OG image generation for auto-approved recipes with an image
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

async function notifyModeratorsNewIngredient(ingredientId: string, ingredientName: string) {
    const moderators = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MODERATOR'] } },
        select: { id: true },
    });
    await Promise.allSettled(
        moderators.map((mod) =>
            createUserNotification({
                userId: mod.id,
                type: 'SYSTEM',
                title: 'Neue Zutat erstellt',
                message: `„${ingredientName}" wurde von einem Nutzer erstellt und muss überprüft werden.`,
                data: { ingredientId },
            }),
        ),
    );
}

const ingLog = createLogger('ingredient');

export async function createIngredient(name: string, _category?: string, _units: string[] = []) {
    const { stemGerman, getWordVariants } = await import('@app/lib/german-stem');

    const trimmed = name.trim();

    // 1. Hunspell stemming → singular base form
    const singular = await stemGerman(trimmed);
    const isStemmed = singular.toLowerCase() !== trimmed.toLowerCase();

    // Canonical name: keep original casing style, use singular form
    const canonicalName = trimmed[0].toUpperCase() + singular.slice(1);
    const slug = slugify(canonicalName);

    ingLog.debug('lookup', { input: trimmed, singular, slug, stemmed: isStemmed });

    // 2. Try slug match (singular slug)
    const bySlug = await prisma.ingredient.findUnique({ where: { slug } });
    if (bySlug) {
        ingLog.debug('found by slug', { input: trimmed, match: bySlug.name, id: bySlug.id });
        return bySlug;
    }

    // 3. Try alias match (for regional synonyms)
    const variants = await getWordVariants(trimmed);
    if (variants.length > 1) {
        const byAlias = await prisma.ingredient.findFirst({
            where: { aliases: { hasSome: variants } },
        });
        if (byAlias) {
            ingLog.debug('found by alias', {
                input: trimmed,
                variants,
                match: byAlias.name,
                id: byAlias.id,
            });
            return byAlias;
        }
    }

    // 4. Also try the original name's slug (in case it wasn't stemmed to the same slug)
    const originalSlug = slugify(trimmed);
    if (originalSlug !== slug) {
        const byOriginalSlug = await prisma.ingredient.findUnique({
            where: { slug: originalSlug },
        });
        if (byOriginalSlug) {
            ingLog.debug('found by original slug', {
                input: trimmed,
                originalSlug,
                match: byOriginalSlug.name,
                id: byOriginalSlug.id,
            });
            return byOriginalSlug;
        }
    }

    // 5. Create new ingredient with singular as canonical name + default units
    ingLog.info('creating new ingredient', {
        input: trimmed,
        canonicalName,
        slug,
        stemmed: isStemmed,
    });
    try {
        const defaultUnits = await prisma.unit.findMany({
            where: { shortName: { in: ['g', 'ml', 'Stk'] } },
            select: { id: true },
        });

        const ingredient = await prisma.ingredient.create({
            data: {
                name: canonicalName,
                slug,
                pluralName: isStemmed ? trimmed[0].toUpperCase() + trimmed.slice(1) : null,
                needsReview: true,
                ingredientUnits: {
                    create: defaultUnits.map((u) => ({ unitId: u.id })),
                },
            },
        });

        ingLog.info('created', { id: ingredient.id, name: ingredient.name, slug });

        // Notify moderators about the new ingredient
        notifyModeratorsNewIngredient(ingredient.id, ingredient.name).catch(() => {});

        return ingredient;
    } catch (e) {
        // Race condition: slug already taken → return existing
        if (e instanceof Error && e.message.includes('Unique constraint')) {
            ingLog.debug('race condition, returning existing', { slug });
            return prisma.ingredient.findUniqueOrThrow({ where: { slug } });
        }
        throw e;
    }
}

export type RecipeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export async function updateRecipeStatus(
    recipeId: string,
    status: RecipeStatus,
    authorId: string,
    isUserAdmin = false,
): Promise<{ success: boolean; error?: string }> {
    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { authorId: true, title: true, flowNodes: true, flowEdges: true },
        });

        if (!recipe) {
            return { success: false, error: 'Rezept nicht gefunden' };
        }

        if (!isUserAdmin && recipe.authorId !== authorId) {
            return { success: false, error: 'Nicht autorisiert' };
        }

        const isPublished = status === 'PUBLISHED';

        if (isPublished) {
            assertStoredRecipeCanBePublished(recipe);
        }

        await prisma.recipe.update({
            where: { id: recipeId },
            data: {
                status,
                publishedAt: isPublished ? new Date() : status === 'DRAFT' ? null : undefined,
            },
        });

        if (isPublished) {
            await createActivityLog({
                userId: authorId,
                type: 'RECIPE_CREATED',
                targetId: recipeId,
                targetType: 'recipe',
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
    isUserAdmin = false,
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    try {
        const isPublished = status === 'PUBLISHED';
        const ownerFilter = isUserAdmin ? {} : { authorId };

        if (isPublished) {
            const recipesToPublish = await prisma.recipe.findMany({
                where: {
                    id: { in: recipeIds },
                    ...ownerFilter,
                },
                select: { id: true, title: true, flowNodes: true, flowEdges: true },
            });

            const invalidTitles: string[] = [];
            for (const recipe of recipesToPublish) {
                try {
                    assertStoredRecipeCanBePublished(recipe);
                } catch {
                    invalidTitles.push(recipe.title);
                }
            }

            if (invalidTitles.length > 0) {
                return {
                    success: false,
                    updatedCount: 0,
                    error: `Diese Rezepte koennen noch nicht veroeffentlicht werden: ${invalidTitles.slice(0, 3).join(', ')}${invalidTitles.length > 3 ? ' ...' : ''}`,
                };
            }
        }

        const result = await prisma.recipe.updateMany({
            where: {
                id: { in: recipeIds },
                ...ownerFilter,
            },
            data: {
                status,
                publishedAt: isPublished ? new Date() : status === 'DRAFT' ? null : undefined,
            },
        });

        if (isPublished) {
            const publishedRecipes = await prisma.recipe.findMany({
                where: { id: { in: recipeIds }, ...ownerFilter },
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
    isUserAdmin = false,
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
        if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
            return { success: false, deletedCount: 0, error: 'Keine Rezept-IDs angegeben' };
        }

        const ownerFilter = isUserAdmin ? {} : { authorId };

        // Verify all recipes belong to the user (or admin can access all)
        const recipes = await prisma.recipe.findMany({
            where: {
                id: { in: recipeIds },
                ...ownerFilter,
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
                ...ownerFilter,
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

const TAG_NAME_REGEX = /^[a-zA-ZäöüÄÖÜß0-9\- ]+$/;
const MAX_TAG_LENGTH = 40;

function tagSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export async function findOrCreateTag(
    rawName: string,
): Promise<{ id: string; name: string } | null> {
    const name = rawName.trim();
    if (!name || name.length > MAX_TAG_LENGTH || !TAG_NAME_REGEX.test(name)) {
        return null;
    }

    const slug = tagSlug(name);
    if (!slug) return null;

    const tag = await prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
        select: { id: true, name: true },
    });

    return tag;
}

/**
 * Downloads an external image URL and uploads it to S3.
 * Server action wrapper so client components can call this.
 */
export async function uploadImageFromUrl(
    imageUrl: string,
): Promise<{ success: true; key: string } | { success: false; error: string }> {
    return uploadImageFromUrlShared(imageUrl);
}
