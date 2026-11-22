/**
 * Stable assignment of clusters between two runs (by centroid similarity) plus
 * stability metrics. Pure functions.
 */
import { jaccard } from '../math';

import { cosineSimilarity, type Vector } from './kmeans';

export interface PreviousCluster {
    id: string;
    centroid: Vector;
}

export interface ClusterMatch {
    /** Index into the new clusters */
    nextIndex: number;
    /** Id of the previous cluster that continues here, null for a new cluster */
    prevId: string | null;
    similarity: number | null;
}

export interface MatchResult {
    matches: ClusterMatch[];
    /** Previous clusters that no new cluster continues */
    retiredPrevIds: string[];
}

/**
 * One-to-one matching: the globally most similar pairs win (greedy, deterministic
 * tie-breaks), pairs below `minSimilarity` stay unmatched.
 */
export function matchClusters(
    previous: readonly PreviousCluster[],
    next: readonly Vector[],
    options: { minSimilarity?: number } = {},
): MatchResult {
    const { minSimilarity = 0.8 } = options;

    const pairs: { prevIndex: number; nextIndex: number; similarity: number }[] = [];
    previous.forEach((prev, prevIndex) => {
        next.forEach((centroid, nextIndex) => {
            const similarity = cosineSimilarity(prev.centroid, centroid);
            if (similarity >= minSimilarity) pairs.push({ prevIndex, nextIndex, similarity });
        });
    });
    pairs.sort(
        (a, b) =>
            b.similarity - a.similarity || a.prevIndex - b.prevIndex || a.nextIndex - b.nextIndex,
    );

    const prevTaken = new Set<number>();
    const nextTaken = new Map<number, { prevIndex: number; similarity: number }>();
    for (const pair of pairs) {
        if (prevTaken.has(pair.prevIndex) || nextTaken.has(pair.nextIndex)) continue;
        prevTaken.add(pair.prevIndex);
        nextTaken.set(pair.nextIndex, pair);
    }

    const matches = next.map((_, nextIndex): ClusterMatch => {
        const hit = nextTaken.get(nextIndex);
        return hit
            ? {
                  nextIndex,
                  prevId: previous[hit.prevIndex].id,
                  similarity: hit.similarity,
              }
            : { nextIndex, prevId: null, similarity: null };
    });
    const retiredPrevIds = previous.filter((_, i) => !prevTaken.has(i)).map((prev) => prev.id);

    return { matches, retiredPrevIds };
}

/**
 * A continued cluster keeps its previous label while its dominant terms barely changed,
 * so labels do not flicker between runs.
 */
export function keepStableLabel(
    previous: { label: string; terms: readonly string[] },
    next: { label: string; terms: readonly string[] },
    minOverlap = 0.6,
): string {
    return jaccard(previous.terms, next.terms, { bothEmpty: 1 }) >= minOverlap
        ? previous.label
        : next.label;
}

export interface StabilityReport {
    compared: number;
    unchanged: number;
    /** unchanged / compared (1 when nothing to compare) */
    ratio: number;
}

/**
 * Share of recipes (present in both runs) that stay in the same stable cluster.
 * Both maps: recipeId -> stable cluster id.
 */
export function assignmentStability(
    previous: ReadonlyMap<string, string>,
    next: ReadonlyMap<string, string>,
): StabilityReport {
    let compared = 0;
    let unchanged = 0;
    for (const [recipeId, clusterId] of next) {
        const before = previous.get(recipeId);
        if (before === undefined) continue;
        compared++;
        if (before === clusterId) unchanged++;
    }
    return { compared, unchanged, ratio: compared === 0 ? 1 : unchanged / compared };
}
