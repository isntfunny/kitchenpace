// Ranked order for the sorts "Passt zu dir" (taste) and "Passt zu deiner Woche" (week),
// KUC-126. Pure orchestration: OpenSearch kNN, the DB loader and the DB cosine fallback come
// in as `deps`, so this file has no server imports and is unit-tested with fakes.
import type { Season } from '@app/lib/fits-now/labels';
import { RANKING_CONFIG } from '@shared/recipe-ranking/config';
import type { RankingRecipe } from '@shared/recipe-ranking/features';
import { diversify } from '@shared/recipe-ranking/mmr';
import { scoreCandidates } from '@shared/recipe-ranking/score';
import { searchVector } from '@shared/recipe-ranking/vector';

export type RankDeps = {
    /** kNN on the stored recipe embeddings, restricted to `allowedIds` */
    knn(vector: number[], k: number, allowedIds: string[]): Promise<string[]>;
    load(ids: string[]): Promise<Map<string, RankingRecipe>>;
    /** Cosine to the taste profile over the DB; null without a profile */
    tasteFallback(ids: string[]): Promise<{ id: string; score: number }[] | null>;
};

export type RankInput = {
    /** All ids matching the filters, best rated first */
    idsByRating: string[];
    profile: number[] | null;
    picks: RankingRecipe[];
    excludeIds: string[];
    expiring: { id: string; name: string }[];
    season: Season;
    withReasons: boolean;
    globalMean: number;
};

/** Candidates scored without a search vector (no profile, no picks) */
const POOL_WITHOUT_VECTOR = 300;

export async function rankedSearch(
    input: RankInput,
    deps: RankDeps,
): Promise<{ id: string; reason?: string }[]> {
    const excluded = new Set(input.excludeIds);
    const allowed = input.idsByRating.filter((id) => !excluded.has(id));
    if (allowed.length === 0) return [];

    const pickVectors = input.picks.flatMap((p) => (p.embedding ? [p.embedding] : []));
    const vector = searchVector(input.profile, pickVectors);

    let poolIds: string[];
    if (vector) {
        try {
            const allowedSet = new Set(allowed);
            poolIds = (await deps.knn(vector, RANKING_CONFIG.knnK, allowed)).filter((id) =>
                allowedSet.has(id),
            );
        } catch {
            // kNN index unreachable: cosine over the DB (profile), else the rating order
            const ranked = input.profile ? await deps.tasteFallback(allowed) : null;
            poolIds = (ranked?.map((r) => r.id) ?? allowed).slice(0, RANKING_CONFIG.knnK);
        }
    } else {
        poolIds = allowed.slice(0, POOL_WITHOUT_VECTOR);
    }

    // Fill up with the best rated ones (also recipes without an embedding)
    if (poolIds.length < RANKING_CONFIG.listSize) {
        const inPool = new Set(poolIds);
        for (const id of allowed) {
            if (poolIds.length >= RANKING_CONFIG.listSize) break;
            if (!inPool.has(id)) poolIds.push(id);
        }
    }

    const loaded = await deps.load(poolIds);
    const pool = poolIds.flatMap((id) => {
        const recipe = loaded.get(id);
        return recipe ? [recipe] : [];
    });

    const scored = scoreCandidates(pool, {
        profile: input.profile,
        picks: input.picks,
        season: input.season,
        globalMean: input.globalMean,
        expiring: input.expiring,
        withReasons: input.withReasons,
    });
    return diversify(scored, loaded, input.picks).map(({ id, reason }) => ({ id, reason }));
}
