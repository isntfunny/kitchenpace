import { Job } from 'bullmq';

import {
    computeThemeClusters,
    dominantTermNames,
    type ClusterRecipeInput,
    type ComputeResult,
    type PreviousThemeCluster,
} from '@shared/theme-clusters/compute';
import { clusterSearchHref } from '@shared/theme-clusters/href';

import { prisma } from './prisma';
import type { ClusterRecipeThemesJob } from './types';

console.log('[DEBUG] theme-cluster-processor.ts module loaded');

// ── Storage seam ────────────────────────────────────────────────────────────
// The cluster tables come with the data model of the week-plan epic (KUC-98).
// Until then the job runs as a dry run: it computes and reports, but persists nothing.

export interface ThemeClusterStore {
    /** Clusters of the last run (for stable ids/labels); empty on the first run */
    loadPrevious(): Promise<{
        clusters: PreviousThemeCluster[];
        assignments: Map<string, string>;
    }>;
    /**
     * Persists the run. New clusters start hidden: they only become visible once an admin
     * has released them after reviewing the labels.
     */
    save(result: ComputeResult, meta: { seed: number }): Promise<void>;
}

export const dryRunStore: ThemeClusterStore = {
    loadPrevious: async () => ({ clusters: [], assignments: new Map() }),
    save: async () => undefined,
};

// ── Data loading ────────────────────────────────────────────────────────────

const PAGE_SIZE = 500;

/** Published recipes with their stored embedding, tag names and categories. No OpenAI calls. */
async function loadRecipes(job: Job<ClusterRecipeThemesJob>): Promise<ClusterRecipeInput[]> {
    const recipes: ClusterRecipeInput[] = [];
    let cursor: string | undefined;

    while (true) {
        const rows = await prisma.recipeEmbedding.findMany({
            where: { recipe: { status: 'PUBLISHED' } },
            select: {
                recipeId: true,
                embedding: true,
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
        if (rows.length === 0) break;
        cursor = rows[rows.length - 1].recipeId;

        for (const row of rows) {
            if (row.embedding.length === 0) continue;
            recipes.push({
                recipeId: row.recipeId,
                embedding: row.embedding,
                tags: row.recipe.tags.map((entry) => entry.tag.name),
                categories: row.recipe.categories.map((entry) => entry.category),
            });
        }
        await job.updateProgress(Math.min(50, Math.round(recipes.length / 100)));
    }

    return dropForeignDimensions(recipes);
}

/** Embeddings of another model/dimension cannot be mixed: keep the most common dimension. */
export function dropForeignDimensions(recipes: ClusterRecipeInput[]): ClusterRecipeInput[] {
    const counts = new Map<number, number>();
    for (const recipe of recipes) {
        counts.set(recipe.embedding.length, (counts.get(recipe.embedding.length) ?? 0) + 1);
    }
    let dimension = 0;
    let best = 0;
    for (const [length, count] of counts) {
        if (count > best) {
            best = count;
            dimension = length;
        }
    }
    return recipes.filter((recipe) => recipe.embedding.length === dimension);
}

/** The admin form asks for a percentage (80), the scheduler default is a fraction (0.8). */
export function normalizeSimilarity(value: number | undefined): number | undefined {
    if (value === undefined || !Number.isFinite(value)) return undefined;
    return value > 1 ? value / 100 : value;
}

// ── Processor ───────────────────────────────────────────────────────────────

export async function processClusterRecipeThemes(
    job: Job<ClusterRecipeThemesJob>,
    store: ThemeClusterStore = dryRunStore,
) {
    const seed = job.data.seed ?? 42;
    console.log(`[ThemeClusters] Starting cluster-recipe-themes job ${job.id} (seed ${seed})`);

    const recipes = await loadRecipes(job);
    if (recipes.length < 2) {
        console.log('[ThemeClusters] Not enough recipes with embeddings, nothing to do');
        return { success: true, recipes: recipes.length, clusters: 0, persisted: false };
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

    if (job.data.dryRun !== true) await store.save(result, { seed });
    await job.updateProgress(100);

    // The report doubles as the label sample admins review before releasing clusters
    const report = {
        success: true,
        recipes: recipes.length,
        clusters: result.clusters.length,
        iterations: result.iterations,
        converged: result.converged,
        stability: result.stability,
        retiredClusters: result.retiredPrevIds.length,
        persisted: store !== dryRunStore && job.data.dryRun !== true,
        sample: result.clusters.map((cluster) => ({
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
        `[ThemeClusters] Done — ${report.clusters} clusters from ${report.recipes} recipes`,
    );
    return report;
}
