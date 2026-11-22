/**
 * Selection logic for the inspiration strip of the week plan (KUC-112).
 *
 * Up to 2 season chips (FilterSet `TIME_SEASON` of the current season) and up to 3 topics
 * (active theme clusters closest to the user's taste profile). Fallbacks keep the strip
 * useful without a taste profile (clusters by size) and without clusters (popular tags).
 * Pure: no DB, no UI; the caller loads the inputs and may cache the result per user and week
 * (`inspirationCacheKey`).
 */
import { isoWeek } from '../dates';
import { cosine, hasTasteProfile } from '../recipe-ranking/vector';

import { seasonOf } from './season';
import type { IsoDate } from './types';

export const MAX_SEASON_CHIPS = 2;
export const MAX_THEMES = 3;

/** A FilterSet as the strip needs it (only `TIME_SEASON` sets are considered). */
export interface InspirationFilterSet {
    id: string;
    type: 'TIME_SEASON' | 'FOOD_PERIOD';
    /** Season key of the set, e.g. `winter`; compared with `seasonOf(today)` */
    season?: string | null;
    /** Time slot of the set, e.g. `mittag`; only used to prefer lunch/dinner sets */
    timeSlot?: string | null;
    /** Ready-made display label (German) */
    label: string;
    sortOrder?: number;
}

/** A released theme cluster (`active` = approved by an admin). */
export interface InspirationCluster {
    key: string;
    label: string;
    centroid: readonly number[];
    /** Number of recipes in the cluster */
    size: number;
    active: boolean;
    /** Search link (e.g. from `clusterSearchHref`); built from `filter` if missing */
    href?: string;
    filter?: { tags: string[]; categories: string[] };
    /** Recipe ids of the cluster, to drop themes that are already fully planned */
    memberRecipeIds?: readonly string[];
}

export interface InspirationTag {
    name: string;
    /** Number of recipes with the tag */
    count: number;
}

export interface InspirationInput {
    today: IsoDate;
    filterSets: InspirationFilterSet[];
    clusters?: InspirationCluster[];
    popularTags?: InspirationTag[];
    /** `Profile.tasteEmbedding`; missing or empty = no taste profile */
    tasteEmbedding?: readonly number[] | null;
    /** Recipes already planned in this week */
    plannedRecipeIds?: readonly string[];
    /** Time slots of season sets that are tried first (default lunch and dinner) */
    preferredTimeSlots?: readonly string[];
}

export interface InspirationItem {
    kind: 'season' | 'theme' | 'tag';
    label: string;
    /** `/recipes?filterSetId=…`, the cluster search link or a tag search */
    href: string;
    /** Stable key for lists and tracking */
    key: string;
}

const searchHref = (params: Record<string, string[]>) => {
    const query = new URLSearchParams();
    for (const [key, values] of Object.entries(params)) {
        values.forEach((value) => query.append(key, value));
    }
    const text = query.toString();
    return text ? `/recipes?${text}` : '/recipes';
};

export const filterSetHref = (filterSetId: string) => searchHref({ filterSetId: [filterSetId] });

function clusterHref(cluster: InspirationCluster): string | null {
    if (cluster.href) return cluster.href;
    if (!cluster.filter) return null;
    const { tags, categories } = cluster.filter;
    if (tags.length === 0 && categories.length === 0) return null;
    return searchHref({ tags, categories });
}

function pickSeasonChips(input: InspirationInput): InspirationItem[] {
    const season = seasonOf(input.today);
    const preferred = new Set(input.preferredTimeSlots ?? ['mittag', 'abend']);

    return input.filterSets
        .filter((set) => set.type === 'TIME_SEASON' && set.season === season && set.label.trim())
        .sort(
            (a, b) =>
                Number(preferred.has(b.timeSlot ?? '')) - Number(preferred.has(a.timeSlot ?? '')) ||
                (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
                a.id.localeCompare(b.id),
        )
        .slice(0, MAX_SEASON_CHIPS)
        .map((set) => ({
            kind: 'season',
            label: set.label,
            href: filterSetHref(set.id),
            key: `season:${set.id}`,
        }));
}

function pickThemes(input: InspirationInput): InspirationItem[] {
    const planned = new Set(input.plannedRecipeIds ?? []);
    const hasTaste = hasTasteProfile(input.tasteEmbedding);

    const ranked = (input.clusters ?? [])
        .filter((cluster) => cluster.active && cluster.label.trim())
        .filter((cluster) => {
            // Everything of this topic is already in the plan: nothing left to inspire
            const members = cluster.memberRecipeIds;
            return !members || members.length === 0 || members.some((id) => !planned.has(id));
        })
        .map((cluster) => ({ cluster, href: clusterHref(cluster) }))
        .filter((entry): entry is { cluster: InspirationCluster; href: string } => !!entry.href)
        .map((entry) => ({
            ...entry,
            similarity:
                hasTaste && entry.cluster.centroid.length > 0
                    ? cosine(input.tasteEmbedding!, entry.cluster.centroid)
                    : 0,
        }));

    ranked.sort((a, b) =>
        hasTaste
            ? b.similarity - a.similarity ||
              b.cluster.size - a.cluster.size ||
              a.cluster.key.localeCompare(b.cluster.key)
            : b.cluster.size - a.cluster.size || a.cluster.key.localeCompare(b.cluster.key),
    );

    return ranked.slice(0, MAX_THEMES).map(({ cluster, href }) => ({
        kind: 'theme',
        label: cluster.label,
        href,
        key: `theme:${cluster.key}`,
    }));
}

function pickTags(input: InspirationInput, taken: InspirationItem[], limit: number) {
    const labels = new Set(taken.map((item) => item.label.toLowerCase()));
    return [...(input.popularTags ?? [])]
        .filter((tag) => tag.name.trim() && tag.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de'))
        .filter((tag) => !labels.has(tag.name.toLowerCase()))
        .slice(0, limit)
        .map(
            (tag): InspirationItem => ({
                kind: 'tag',
                label: tag.name,
                href: searchHref({ tags: [tag.name] }),
                key: `tag:${tag.name}`,
            }),
        );
}

/**
 * Picks the strip: season chips first, then topics. If fewer than 3 topics are available
 * (no clusters released yet, or all fully planned), popular tags fill the remaining places,
 * so the strip is only empty when there is no source at all.
 */
export function pickInspiration(input: InspirationInput): InspirationItem[] {
    const seasons = pickSeasonChips(input);
    const themes = pickThemes(input);
    const tags = pickTags(input, [...seasons, ...themes], MAX_THEMES - themes.length);
    return [...seasons, ...themes, ...tags];
}

/** ISO 8601 week of a date, e.g. `2026-W48` (the week belongs to the year of its Thursday). */
export function isoWeekOf(date: IsoDate): string {
    const { year, week } = isoWeek(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

/** One cache entry per user and ISO week (`isoWeek` as returned by `isoWeekOf`). */
export function inspirationCacheKey(userId: string, isoWeek: string): string {
    if (!userId.trim()) throw new Error('inspirationCacheKey: userId is required');
    if (!/^\d{4}-W\d{2}$/.test(isoWeek)) {
        throw new Error(`inspirationCacheKey: invalid ISO week "${isoWeek}", expected YYYY-Www`);
    }
    return `inspiration:v1:${userId}:${isoWeek}`;
}
