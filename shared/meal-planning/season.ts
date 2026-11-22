/** Season of a calendar date and its German names (KUC-113, KUC-126). */
import { detectSeason } from '../../src/lib/fits-now/season';
import { requireIsoDate } from '../dates';

import type { IsoDate, Season } from './types';

export function seasonOf(date: IsoDate): Season {
    return detectSeason(requireIsoDate(date).getUTCMonth());
}

export const SEASON_NAMES_DE: Record<Season, string> = {
    fruehling: 'Frühling',
    sommer: 'Sommer',
    herbst: 'Herbst',
    winter: 'Winter',
};
