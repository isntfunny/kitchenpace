import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export type RecipeSummary = {
    id: string;
    title: string;
    slug?: string;
    imageUrl?: string;
    prepTime?: number;
    cookTime?: number;
    difficulty?: string;
    position: number;
};

export const MAX_PINNED = 3;

function mapRecipeToSummary(
    recipe: {
        id: string;
        title: string;
        slug?: string | null;
        imageUrl?: string | null;
        prepTime?: number | null;
        cookTime?: number | null;
        difficulty?: string | null;
    },
    position: number,
): RecipeSummary {
    return {
        id: recipe.id,
        title: recipe.title,
        slug: recipe.slug ?? undefined,
        imageUrl: recipe.imageUrl ?? undefined,
        prepTime: recipe.prepTime ?? undefined,
        cookTime: recipe.cookTime ?? undefined,
        difficulty: recipe.difficulty ?? undefined,
        position,
    };
}

export function isPinnedTableMissingError(
    error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
}

async function fetchPinnedFavoritesFromTable(userId: string): Promise<RecipeSummary[]> {
    const entries = await prisma.pinnedFavorite.findMany({
        where: { userId },
        include: {
            recipe: {
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    imageUrl: true,
                    prepTime: true,
                    cookTime: true,
                    difficulty: true,
                },
            },
        },
        orderBy: { position: 'asc' },
    });

    return entries.map((entry) => mapRecipeToSummary(entry.recipe, entry.position));
}

async function fetchPinnedFavoritesFromHistory(userId: string): Promise<RecipeSummary[]> {
    const history = await prisma.userViewHistory.findMany({
        where: { userId, pinned: true },
        include: {
            recipe: {
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    imageUrl: true,
                    prepTime: true,
                    cookTime: true,
                    difficulty: true,
                },
            },
        },
        orderBy: { viewedAt: 'desc' },
        take: MAX_PINNED,
    });

    return history.map((entry, index) => mapRecipeToSummary(entry.recipe, index));
}

export async function fetchPinnedEntries(userId: string): Promise<{
    entries: RecipeSummary[];
    source: 'table' | 'history';
}> {
    try {
        const entries = await fetchPinnedFavoritesFromTable(userId);
        return { entries, source: 'table' };
    } catch (error) {
        if (isPinnedTableMissingError(error)) {
            const entries = await fetchPinnedFavoritesFromHistory(userId);
            return { entries, source: 'history' };
        }
        throw error;
    }
}

export async function fetchPinnedIds(userId: string) {
    const { entries } = await fetchPinnedEntries(userId);
    return new Set(entries.map((entry) => entry.id));
}

export async function markHistoryPinned(userId: string, recipeId: string, pinned: boolean) {
    const history = await prisma.userViewHistory.findFirst({
        where: { userId, recipeId },
    });

    if (history) {
        await prisma.userViewHistory.update({
            where: { id: history.id },
            data: { pinned, viewedAt: new Date() },
        });
        return;
    }

    await prisma.userViewHistory.create({
        data: {
            userId,
            recipeId,
            viewedAt: new Date(),
            pinned,
        },
    });
}

export async function countPinnedHistory(userId: string) {
    return prisma.userViewHistory.count({
        where: { userId, pinned: true },
    });
}
