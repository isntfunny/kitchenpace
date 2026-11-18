'use server';

import { revalidatePath } from 'next/cache';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import {
    mergeIngredientGroup,
    previewIngredientGroupMerge,
    type MergeGroupPreview,
} from '@app/lib/ingredients/merge-group';
import {
    IngredientShelfLifeInputSchema,
    STORAGE_TYPES,
    type IngredientShelfLifeInput,
} from '@shared/ingredient-shelf-life/schema';
import { OPENSEARCH_INGREDIENTS_INDEX, opensearchClient } from '@shared/opensearch/client';
import { prisma } from '@shared/prisma';

// ── Shelf life (KUC-94) ─────────────────────────────────────────────────

/**
 * Saves the admin form. Only if a value actually changed, the ingredient gets
 * shelfLifeSource MANUAL, so the AI never overwrites it again.
 */
export async function updateIngredientShelfLife(id: string, input: IngredientShelfLifeInput) {
    await ensureModeratorSession('update-ingredient-shelf-life');
    const parsed = IngredientShelfLifeInputSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
    }
    const value = parsed.data;

    await prisma.$transaction(async (tx) => {
        const current = await tx.ingredient.findUnique({
            where: { id },
            select: {
                defaultStorage: true,
                openedShelfLifeDays: true,
                openSensitive: true,
                packSize: true,
                packUnit: true,
                storageLives: { select: { storage: true, days: true } },
            },
        });
        if (!current) throw new Error('Zutat nicht gefunden');

        const currentDays = (storage: (typeof STORAGE_TYPES)[number]) =>
            current.storageLives.find((life) => life.storage === storage)?.days ?? null;
        const changed =
            STORAGE_TYPES.some((storage) => currentDays(storage) !== value.storageDays[storage]) ||
            current.defaultStorage !== value.defaultStorage ||
            current.openedShelfLifeDays !== value.openedShelfLifeDays ||
            current.openSensitive !== value.openSensitive ||
            current.packSize !== value.packSize ||
            current.packUnit !== value.packUnit;
        if (!changed) return;

        await tx.ingredient.update({
            where: { id },
            data: {
                defaultStorage: value.defaultStorage,
                openedShelfLifeDays: value.openedShelfLifeDays,
                openSensitive: value.openSensitive,
                packSize: value.packSize,
                packUnit: value.packUnit,
                shelfLifeSource: 'MANUAL',
                shelfLifeConfidence: null,
            },
        });
        await tx.ingredientStorageLife.deleteMany({ where: { ingredientId: id } });
        const rows = STORAGE_TYPES.flatMap((storage) => {
            const days = value.storageDays[storage];
            return days == null ? [] : [{ ingredientId: id, storage, days }];
        });
        if (rows.length > 0) await tx.ingredientStorageLife.createMany({ data: rows });
    });

    revalidatePath('/admin/ingredients');
}

// ── Duplicate groups (KUC-114) ──────────────────────────────────────────

export async function previewDuplicateMerge(
    keepId: string,
    mergeIds: string[],
): Promise<MergeGroupPreview> {
    await ensureModeratorSession('preview-ingredient-merge');
    return prisma.$transaction((tx) => previewIngredientGroupMerge(tx, keepId, mergeIds));
}

/** Search index follow-up; failures are logged, the merge itself is committed. */
async function syncSearchAfterMerge(keepId: string, mergedIds: string[], aliases: string[]) {
    try {
        await opensearchClient.bulk({
            body: mergedIds.map((id) => ({
                delete: { _index: OPENSEARCH_INGREDIENTS_INDEX, _id: id },
            })),
        });
        const doc = await opensearchClient.get({ index: OPENSEARCH_INGREDIENTS_INDEX, id: keepId });
        const source = (doc.body._source ?? {}) as { keywords?: string[] };
        await opensearchClient.update({
            index: OPENSEARCH_INGREDIENTS_INDEX,
            id: keepId,
            body: {
                doc: {
                    aliases,
                    keywords: Array.from(new Set([...(source.keywords ?? []), ...aliases])),
                },
            },
        });
    } catch (error) {
        console.error('[merge-duplicates] ingredient index update failed', error);
    }
}

export async function mergeDuplicateGroup(keepId: string, mergeIds: string[]) {
    const session = await ensureAdminSession('merge-ingredient-group');

    const result = await prisma.$transaction(async (tx) => {
        const merged = await mergeIngredientGroup(tx, keepId, mergeIds);
        const keep = await tx.ingredient.findUniqueOrThrow({
            where: { id: keepId },
            select: { name: true, normalizedName: true },
        });
        await tx.moderationLog.create({
            data: {
                actorId: session.user.id,
                action: 'merge_ingredients',
                contentType: 'ingredient',
                contentId: keepId,
                reason: `Duplikate von „${keep.normalizedName ?? keep.name}“ zusammengeführt`,
                metadata: JSON.parse(JSON.stringify({ keep, ...merged })),
            },
        });
        return merged;
    });

    await syncSearchAfterMerge(
        keepId,
        result.merged.map((entry) => entry.id),
        result.aliases,
    );
    // Recipe documents list ingredient names; refresh the affected ones
    import('@worker/queues')
        .then(({ addSyncRecipeJob }) =>
            Promise.all(result.affectedRecipeIds.map((recipeId) => addSyncRecipeJob(recipeId))),
        )
        .catch((error) => console.error('[merge-duplicates] enqueue recipe sync failed', error));

    revalidatePath('/admin/ingredients');
    return {
        merged: result.merged.length,
        affectedRecipes: result.affectedRecipeIds.length,
    };
}
