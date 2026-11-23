import type { RecipeSortOption } from '@shared/recipe-filters';
import { cosine } from '@shared/recipe-ranking/vector';

/**
 * Taste ranking ("Passt zu dir"): re-ranks a candidate pool by cosine similarity between
 * the user's `Profile.tasteEmbedding` and each recipe's `RecipeEmbedding`.
 *
 * Everything in this file is pure (no DB, no OpenAI) so it can be reused by the recipe
 * search, the inspiration strip (KUC-112) and the week planner (KUC-113). The DB-backed
 * wrapper lives in `taste-ranking.server.ts`.
 */

/** Max. number of candidates that are re-ranked (after all other filters). */
export const TASTE_POOL_SIZE = 200;

/** Score for candidates without an embedding: they rank after every scored candidate. */
export const MISSING_EMBEDDING_SCORE = -2;

/**
 * Resolves the sort that is actually applied.
 * `taste` needs a logged-in user with a taste profile; otherwise it falls back to `popular`
 * (no error, also for `?sort=taste` called by a guest).
 */
export function resolveEffectiveSort(
    sort: RecipeSortOption,
    options: { isLoggedIn: boolean; hasTasteProfile?: boolean; hasPantry?: boolean },
): RecipeSortOption {
    // "Passt zu deiner Woche" works without a taste profile (neutral taste), not for guests
    if (sort === 'week') return options.isLoggedIn ? 'week' : 'popular';
    // "Verbraucht meine Reste" (KUC-132) needs a logged-in user with a pantry
    if (sort === 'leftovers') {
        if (!options.isLoggedIn) return 'popular';
        return options.hasPantry === false ? 'rating' : 'leftovers';
    }
    if (sort !== 'taste') return sort;
    if (!options.isLoggedIn) return 'popular';
    if (options.hasTasteProfile === false) return 'popular';
    return 'taste';
}

export type TasteScored<T> = { item: T; score: number };

/**
 * Scores and sorts candidates by taste similarity, descending. Ties keep the incoming order
 * (stable), so a pre-sorted pool (e.g. by rating) stays the tie-breaker.
 */
export function rankByTaste<T>(
    candidates: readonly T[],
    taste: readonly number[],
    getEmbedding: (candidate: T) => readonly number[] | null | undefined,
): TasteScored<T>[] {
    const scored = candidates.map((item, index) => {
        const embedding = getEmbedding(item);
        const score =
            embedding && embedding.length > 0 ? cosine(taste, embedding) : MISSING_EMBEDDING_SCORE;
        return { item, score, index };
    });

    scored.sort((a, b) => b.score - a.score || a.index - b.index);
    return scored.map(({ item, score }) => ({ item, score }));
}

/** Slice of a ranked list for pagination (page is 1-based). */
export function paginate<T>(items: readonly T[], page: number, limit: number): T[] {
    const from = Math.max(0, page - 1) * limit;
    return items.slice(from, from + limit);
}
