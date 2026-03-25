export type TimeSlot = 'fruehstueck' | 'brunch' | 'mittag' | 'nachmittag' | 'abend' | 'spaet';
export type Season = 'fruehling' | 'sommer' | 'herbst' | 'winter';

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
    fruehstueck: 'Fruehstueck',
    brunch: 'Brunch',
    mittag: 'Mittagessen',
    nachmittag: 'Kaffee & Kuchen',
    abend: 'Abendessen',
    spaet: 'Spaeter Snack',
};

export const SEASON_LABELS: Record<Season, string> = {
    fruehling: 'Fruehling',
    sommer: 'Sommer',
    herbst: 'Herbst',
    winter: 'Winter',
};
