import type { Season } from '@shared/meal-planning/season';

/** Seasonal chips (`TIME_SEASON`) are highlighted when their season matches the current one. */
export function isSeasonalFilterSetHighlighted(
    filterSet: { type: string; season: string | null },
    currentSeason: Season,
): boolean {
    return filterSet.type === 'TIME_SEASON' && filterSet.season === currentSeason;
}
