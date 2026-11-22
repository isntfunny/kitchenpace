import type { Season } from './labels';

/** Meteorological season for a 0-indexed month (client-safe, no server imports). */
export function detectSeason(month: number): Season {
    if (month >= 2 && month <= 4) return 'fruehling'; // Mar–May
    if (month >= 5 && month <= 7) return 'sommer'; // Jun–Aug
    if (month >= 8 && month <= 10) return 'herbst'; // Sep–Nov
    return 'winter'; // Dec–Feb
}

/** Seasonal chips (`TIME_SEASON`) are highlighted when their season matches the current one. */
export function isSeasonalFilterSetHighlighted(
    filterSet: { type: string; season: string | null },
    currentSeason: Season,
): boolean {
    return filterSet.type === 'TIME_SEASON' && filterSet.season === currentSeason;
}
