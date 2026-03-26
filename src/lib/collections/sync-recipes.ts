import type { CollectionRecipeRole } from '@prisma/client';

import { createUserNotification } from '@app/lib/events/persist';
import { prisma } from '@shared/prisma';

import { extractRecipeIdsFromBlocks } from './extract-recipe-ids';
import type { TiptapJSON } from './types';

const MAX_COLLECTION_RECIPES = 50;

export async function syncCollectionRecipes(
    collectionId: string,
    blocks: TiptapJSON | null | undefined,
): Promise<void> {
    if (!blocks) {
        await prisma.collectionRecipe.deleteMany({ where: { collectionId } });
        return;
    }

    const rawIds = extractRecipeIdsFromBlocks(blocks).slice(0, MAX_COLLECTION_RECIPES);

    // Validate IDs exist as published recipes
    const existingRecipes = await prisma.recipe.findMany({
        where: { id: { in: rawIds }, status: 'PUBLISHED' },
        select: { id: true },
    });
    const validIds = new Set(existingRecipes.map((r) => r.id));

    const entries = rawIds
        .filter((id) => validIds.has(id))
        .map((recipeId, index) => ({
            collectionId,
            recipeId,
            position: index,
            role: inferRoleFromBlocks(blocks, recipeId),
        }));

    await prisma.$transaction(async (tx) => {
        await tx.collectionRecipe.deleteMany({ where: { collectionId } });
        if (entries.length > 0) {
            await tx.collectionRecipe.createMany({ data: entries, skipDuplicates: true });
        }
    });
}

function inferRoleFromBlocks(blocks: TiptapJSON, recipeId: string): CollectionRecipeRole {
    let role: CollectionRecipeRole = 'INLINE';
    function walk(node: TiptapJSON) {
        const id = node.attrs?.recipeId;
        const ids = node.attrs?.recipeIds as string[] | undefined;
        const hasId = id === recipeId || ids?.includes(recipeId);
        if (hasId) {
            if (node.type === 'featuredTrio') role = 'HERO';
            else if (node.type === 'topList') role = 'SIDEBAR';
            else if (node.type === 'recipeSlider') role = 'GRID';
            else role = 'INLINE';
        }
        if (node.content) for (const child of node.content) walk(child);
    }
    walk(blocks);
    return role;
}

/**
 * When a recipe is deleted/unpublished, find all collections referencing it,
 * set them to draft (published: false), and notify the collection author.
 */
export async function handleOrphanedRecipeInCollections(recipeId: string): Promise<void> {
    const affected = await prisma.collectionRecipe.findMany({
        where: { recipeId },
        include: {
            collection: {
                select: { id: true, title: true, published: true, authorId: true },
            },
        },
    });

    if (affected.length === 0) return;

    // Get unique collections that are currently published
    const publishedCollections = new Map<string, { id: string; title: string; authorId: string }>();
    for (const cr of affected) {
        if (cr.collection.published && !publishedCollections.has(cr.collection.id)) {
            publishedCollections.set(cr.collection.id, {
                id: cr.collection.id,
                title: cr.collection.title,
                authorId: cr.collection.authorId,
            });
        }
    }

    const cols = [...publishedCollections.values()];

    await prisma.collection.updateMany({
        where: { id: { in: cols.map((c) => c.id) } },
        data: { published: false },
    });

    await Promise.all(
        cols.map((col) =>
            createUserNotification({
                userId: col.authorId,
                type: 'SYSTEM',
                title: 'Sammlung deaktiviert',
                message: `Ein Rezept in deiner Sammlung "${col.title}" wurde entfernt. Bitte pruefe und aktualisiere deine Sammlung.`,
                data: { collectionId: col.id },
            }).catch((err) => console.error('[collections] Failed to notify author:', err)),
        ),
    );
}
