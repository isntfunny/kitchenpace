// Inspiration strip of the plan page (KUC-112): season chips, released theme clusters and
// popular tags, picked by `pickInspiration` and cached per user and ISO week. The cache
// is refreshed when a cluster run is released ('theme-clusters') or filter sets change
// ('fits-now'); it never blocks the page, a failing source only shortens the strip.
import { unstable_cache } from 'next/cache';

import { getTimeSeasonFilterSets } from '@app/lib/fits-now/db-queries';
import { SEASON_LABELS, TIME_SLOT_LABELS } from '@app/lib/fits-now/labels';
import { loadTasteEmbedding } from '@app/lib/recipes/taste-ranking.server';
import { getActiveThemeClusters } from '@app/lib/theme-clusters/queries';
import {
    inspirationCacheKey,
    isoWeekOf,
    pickInspiration,
    type InspirationFilterSet,
    type InspirationItem,
    type InspirationTag,
} from '@shared/meal-planning/inspiration';
import type { IsoDate } from '@shared/meal-planning/types';
import { prisma } from '@shared/prisma';

/** Ready-made German label of a time/season FilterSet. */
export function inspirationLabel(set: {
    displayLabel?: string | null;
    label?: string | null;
    timeSlot?: string | null;
    season?: string | null;
}): string {
    if (set.displayLabel) return set.displayLabel;
    if (set.label) return set.label;
    if (set.timeSlot && set.season) {
        const slot = (TIME_SLOT_LABELS as Record<string, string>)[set.timeSlot] ?? set.timeSlot;
        const season = (SEASON_LABELS as Record<string, string>)[set.season] ?? set.season;
        return `${slot} (${season})`;
    }
    return '';
}

async function settled<T>(work: Promise<T>, fallback: T): Promise<T> {
    try {
        return await work;
    } catch (error) {
        console.error('[plan] inspiration source failed', error);
        return fallback;
    }
}

async function popularTags(): Promise<InspirationTag[]> {
    const tags = await prisma.tag.findMany({
        select: { name: true, _count: { select: { recipes: true } } },
        orderBy: { recipes: { _count: 'desc' } },
        take: 12,
    });
    return tags.map((tag) => ({ name: tag.name, count: tag._count.recipes }));
}

async function computeInspiration(userId: string, today: IsoDate): Promise<InspirationItem[]> {
    const [sets, clusters, tags, taste] = await Promise.all([
        settled(getTimeSeasonFilterSets(), []),
        settled(getActiveThemeClusters(), []),
        settled(popularTags(), []),
        settled(loadTasteEmbedding(userId), null),
    ]);
    const filterSets: InspirationFilterSet[] = sets.map((set) => ({
        id: set.id,
        type: 'TIME_SEASON',
        season: set.season,
        timeSlot: set.timeSlot,
        label: inspirationLabel(set),
        sortOrder: set.sortOrder,
    }));
    return pickInspiration({
        today,
        filterSets,
        clusters,
        popularTags: tags,
        tasteEmbedding: taste,
    });
}

/**
 * One cache entry per user and week (`inspiration:v1:<user>:<week>`), so the strip costs
 * nothing after the first load of the week. A taste profile change shows up with the next week
 * or when the tag `inspiration:<userId>` is revalidated.
 */
export function getInspirationItems(userId: string, today: IsoDate): Promise<InspirationItem[]> {
    const cached = unstable_cache(
        () => computeInspiration(userId, today),
        [inspirationCacheKey(userId, isoWeekOf(today))],
        { revalidate: 6 * 3600, tags: ['theme-clusters', 'fits-now', `inspiration:${userId}`] },
    );
    return cached();
}
