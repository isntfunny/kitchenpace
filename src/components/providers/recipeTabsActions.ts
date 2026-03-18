'use server';

import {
    fetchPinnedEntries,
    isPinnedTableMissingError,
    markHistoryPinned,
    MAX_PINNED,
    type RecipeSummary,
} from '@app/app/api/recipe-tabs/helpers';
import { getServerAuthSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { prisma } from '@shared/prisma';

const MAX_RECENT = 5;
const SIGNIN_ERROR = new Error('NOT_AUTHENTICATED');

async function requireAuth(context: string) {
    const session = await getServerAuthSession(context);
    if (!session?.user?.id) {
        throw SIGNIN_ERROR;
    }
    return session.user.id;
}

type TabsResult = {
    pinned: RecipeSummary[];
    recent: RecipeSummary[];
};

async function fetchTabsData(userId: string): Promise<TabsResult> {
    const [{ entries: pinned }, recentViews] = await Promise.all([
        fetchPinnedEntries(userId),
        prisma.userViewHistory.findMany({
            where: { userId },
            include: {
                recipe: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        imageKey: true,
                        prepTime: true,
                        cookTime: true,
                        difficulty: true,
                    },
                },
            },
            orderBy: { viewedAt: 'desc' },
            take: MAX_RECENT + 3,
        }),
    ]);

    const pinnedIds = new Set(pinned.map((p) => p.id));

    const recent = recentViews
        .filter((view) => !pinnedIds.has(view.recipe.id))
        .slice(0, MAX_RECENT)
        .map((view, index) => ({
            id: view.recipe.id,
            title: view.recipe.title,
            slug: view.recipe.slug ?? undefined,
            imageKey: view.recipe.imageKey,
            prepTime: view.recipe.prepTime ?? undefined,
            cookTime: view.recipe.cookTime ?? undefined,
            difficulty: view.recipe.difficulty ?? undefined,
            position: index,
        }));

    return { pinned, recent };
}

export async function refreshRecipeTabsAction(): Promise<TabsResult> {
    const userId = await requireAuth('action/recipe-tabs:refresh');
    return fetchTabsData(userId);
}

export async function pinRecipeAction(recipeId: string): Promise<TabsResult> {
    const userId = await requireAuth('action/recipe-tabs:pin');

    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true },
    });

    if (!recipe) {
        throw new Error('Recipe not found');
    }

    const { entries: existingPinned, source } = await fetchPinnedEntries(userId);

    if (!existingPinned.some((entry) => entry.id === recipeId)) {
        if (existingPinned.length >= MAX_PINNED) {
            throw new Error(`Maximum ${MAX_PINNED} pinned recipes allowed`);
        }

        if (source === 'table') {
            const usedSlots = new Set(existingPinned.map((entry) => entry.position));
            const availablePosition = [0, 1, 2].find((slot) => !usedSlots.has(slot)) ?? 0;

            await prisma.pinnedFavorite.create({
                data: { userId, recipeId, position: availablePosition },
            });

            await markHistoryPinned(userId, recipeId, true);
        } else {
            await markHistoryPinned(userId, recipeId, true);
        }

        logAuth('info', 'pinRecipeAction: pinned recipe', { userId, recipeId });
    }

    return fetchTabsData(userId);
}

export async function unpinRecipeAction(recipeId: string): Promise<TabsResult> {
    const userId = await requireAuth('action/recipe-tabs:unpin');

    try {
        const pinned = await prisma.pinnedFavorite.findUnique({
            where: { userId_recipeId: { userId, recipeId } },
        });

        if (pinned) {
            await prisma.pinnedFavorite.delete({ where: { id: pinned.id } });
        }

        await markHistoryPinned(userId, recipeId, false);
    } catch (error) {
        if (isPinnedTableMissingError(error)) {
            await markHistoryPinned(userId, recipeId, false);
        } else {
            throw error;
        }
    }

    logAuth('info', 'unpinRecipeAction: removed pinned recipe', { userId, recipeId });

    return fetchTabsData(userId);
}

export async function addToRecentAction(recipeId: string): Promise<void> {
    const userId = await requireAuth('action/recipe-tabs:addRecent');

    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true },
    });

    if (!recipe) return;

    const history = await prisma.userViewHistory.findFirst({
        where: { userId, recipeId },
    });

    if (history) {
        await prisma.userViewHistory.update({
            where: { id: history.id },
            data: { viewedAt: new Date() },
        });
    } else {
        await prisma.userViewHistory.create({
            data: { userId, recipeId, viewedAt: new Date() },
        });
    }
}

export async function migrateLocalRecipesAction(recipeIds: string[]): Promise<TabsResult> {
    const userId = await requireAuth('action/recipe-tabs:migrate');

    for (const recipeId of recipeIds.slice(0, MAX_RECENT)) {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { id: true },
        });

        if (!recipe) continue;

        const history = await prisma.userViewHistory.findFirst({
            where: { userId, recipeId },
        });

        if (history) {
            await prisma.userViewHistory.update({
                where: { id: history.id },
                data: { viewedAt: new Date() },
            });
        } else {
            await prisma.userViewHistory.create({
                data: { userId, recipeId, viewedAt: new Date() },
            });
        }
    }

    return fetchTabsData(userId);
}
