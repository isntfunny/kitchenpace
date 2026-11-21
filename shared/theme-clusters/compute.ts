/**
 * One clustering run as a pure function: embeddings + recipe metadata (+ the previous
 * run's clusters) in, clusters with labels, filters and stable ids out.
 */
import { cosineSimilarity, kmeans, suggestClusterCount, type Vector } from './kmeans';
import { assignmentStability, keepStableLabel, matchClusters, type StabilityReport } from './match';
import { profileClusters, type ClusterMemberMeta, type ClusterProfile } from './profile';

export interface ClusterRecipeInput extends ClusterMemberMeta {
    embedding: Vector;
}

export interface PreviousThemeCluster {
    id: string;
    label: string;
    centroid: Vector;
    /** Dominant term names of the previous run (for label stabilisation) */
    terms: string[];
}

export interface ComputeOptions {
    /** Number of clusters, 0/undefined = automatic */
    k?: number;
    seed?: number;
    maxIterations?: number;
    /** Min. centroid similarity to continue a previous cluster */
    minSimilarity?: number;
    minClusterSize?: number;
    /** Previous assignment recipeId -> stable cluster id, for the stability metric */
    previousAssignments?: ReadonlyMap<string, string>;
}

export interface ComputedCluster {
    /** Position in this run */
    index: number;
    /** Id of the previous cluster this one continues, null = new cluster */
    continuesId: string | null;
    centroid: number[];
    label: string;
    profile: ClusterProfile;
    recipeIds: string[];
    /** Cosine similarity of each member to the centroid (same order as `recipeIds`) */
    similarities: number[];
}

export interface ComputeResult {
    clusters: ComputedCluster[];
    retiredPrevIds: string[];
    k: number;
    iterations: number;
    converged: boolean;
    /** Only set when previous assignments were given */
    stability: StabilityReport | null;
}

const termNames = (profile: ClusterProfile) =>
    [...profile.tags, ...profile.categories]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((term) => term.name);

export function computeThemeClusters(
    recipes: readonly ClusterRecipeInput[],
    previous: readonly PreviousThemeCluster[] = [],
    options: ComputeOptions = {},
): ComputeResult {
    // Input order decides tie-breaks: sort by id so a run does not depend on DB order
    const sorted = [...recipes].sort((a, b) => a.recipeId.localeCompare(b.recipeId));
    const k = options.k && options.k > 0 ? options.k : suggestClusterCount(sorted.length);

    const result = kmeans(
        sorted.map((recipe) => recipe.embedding),
        k,
        { seed: options.seed, maxIterations: options.maxIterations },
    );

    const members: ClusterRecipeInput[][] = result.centroids.map(() => []);
    sorted.forEach((recipe, i) => members[result.assignments[i]].push(recipe));

    const profiles = profileClusters(members, { minClusterSize: options.minClusterSize });
    const { matches, retiredPrevIds } = matchClusters(previous, result.centroids, {
        minSimilarity: options.minSimilarity,
    });
    const previousById = new Map(previous.map((cluster) => [cluster.id, cluster]));

    const clusters = result.centroids.map((centroid, index): ComputedCluster => {
        const profile = profiles[index];
        const match = matches[index];
        const before = match.prevId ? previousById.get(match.prevId) : undefined;
        if (before) {
            profile.label = keepStableLabel(
                { label: before.label, terms: before.terms },
                { label: profile.label, terms: termNames(profile) },
            );
        }
        return {
            index,
            continuesId: match.prevId,
            centroid,
            label: profile.label,
            profile,
            recipeIds: members[index].map((member) => member.recipeId),
            similarities: members[index].map(
                (member) =>
                    Math.round(cosineSimilarity(member.embedding, centroid) * 10000) / 10000,
            ),
        };
    });

    let stability: StabilityReport | null = null;
    if (options.previousAssignments) {
        const next = new Map<string, string>();
        for (const cluster of clusters) {
            // Brand-new clusters have no stable id yet: they never count as unchanged
            const key = cluster.continuesId ?? `new:${cluster.index}`;
            for (const recipeId of cluster.recipeIds) next.set(recipeId, key);
        }
        stability = assignmentStability(options.previousAssignments, next);
    }

    return {
        clusters,
        retiredPrevIds,
        k: result.centroids.length,
        iterations: result.iterations,
        converged: result.converged,
        stability,
    };
}

export { termNames as dominantTermNames };
