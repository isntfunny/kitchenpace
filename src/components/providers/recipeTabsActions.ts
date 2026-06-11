'use server';

import { getServerAuthSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { fetchRecipeTabs } from '@app/lib/recipe-tabs/queries';
import { MAX_PINNED, MAX_RECENT, type RecipeTabsData } from '@app/lib/recipe-tabs/types';
import { prisma } from '@shared/prisma';

async function requireAuth(context: string): Promise<string> {
    const session = await getServerAuthSession(context);
    if (!session?.user?.id) {
        throw new Error('NOT_AUTHENTICATED');
    }
    return session.user.id;
}

export async function refreshRecipeTabsAction(): Promise<RecipeTabsData> {
    const userId = await requireAuth('action/recipe-tabs:refresh');
    return fetchRecipeTabs(userId);
}

export async function addToRecentAction(recipeId: string, source?: string | null): Promise<void> {
    const userId = await requireAuth('action/recipe-tabs:addRecent');

    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true },
    });
    if (!recipe) return;

    await prisma.userViewHistory.upsert({
        where: { userId_recipeId: { userId, recipeId } },
        update: { viewedAt: new Date(), ...(source ? { source } : {}) },
        create: { userId, recipeId, ...(source ? { source } : {}) },
    });
}

/**
 * Pins a recipe. When all slots are taken, the oldest pin is replaced
 * so pinning never fails silently for the user.
 */
export async function pinRecipeAction(recipeId: string): Promise<RecipeTabsData> {
    const userId = await requireAuth('action/recipe-tabs:pin');

    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true },
    });
    if (!recipe) {
        throw new Error('Recipe not found');
    }

    await prisma.$transaction(async (tx) => {
        const existing = await tx.pinnedFavorite.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });

        if (existing.some((pin) => pin.recipeId === recipeId)) return;

        if (existing.length >= MAX_PINNED) {
            await tx.pinnedFavorite.delete({ where: { id: existing[0].id } });
            existing.shift();
        }

        const usedSlots = new Set(existing.map((pin) => pin.position));
        const position =
            Array.from({ length: MAX_PINNED }, (_, slot) => slot).find(
                (slot) => !usedSlots.has(slot),
            ) ?? 0;

        await tx.pinnedFavorite.create({ data: { userId, recipeId, position } });
    });

    logAuth('info', 'pinRecipeAction: pinned recipe', { userId, recipeId });

    return fetchRecipeTabs(userId);
}

export async function unpinRecipeAction(recipeId: string): Promise<RecipeTabsData> {
    const userId = await requireAuth('action/recipe-tabs:unpin');

    await prisma.pinnedFavorite.deleteMany({ where: { userId, recipeId } });

    logAuth('info', 'unpinRecipeAction: removed pinned recipe', { userId, recipeId });

    return fetchRecipeTabs(userId);
}

/**
 * Imports guest data (localStorage) after sign-in. Recent views get
 * staggered timestamps so their order survives; guest pins only fill
 * slots that aren't already taken by server-side pins.
 */
export async function migrateGuestTabsAction(input: {
    recentIds: string[];
    pinnedIds: string[];
}): Promise<RecipeTabsData> {
    const userId = await requireAuth('action/recipe-tabs:migrate');

    const recentIds = input.recentIds.slice(0, MAX_RECENT);
    const pinnedIds = input.pinnedIds.slice(0, MAX_PINNED);

    const candidateIds = [...new Set([...recentIds, ...pinnedIds])];
    const existingRecipes = await prisma.recipe.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true },
    });
    const validIds = new Set(existingRecipes.map((recipe) => recipe.id));

    // recentIds[0] is the newest view — stagger timestamps backwards from now
    const now = Date.now();
    for (const [index, recipeId] of recentIds.entries()) {
        if (!validIds.has(recipeId)) continue;
        const viewedAt = new Date(now - index * 1000);
        await prisma.userViewHistory.upsert({
            where: { userId_recipeId: { userId, recipeId } },
            update: { viewedAt },
            create: { userId, recipeId, viewedAt },
        });
    }

    const validPinnedIds = pinnedIds.filter((recipeId) => validIds.has(recipeId));
    if (validPinnedIds.length > 0) {
        await prisma.$transaction(async (tx) => {
            const existing = await tx.pinnedFavorite.findMany({ where: { userId } });
            const alreadyPinned = new Set(existing.map((pin) => pin.recipeId));
            const usedSlots = new Set(existing.map((pin) => pin.position));

            for (const recipeId of validPinnedIds) {
                if (alreadyPinned.has(recipeId)) continue;
                const slot = Array.from({ length: MAX_PINNED }, (_, s) => s).find(
                    (s) => !usedSlots.has(s),
                );
                if (slot === undefined) break;
                usedSlots.add(slot);
                await tx.pinnedFavorite.create({ data: { userId, recipeId, position: slot } });
            }
        });
    }

    logAuth('info', 'migrateGuestTabsAction: imported guest tabs', {
        userId,
        recent: recentIds.length,
        pinned: validPinnedIds.length,
    });

    return fetchRecipeTabs(userId);
}
