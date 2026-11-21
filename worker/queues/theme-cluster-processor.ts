import { Job } from 'bullmq';

import {
    computeThemeClusters,
    dominantTermNames,
    type ClusterRecipeInput,
    type PreviousThemeCluster,
} from '@shared/theme-clusters/compute';
import { clusterSearchHref } from '@shared/theme-clusters/href';
import type { StabilityReport } from '@shared/theme-clusters/match';
import { buildRunSnapshot, type RunSnapshot } from '@shared/theme-clusters/snapshot';

import { prisma } from './prisma';
import { prismaThemeClusterStore } from './theme-cluster-store';
import type { ClusterRecipeThemesJob } from './types';

console.log('[DEBUG] theme-cluster-processor.ts module loaded');

// ── Dependencies (injectable for unit tests) ────────────────────────────────

export interface ThemeClusterStore {
    /**
     * Clusters of the reference run (last approved, else last completed) for stable keys and
     * labels; empty on the first run.
     */
    loadPrevious(): Promise<{
        clusters: PreviousThemeCluster[];
        assignments: Map<string, string>;
    }>;
    /**
     * Writes the run as a COMPLETED snapshot. New clusters start inactive: they only become
     * visible once an admin approved the run (see `approveClusterRun`).
     */
    save(snapshot: RunSnapshot): Promise<{ runId: string }>;
    /** Records a FAILED run so the admin sees why no new snapshot appeared. */
    recordFailure(meta: { seed: number; k: number; error: string }): Promise<void>;
}

export interface LoadedRecipes {
    recipes: ClusterRecipeInput[];
    /** Embedding model of the clustered vectors */
    model: string;
}

export interface ThemeClusterReport {
    success: true;
    /** Id of the written snapshot run; null for dry runs and runs without enough data */
    runId: string | null;
    persisted: boolean;
    recipes: number;
    model?: string;
    clusters: number;
    iterations?: number;
    converged?: boolean;
    stability: StabilityReport | null;
    retiredClusters?: number;
    /** Label sample admins review before releasing a run */
    sample?: {
        key: string;
        label: string;
        size: number;
        eligible: boolean;
        continues: string | null;
        terms: string[];
        filterCoverage: number;
        href: string;
    }[];
}

export interface ThemeClusterDeps {
    store: ThemeClusterStore;
    loadRecipes: (job: Job<ClusterRecipeThemesJob>) => Promise<LoadedRecipes>;
    newKey: (index: number) => string;
}

// ── Data loading ────────────────────────────────────────────────────────────

const PAGE_SIZE = 500;

interface LoadedRow {
    recipe: ClusterRecipeInput;
    model: string;
}

/** Published recipes with their stored embedding, tag names and categories. No OpenAI calls. */
async function loadRecipes(job: Job<ClusterRecipeThemesJob>): Promise<LoadedRecipes> {
    const rows: LoadedRow[] = [];
    let cursor: string | undefined;

    while (true) {
        const page = await prisma.recipeEmbedding.findMany({
            where: { recipe: { status: 'PUBLISHED' } },
            select: {
                recipeId: true,
                embedding: true,
                model: true,
                recipe: {
                    select: {
                        tags: { select: { tag: { select: { name: true } } } },
                        categories: {
                            select: { category: { select: { slug: true, name: true } } },
                        },
                    },
                },
            },
            orderBy: { recipeId: 'asc' },
            take: PAGE_SIZE,
            ...(cursor ? { skip: 1, cursor: { recipeId: cursor } } : {}),
        });
        if (page.length === 0) break;
        cursor = page[page.length - 1].recipeId;

        for (const row of page) {
            if (row.embedding.length === 0) continue;
            rows.push({
                model: row.model,
                recipe: {
                    recipeId: row.recipeId,
                    embedding: row.embedding,
                    tags: row.recipe.tags.map((entry) => entry.tag.name),
                    categories: row.recipe.categories.map((entry) => entry.category),
                },
            });
        }
        await job.updateProgress(Math.min(50, Math.round(rows.length / 100)));
    }

    return keepDominantModel(rows);
}

/**
 * Embeddings of another model/dimension cannot be mixed: keep the most common
 * (model, dimension) pair. Ties resolve to the lexicographically smaller model.
 */
export function keepDominantModel(rows: LoadedRow[]): LoadedRecipes {
    const counts = new Map<string, number>();
    const keyOf = (row: LoadedRow) => `${row.model}|${row.recipe.embedding.length}`;
    for (const row of rows) counts.set(keyOf(row), (counts.get(keyOf(row)) ?? 0) + 1);

    let best: string | null = null;
    for (const [key, count] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
        if (best === null || count > counts.get(best)!) best = key;
    }
    if (best === null) return { recipes: [], model: 'unknown' };

    return {
        recipes: rows.filter((row) => keyOf(row) === best).map((row) => row.recipe),
        model: best.split('|')[0],
    };
}

/** The admin form asks for a percentage (80), the scheduler default is a fraction (0.8). */
export function normalizeSimilarity(value: number | undefined): number | undefined {
    if (value === undefined || !Number.isFinite(value)) return undefined;
    return value > 1 ? value / 100 : value;
}

const defaultDeps = (): ThemeClusterDeps => ({
    store: prismaThemeClusterStore,
    loadRecipes,
    newKey: () => `t${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`,
});

// ── Processor ───────────────────────────────────────────────────────────────

export async function processClusterRecipeThemes(
    job: Job<ClusterRecipeThemesJob>,
    deps: ThemeClusterDeps = defaultDeps(),
): Promise<ThemeClusterReport> {
    const { store, newKey } = deps;
    const seed = job.data.seed ?? 42;
    const dryRun = job.data.dryRun === true;
    console.log(
        `[ThemeClusters] Starting cluster-recipe-themes job ${job.id} (seed ${seed}, ${dryRun ? 'dry run' : 'write'})`,
    );

    try {
        const { recipes, model } = await deps.loadRecipes(job);
        if (recipes.length < 2) {
            console.log('[ThemeClusters] Not enough recipes with embeddings, nothing to do');
            return {
                success: true,
                runId: null,
                persisted: false,
                recipes: recipes.length,
                clusters: 0,
                stability: null,
            };
        }

        const previous = await store.loadPrevious();
        const result = computeThemeClusters(recipes, previous.clusters, {
            k: job.data.clusters,
            seed,
            minSimilarity: normalizeSimilarity(job.data.minSimilarity),
            minClusterSize: job.data.minClusterSize,
            previousAssignments: previous.assignments,
        });
        await job.updateProgress(80);

        const snapshot = buildRunSnapshot(
            result,
            { seed, model, recipeCount: recipes.length },
            newKey,
        );
        const saved = dryRun ? null : await store.save(snapshot);
        await job.updateProgress(100);

        // The report doubles as the label sample admins review before releasing clusters
        const report: ThemeClusterReport = {
            success: true,
            runId: saved?.runId ?? null,
            persisted: saved !== null,
            recipes: recipes.length,
            model,
            clusters: result.clusters.length,
            iterations: result.iterations,
            converged: result.converged,
            stability: result.stability,
            retiredClusters: result.retiredPrevIds.length,
            sample: result.clusters.map((cluster, i) => ({
                key: snapshot.clusters[i].key,
                label: cluster.label,
                size: cluster.profile.size,
                eligible: cluster.profile.eligible,
                continues: cluster.continuesId,
                terms: dominantTermNames(cluster.profile),
                filterCoverage: Math.round(cluster.profile.filterCoverage * 100) / 100,
                href: clusterSearchHref(cluster.profile.filter),
            })),
        };
        console.log(
            `[ThemeClusters] Done — ${report.clusters} clusters from ${report.recipes} recipes${dryRun ? ' (dry run)' : ''}`,
        );
        return report;
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error('[ThemeClusters] Run failed', { error });
        if (!dryRun) {
            await store
                .recordFailure({ seed, k: job.data.clusters ?? 0, error })
                .catch((storeError) =>
                    console.error('[ThemeClusters] Could not record the failure', storeError),
                );
        }
        throw err;
    }
}
