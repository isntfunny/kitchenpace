import type { RecipeSortOption } from '@app/lib/recipeFilters';

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

export function cosine(a: readonly number[], b: readonly number[]): number {
    if (a.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function hasTasteProfile(taste: readonly number[] | null | undefined): boolean {
    return !!taste && taste.length > 0 && taste.some((value) => value !== 0);
}

/**
 * Resolves the sort that is actually applied.
 * `taste` needs a logged-in user with a taste profile; otherwise it falls back to `popular`
 * (no error, also for `?sort=taste` called by a guest).
 */
export function resolveEffectiveSort(
    sort: RecipeSortOption,
    options: { isLoggedIn: boolean; hasTasteProfile?: boolean },
): RecipeSortOption {
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
