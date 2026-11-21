import { prisma } from '@shared/prisma';

import { hasTasteProfile, rankByTaste } from './taste-ranking';

/** Loads `Profile.tasteEmbedding`; `null` when the user has no (usable) taste profile. */
export async function loadTasteEmbedding(userId: string): Promise<number[] | null> {
    const profile = await prisma.profile.findFirst({
        where: { userId },
        select: { tasteEmbedding: true },
    });
    const taste = profile?.tasteEmbedding;
    return taste && hasTasteProfile(taste) ? taste : null;
}

/**
 * Reusable taste ranking: returns the given recipe ids ordered by similarity to the user's
 * taste profile (best first), or `null` when the user has no taste profile.
 * Recipes without an embedding come last in their incoming order.
 * Uses existing embeddings only, no OpenAI calls.
 */
export async function rankRecipeIdsByTaste(
    userId: string,
    recipeIds: readonly string[],
    options?: { taste?: number[] },
): Promise<{ id: string; score: number }[] | null> {
    if (recipeIds.length === 0) return [];

    const taste = options?.taste ?? (await loadTasteEmbedding(userId));
    if (!taste) return null;

    const embeddings = await prisma.recipeEmbedding.findMany({
        where: { recipeId: { in: [...recipeIds] } },
        select: { recipeId: true, embedding: true },
    });
    const byId = new Map(embeddings.map((entry) => [entry.recipeId, entry.embedding]));

    return rankByTaste(recipeIds, taste, (id) => byId.get(id)).map(({ item, score }) => ({
        id: item,
        score,
    }));
}
