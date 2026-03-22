import type { Season, TimeSlot } from './context';
import { type FilterSetWithRelations, getTimeSeasonFilterSets } from './db-queries';

// ── Filter Criteria ──────────────────────────────────────────────────────────

export interface FilterCriteria {
    categorySlugs: string[];
    tagKeywords: string[];
    ingredientKeywords: string[];
    maxTotalTime?: number;
}

// ── Convert DB FilterSet → FilterCriteria ───────────────────────────────────

export function toFilterCriteria(fs: FilterSetWithRelations): FilterCriteria {
    return {
        categorySlugs: fs.categories.map((c) => c.category.slug),
        tagKeywords: fs.tags.map((t) => t.tag.name),
        ingredientKeywords: fs.ingredients.map((i) => i.ingredient.name),
        maxTotalTime: fs.maxTotalTime ?? undefined,
    };
}

// ── Lookup ───────────────────────────────────────────────────────────────────

const EMPTY_CRITERIA: FilterCriteria = {
    categorySlugs: [],
    tagKeywords: [],
    ingredientKeywords: [],
};

export async function getTimeSeasonCriteria(
    timeSlot: TimeSlot,
    season: Season,
): Promise<FilterCriteria> {
    const allSets = await getTimeSeasonFilterSets();

    // Try specific combo first (e.g. "mittag:winter")
    const specific = allSets.find((s) => s.timeSlot === timeSlot && s.season === season);
    if (specific) return toFilterCriteria(specific);

    // Fall back to wildcard (e.g. "mittag:*")
    const wildcard = allSets.find((s) => s.timeSlot === timeSlot && s.season === '*');
    if (wildcard) return toFilterCriteria(wildcard);

    return EMPTY_CRITERIA;
}
