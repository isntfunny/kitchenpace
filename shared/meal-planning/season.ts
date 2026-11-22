/** Seasons: the season of a calendar date and its German names (KUC-113, KUC-126). */
import { requireIsoDate, type IsoDate } from '../dates';

export type Season = 'fruehling' | 'sommer' | 'herbst' | 'winter';

/** Meteorological season for a 0-indexed month (client-safe, no server imports). */
export function detectSeason(month: number): Season {
    if (month >= 2 && month <= 4) return 'fruehling'; // Mar–May
    if (month >= 5 && month <= 7) return 'sommer'; // Jun–Aug
    if (month >= 8 && month <= 10) return 'herbst'; // Sep–Nov
    return 'winter'; // Dec–Feb
}

export function seasonOf(date: IsoDate): Season {
    return detectSeason(requireIsoDate(date).getUTCMonth());
}

export const SEASON_NAMES_DE: Record<Season, string> = {
    fruehling: 'Frühling',
    sommer: 'Sommer',
    herbst: 'Herbst',
    winter: 'Winter',
};
