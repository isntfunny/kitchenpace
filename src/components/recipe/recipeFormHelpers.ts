import { fireEvent } from '@app/lib/events/fire';
import { moveObject } from '@app/lib/s3';
import { approvedKey } from '@app/lib/s3/keys';
import { formatValidationErrors, validateFlow } from '@app/lib/validation/flowValidation';
import { prisma } from '@shared/prisma';

import type { FlowEdgeInput, FlowNodeInput } from './recipeFormTypes';

/**
 * Extract all user-generated text from a recipe for content moderation
 */
export function extractRecipeText(data: {
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

export function assertPublishableFlow(data: {
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

export function assertStoredRecipeCanBePublished(recipe: {
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

/** Strip photoKey from nodes before writing to the flowNodes JSON column.
 *  Photos are stored in RecipeStepImage instead. */
export function stripPhotoKeys(nodes: FlowNodeInput[]): object {
    return nodes.map(({ photoKey: _, ...n }) => n) as unknown as object;
}

/** Sync RecipeStepImage rows for a recipe after create/update. */
export async function syncStepImages(recipeId: string, nodes: FlowNodeInput[]): Promise<void> {
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

/** Move recipe image from uploads/ to approved/ and update DB. Returns final key. */
export async function moveRecipeImage(recipeId: string, imageKey: string): Promise<string> {
    const ext = imageKey.split('.').pop() ?? 'jpg';
    const destKey = approvedKey('recipe', recipeId, ext);
    try {
        await moveObject(imageKey, destKey);
    } catch (err: unknown) {
        const s3Err = err as { Code?: string };
        if (s3Err.Code !== 'NoSuchKey') throw err;
        // File was already moved on a previous save — just fix the DB key
    }
    await prisma.recipe.update({ where: { id: recipeId }, data: { imageKey: destKey } });
    return destKey;
}

export async function sendNotificationsToFollowers(
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
