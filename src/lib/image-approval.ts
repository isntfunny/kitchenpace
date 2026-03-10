/**
 * Centralised image approval / rejection helpers.
 *
 * Every content type that uploads images goes through one of:
 *   approve*  — moves uploads/ → approved/, updates the relevant DB column
 *   reject*   — moves uploads/ → trash/, clears / removes the DB column
 *
 * Callers (createActions, moderation/actions, social, etc.) should use these
 * functions instead of inlining S3 + Prisma logic.
 */

import { moveObject } from '@app/lib/s3';
import { approvedKey, trashKeyFrom } from '@app/lib/s3/keys';
import { addGenerateRecipeOgJob } from '@worker/queues';
import { prisma } from '@shared/prisma';

// ---------------------------------------------------------------------------
// Approve
// ---------------------------------------------------------------------------

/** Move recipe hero image from uploads/ → approved/, update imageKey, queue OG. */
export async function approveRecipeImage(recipeId: string, uploadedKey: string): Promise<string> {
    if (!uploadedKey.startsWith('uploads/')) return uploadedKey;
    const ext = uploadedKey.split('.').pop() ?? 'jpg';
    const destKey = approvedKey('recipe', recipeId, ext);
    await moveObject(uploadedKey, destKey);
    await prisma.recipe.update({ where: { id: recipeId }, data: { imageKey: destKey } });
    addGenerateRecipeOgJob(recipeId, destKey).catch((err) =>
        console.error('[image-approval] OG job failed', err),
    );
    return destKey;
}

/**
 * Approve a recipe image when we only have the upload key (moderation queue).
 * Looks up which recipe currently holds this key.
 */
export async function approveRecipeImageByKey(uploadedKey: string): Promise<string | null> {
    if (!uploadedKey.startsWith('uploads/')) return uploadedKey;
    const recipe = await prisma.recipe.findFirst({
        where: { imageKey: uploadedKey },
        select: { id: true },
    });
    if (!recipe) return null;
    return approveRecipeImage(recipe.id, uploadedKey);
}

/** Move comment image from uploads/ → approved/, update imageKey. */
export async function approveCommentImage(commentId: string, uploadedKey: string): Promise<string> {
    if (!uploadedKey.startsWith('uploads/')) return uploadedKey;
    const ext = uploadedKey.split('.').pop() ?? 'jpg';
    const destKey = approvedKey('comment', commentId, ext);
    await moveObject(uploadedKey, destKey);
    await prisma.comment.update({ where: { id: commentId }, data: { imageKey: destKey } });
    return destKey;
}

/** Move cook image from uploads/ → approved/, update imageKey. */
export async function approveCookImage(cookImageId: string, uploadedKey: string): Promise<string> {
    if (!uploadedKey.startsWith('uploads/')) return uploadedKey;
    const ext = uploadedKey.split('.').pop() ?? 'jpg';
    const destKey = approvedKey('cook', cookImageId, ext);
    await moveObject(uploadedKey, destKey);
    await prisma.cookImage.update({ where: { id: cookImageId }, data: { imageKey: destKey } });
    return destKey;
}

/**
 * Move a step image from uploads/ → approved/step/{filename}.
 * Uses filename as unique path segment (no entity ID needed).
 */
export async function approveStepImage(uploadedKey: string): Promise<string> {
    if (!uploadedKey.startsWith('uploads/')) return uploadedKey;
    const filename = uploadedKey.split('/').pop() ?? uploadedKey;
    const destKey = `approved/step/${filename}`;
    await moveObject(uploadedKey, destKey);
    await prisma.recipeStepImage.updateMany({
        where: { photoKey: uploadedKey },
        data: { photoKey: destKey },
    });
    return destKey;
}

/** Move profile photo from uploads/ → approved/, update photoKey. */
export async function approveProfileImage(authorId: string, uploadedKey: string): Promise<string> {
    if (!uploadedKey.startsWith('uploads/')) return uploadedKey;
    const ext = uploadedKey.split('.').pop() ?? 'jpg';
    const destKey = approvedKey('profile', authorId, ext);
    await moveObject(uploadedKey, destKey);
    await prisma.profile.updateMany({
        where: { photoKey: uploadedKey },
        data: { photoKey: destKey },
    });
    return destKey;
}

// ---------------------------------------------------------------------------
// Reject
// ---------------------------------------------------------------------------

/** Move recipe image to trash, clear imageKey on the recipe. */
export async function rejectRecipeImageByKey(uploadedKey: string): Promise<void> {
    await moveObject(uploadedKey, trashKeyFrom(uploadedKey));
    await prisma.recipe.updateMany({
        where: { imageKey: uploadedKey },
        data: { imageKey: null },
    });
}

/** Move comment image to trash. */
export async function rejectCommentImage(uploadedKey: string): Promise<void> {
    await moveObject(uploadedKey, trashKeyFrom(uploadedKey));
}

/** Move cook image to trash. */
export async function rejectCookImage(uploadedKey: string): Promise<void> {
    await moveObject(uploadedKey, trashKeyFrom(uploadedKey));
}

/** Move step image to trash, delete the RecipeStepImage row. */
export async function rejectStepImage(uploadedKey: string): Promise<void> {
    await prisma.recipeStepImage.deleteMany({ where: { photoKey: uploadedKey } });
    await moveObject(uploadedKey, trashKeyFrom(uploadedKey));
}

/** Move profile photo to trash, clear photoKey. */
export async function rejectProfileImage(uploadedKey: string): Promise<void> {
    await moveObject(uploadedKey, trashKeyFrom(uploadedKey));
    await prisma.profile.updateMany({
        where: { photoKey: uploadedKey },
        data: { photoKey: null },
    });
}
