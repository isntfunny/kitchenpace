import { unstable_cache } from 'next/cache';

import type { InspirationCluster } from '@shared/meal-planning/inspiration';
import { prisma } from '@shared/prisma';
import { toInspirationCluster, toThemeChip, type ThemeChip } from '@shared/theme-clusters/release';

export const THEME_CLUSTER_CACHE_TAG = 'theme-clusters';

/** Clusters that are visible: eligible, switched on, and part of an approved COMPLETED run. */
const RELEASED = {
    active: true,
    eligible: true,
    run: { status: 'COMPLETED', approvedAt: { not: null } },
} as const;

/**
 * Released theme clusters as the DTO of the inspiration strip (`pickInspiration`).
 * `includeMembers` adds the recipe ids so fully planned themes can be dropped; it loads every
 * member row, so leave it off where only labels and filters are needed.
 */
export async function getActiveThemeClusters(
    options: { includeMembers?: boolean } = {},
): Promise<InspirationCluster[]> {
    const rows = await prisma.recipeCluster.findMany({
        where: RELEASED,
        select: {
            key: true,
            label: true,
            centroid: true,
            size: true,
            filterTags: true,
            filterCategories: true,
            ...(options.includeMembers ? { members: { select: { recipeId: true } } } : {}),
        },
        orderBy: [{ size: 'desc' }, { key: 'asc' }],
    });

    return rows
        .map((row) => toInspirationCluster(row))
        .filter((cluster): cluster is InspirationCluster => cluster !== null);
}

/** Search themes for the chips on /recipes. Cached; refreshed when a run is released. */
export const getThemeChips = unstable_cache(
    async (): Promise<ThemeChip[]> => {
        const rows = await prisma.recipeCluster.findMany({
            where: RELEASED,
            select: {
                key: true,
                label: true,
                centroid: true,
                size: true,
                filterTags: true,
                filterCategories: true,
            },
            orderBy: [{ size: 'desc' }, { key: 'asc' }],
        });
        return rows
            .map((row) => toThemeChip(row))
            .filter((chip): chip is ThemeChip => chip !== null);
    },
    ['theme-chips'],
    { revalidate: 300, tags: [THEME_CLUSTER_CACHE_TAG] },
);

/** The run that is currently live: the most recently approved COMPLETED run. */
export async function getLiveRunId(): Promise<string | null> {
    const run = await prisma.recipeClusterRun.findFirst({
        where: { status: 'COMPLETED', approvedAt: { not: null } },
        orderBy: { approvedAt: 'desc' },
        select: { id: true },
    });
    return run?.id ?? null;
}

// ── Admin review ────────────────────────────────────────────────────────────

export async function listClusterRuns(limit = 12) {
    return prisma.recipeClusterRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            status: true,
            k: true,
            recipeCount: true,
            approvedAt: true,
            createdAt: true,
        },
    });
}

export async function getClusterRunDetail(runId: string) {
    return prisma.recipeClusterRun.findUnique({
        where: { id: runId },
        select: {
            id: true,
            status: true,
            k: true,
            seed: true,
            model: true,
            recipeCount: true,
            iterations: true,
            stabilityRatio: true,
            error: true,
            approvedAt: true,
            approvedBy: { select: { name: true } },
            createdAt: true,
            finishedAt: true,
            clusters: {
                orderBy: [{ size: 'desc' }, { key: 'asc' }],
                select: {
                    id: true,
                    key: true,
                    label: true,
                    size: true,
                    eligible: true,
                    active: true,
                    filterTags: true,
                    filterCategories: true,
                    topTerms: true,
                },
            },
        },
    });
}
