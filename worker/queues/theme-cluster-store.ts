import type { Prisma } from '@prisma/client';

import { previousFromRows, type RunSnapshot } from '@shared/theme-clusters/snapshot';

import { prisma } from './prisma';
import type { ThemeClusterStore } from './theme-cluster-processor';

/** Prisma-backed store for theme cluster runs (RecipeClusterRun / RecipeCluster / Member). */
export const prismaThemeClusterStore: ThemeClusterStore = {
    async loadPrevious() {
        // Match against the run that is live; before the first approval, against the latest
        // completed run so keys already stay stable across unreviewed runs.
        const reference =
            (await prisma.recipeClusterRun.findFirst({
                where: { status: 'COMPLETED', approvedAt: { not: null } },
                orderBy: { approvedAt: 'desc' },
                select: { id: true },
            })) ??
            (await prisma.recipeClusterRun.findFirst({
                where: { status: 'COMPLETED' },
                orderBy: { createdAt: 'desc' },
                select: { id: true },
            }));
        if (!reference) return { clusters: [], assignments: new Map() };

        const rows = await prisma.recipeCluster.findMany({
            where: { runId: reference.id },
            select: {
                key: true,
                label: true,
                centroid: true,
                topTerms: true,
                members: { select: { recipeId: true } },
            },
        });
        return previousFromRows(rows);
    },

    async save(snapshot: RunSnapshot) {
        const { run, clusters } = snapshot;
        const created = await prisma.$transaction(
            async (tx) =>
                tx.recipeClusterRun.create({
                    data: {
                        ...run,
                        status: 'COMPLETED',
                        finishedAt: new Date(),
                        clusters: {
                            create: clusters.map((cluster) => ({
                                key: cluster.key,
                                label: cluster.label,
                                centroid: cluster.centroid,
                                size: cluster.size,
                                filterTags: cluster.filterTags,
                                filterCategories: cluster.filterCategories,
                                topTerms: cluster.topTerms as unknown as Prisma.InputJsonObject,
                                eligible: cluster.eligible,
                                active: false,
                                members: { createMany: { data: cluster.members } },
                            })),
                        },
                    },
                    select: { id: true },
                }),
            { timeout: 60_000, maxWait: 10_000 },
        );
        return { runId: created.id };
    },

    async recordFailure({ seed, k, error }) {
        await prisma.recipeClusterRun.create({
            data: {
                k,
                seed,
                model: 'unknown',
                status: 'FAILED',
                error: error.slice(0, 2000),
                finishedAt: new Date(),
            },
        });
    },
};
