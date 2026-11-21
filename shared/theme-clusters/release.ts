/**
 * Rules for releasing theme clusters, and the mappings that expose released clusters to
 * consumers (inspiration strip, /recipes chips). Pure: the DB code in `src/lib/theme-clusters`
 * only loads rows and applies the decisions made here.
 */
import type { InspirationCluster } from '../meal-planning/inspiration';

import { clusterSearchHref } from './href';

export type RunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export type Decision = { ok: true } | { ok: false; reason: string };

/** A run can be released once, and only when it finished successfully. */
export function canApproveRun(run: { status: RunStatus; approvedAt: Date | null }): Decision {
    if (run.status !== 'COMPLETED') {
        return { ok: false, reason: 'Nur abgeschlossene Läufe können freigegeben werden.' };
    }
    if (run.approvedAt) return { ok: false, reason: 'Dieser Lauf ist bereits freigegeben.' };
    return { ok: true };
}

/** Releasing a run shows exactly its eligible clusters. */
export function clustersToActivate<T extends { id: string; eligible: boolean }>(
    clusters: readonly T[],
): string[] {
    return clusters.filter((cluster) => cluster.eligible).map((cluster) => cluster.id);
}

/**
 * Single clusters of a released run can be hidden or shown again; clusters that are not
 * eligible (too small, no describable terms) can never be shown.
 */
export function canToggleCluster(
    run: { approvedAt: Date | null },
    cluster: { eligible: boolean },
    active: boolean,
): Decision {
    if (!run.approvedAt) {
        return { ok: false, reason: 'Der Lauf ist noch nicht freigegeben.' };
    }
    if (active && !cluster.eligible) {
        return { ok: false, reason: 'Dieses Thema ist zu klein oder nicht beschreibbar.' };
    }
    return { ok: true };
}

export interface ReleasedClusterRow {
    key: string;
    label: string;
    centroid: readonly number[];
    size: number;
    filterTags: readonly string[];
    filterCategories: readonly string[];
    members?: readonly { recipeId: string }[];
}

/** DTO for the inspiration strip (`pickInspiration`); null if the cluster has no filter. */
export function toInspirationCluster(row: ReleasedClusterRow): InspirationCluster | null {
    const filter = { tags: [...row.filterTags], categories: [...row.filterCategories] };
    if (filter.tags.length === 0 && filter.categories.length === 0) return null;
    return {
        key: row.key,
        label: row.label,
        centroid: row.centroid,
        size: row.size,
        active: true,
        filter,
        href: clusterSearchHref(filter),
        ...(row.members ? { memberRecipeIds: row.members.map((m) => m.recipeId) } : {}),
    };
}

/** Light shape for chips on /recipes (no centroid, no members). */
export interface ThemeChip {
    key: string;
    label: string;
    tags: string[];
    categories: string[];
}

export function toThemeChip(row: ReleasedClusterRow): ThemeChip | null {
    if (row.filterTags.length === 0 && row.filterCategories.length === 0) return null;
    return {
        key: row.key,
        label: row.label,
        tags: [...row.filterTags],
        categories: [...row.filterCategories],
    };
}

interface FilterLists {
    tags?: string[];
    categories?: string[];
}

/** A theme is active when all of its tags and categories are part of the current filters. */
export function isThemeActive(filters: FilterLists, theme: ThemeChip): boolean {
    const tags = new Set(filters.tags ?? []);
    const categories = new Set(filters.categories ?? []);
    return (
        (theme.tags.length > 0 || theme.categories.length > 0) &&
        theme.tags.every((tag) => tags.has(tag)) &&
        theme.categories.every((category) => categories.has(category))
    );
}

/** Adds the theme's filters to the current ones, or removes them again if it is active. */
export function toggleThemeFilters(filters: FilterLists, theme: ThemeChip) {
    const tags = filters.tags ?? [];
    const categories = filters.categories ?? [];
    if (isThemeActive(filters, theme)) {
        return {
            tags: tags.filter((tag) => !theme.tags.includes(tag)),
            categories: categories.filter((category) => !theme.categories.includes(category)),
        };
    }
    return {
        tags: [...new Set([...tags, ...theme.tags])],
        categories: [...new Set([...categories, ...theme.categories])],
    };
}
