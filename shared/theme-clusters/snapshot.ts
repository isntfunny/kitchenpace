/**
 * Mapping between a computed run and its stored snapshot (RecipeClusterRun / RecipeCluster /
 * RecipeClusterMember). Pure: the store only has to write and read these shapes.
 */
import type { ComputeResult, PreviousThemeCluster } from './compute';
import type { TermScore } from './profile';

export interface StoredTopTerms {
    tags: { name: string; share: number; score: number }[];
    categories: { name: string; share: number; score: number }[];
    /** Share of the cluster's recipes that the search filter finds */
    filterCoverage: number;
}

export interface ClusterSnapshot {
    key: string;
    label: string;
    centroid: number[];
    size: number;
    filterTags: string[];
    filterCategories: string[];
    topTerms: StoredTopTerms;
    eligible: boolean;
    members: { recipeId: string; similarity: number }[];
}

export interface RunSnapshot {
    run: {
        k: number;
        seed: number;
        model: string;
        recipeCount: number;
        iterations: number;
        /** Share of recipes that stayed in their stable cluster; null on the first run */
        stabilityRatio: number | null;
    };
    clusters: ClusterSnapshot[];
    /** Keys of the previous run's clusters that no cluster continues */
    retiredKeys: string[];
}

const round = (value: number) => Math.round(value * 1000) / 1000;
const toStored = (terms: readonly TermScore[]) =>
    terms.map((term) => ({ name: term.name, share: round(term.share), score: round(term.score) }));

/**
 * Builds the snapshot. A cluster that continues a previous one keeps its key, new clusters
 * get `newKey(index)`; keys are unique within the run.
 */
export function buildRunSnapshot(
    result: ComputeResult,
    meta: { seed: number; model: string; recipeCount: number },
    newKey: (index: number) => string,
): RunSnapshot {
    const used = new Set<string>();
    const clusters = result.clusters.map((cluster): ClusterSnapshot => {
        const base = cluster.continuesId ?? newKey(cluster.index);
        let key = base;
        // Terminates: every pass appends a larger counter to the same base
        for (let n = 2; used.has(key); n++) key = `${base}-${n}`;
        used.add(key);

        return {
            key,
            label: cluster.label,
            centroid: cluster.centroid,
            size: cluster.profile.size,
            filterTags: cluster.profile.filter.tags,
            filterCategories: cluster.profile.filter.categories,
            topTerms: {
                tags: toStored(cluster.profile.tags),
                categories: toStored(cluster.profile.categories),
                filterCoverage: round(cluster.profile.filterCoverage),
            },
            eligible: cluster.profile.eligible,
            members: cluster.recipeIds.map((recipeId, i) => ({
                recipeId,
                similarity: cluster.similarities[i],
            })),
        };
    });

    return {
        run: {
            k: result.k,
            seed: meta.seed,
            model: meta.model,
            recipeCount: meta.recipeCount,
            iterations: result.iterations,
            stabilityRatio: result.stability ? round(result.stability.ratio) : null,
        },
        clusters,
        retiredKeys: result.retiredPrevIds,
    };
}

export interface StoredClusterRow {
    key: string;
    label: string;
    centroid: number[];
    topTerms: unknown;
    members: { recipeId: string }[];
}

/** Dominant term names from the stored JSON (defensive: the column is untyped). */
export function termsFromStored(topTerms: unknown): string[] {
    if (!topTerms || typeof topTerms !== 'object') return [];
    const read = (value: unknown): { name: string; score: number }[] =>
        Array.isArray(value)
            ? value.filter(
                  (entry): entry is { name: string; score: number } =>
                      !!entry && typeof entry.name === 'string' && typeof entry.score === 'number',
              )
            : [];
    const stored = topTerms as Record<string, unknown>;
    // Same rule as dominantTermNames(): strongest five terms over tags and categories
    return [...read(stored.tags), ...read(stored.categories)]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((term) => term.name);
}

/** Previous clusters + recipe assignment (recipeId -> key) for matching the next run. */
export function previousFromRows(rows: readonly StoredClusterRow[]) {
    const clusters: PreviousThemeCluster[] = rows.map((row) => ({
        id: row.key,
        label: row.label,
        centroid: row.centroid,
        terms: termsFromStored(row.topTerms),
    }));
    const assignments = new Map<string, string>();
    for (const row of rows)
        for (const member of row.members) assignments.set(member.recipeId, row.key);
    return { clusters, assignments };
}
