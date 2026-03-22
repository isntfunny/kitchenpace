import { TZDate } from '@date-fns/tz';
import { getHolidays, type Holiday } from 'feiertagejs';

// ── Types ────────────────────────────────────────────────────────────────────

export type TimeSlot = 'fruehstueck' | 'brunch' | 'mittag' | 'nachmittag' | 'abend' | 'spaet';
export type Season = 'fruehling' | 'sommer' | 'herbst' | 'winter';

export interface FitsNowContext {
    timeSlot: TimeSlot;
    season: Season;
    periods: string[];
    isHolidayOverride: boolean;
    label: string;
    description: string;
}

// ── Food-Cultural Period Definition ──────────────────────────────────────────

export interface FoodPeriod {
    id: string;
    label: string;
    resolve: (year: number) => { start: Date; end: Date };
    override: boolean;
    tagKeywords: string[];
    categorySlugs?: string[];
    description: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TZ = 'Europe/Berlin';

/** Calculate the 1st Advent Sunday for a given year (4th Sunday before Dec 25). */
function firstAdvent(year: number): Date {
    // Dec 25 → walk back to previous Sunday, then 3 more weeks
    const christmas = new Date(year, 11, 25);
    const dayOfWeek = christmas.getDay(); // 0 = Sunday
    const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const fourthAdvent = new Date(year, 11, 25 - daysToLastSunday);
    return new Date(
        fourthAdvent.getFullYear(),
        fourthAdvent.getMonth(),
        fourthAdvent.getDate() - 21,
    );
}

/** Get Easter Sunday date from feiertagejs holidays. */
function easterSunday(year: number): Date {
    const holidays = getHolidays(year, 'ALL');
    const easter = holidays.find((h: Holiday) => h.name === 'OSTERSONNTAG');
    if (easter) return easter.date;
    // Fallback: Ostermontag - 1 day
    const osterMontag = holidays.find((h: Holiday) => h.name === 'OSTERMONTAG');
    if (osterMontag) return new Date(osterMontag.date.getTime() - 86400000);
    // Should never happen
    return new Date(year, 3, 1);
}

function easterMonday(year: number): Date {
    const sunday = easterSunday(year);
    return new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 1);
}

function dayStart(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function inRange(now: Date, start: Date, end: Date): boolean {
    const t = dayStart(now);
    return t >= dayStart(start) && t <= dayStart(end);
}

// ── Default Food Periods ─────────────────────────────────────────────────────

export const FOOD_PERIODS: FoodPeriod[] = [
    {
        id: 'adventszeit',
        label: 'Adventszeit',
        resolve: (y) => ({ start: firstAdvent(y), end: new Date(y, 11, 24) }),
        override: true,
        tagKeywords: [
            'advent',
            'plaetzchen',
            'weihnachten',
            'lebkuchen',
            'stollen',
            'gluehwein',
            'zimtsterne',
            'vanillekipferl',
        ],
        description: 'Adventszeit — Plaetzchen, Gluehwein und festliche Rezepte',
    },
    {
        id: 'weihnachtszeit',
        label: 'Weihnachtszeit',
        resolve: (y) => ({ start: firstAdvent(y), end: new Date(y, 11, 26) }),
        override: true,
        tagKeywords: [
            'weihnachten',
            'weihnachtsbraten',
            'festlich',
            'gans',
            'rotkohl',
            'knoedel',
            'plaetzchen',
            'lebkuchen',
        ],
        categorySlugs: ['hauptgericht', 'backen'],
        description: 'Weihnachtszeit — Festliche Gerichte und Weihnachtsbaeckerei',
    },
    {
        id: 'plaetzchenzeit',
        label: 'Plaetzchenzeit',
        resolve: (y) => ({ start: new Date(y, 10, 15), end: new Date(y, 11, 25) }),
        override: true,
        tagKeywords: [
            'plaetzchen',
            'kekse',
            'gebaeck',
            'weihnachtsbaeckerei',
            'lebkuchen',
            'zimtsterne',
            'vanillekipferl',
            'stollen',
        ],
        categorySlugs: ['backen'],
        description: 'Plaetzchenzeit — Jetzt wird gebacken!',
    },
    {
        id: 'osterzeit',
        label: 'Osterzeit',
        resolve: (y) => {
            const easter = easterSunday(y);
            return {
                start: new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 7),
                end: easterMonday(y),
            };
        },
        override: true,
        tagKeywords: ['ostern', 'hefezopf', 'osterlamm', 'eier', 'osterbrunch'],
        description: 'Osterzeit — Hefezopf, Osterlamm und Brunch-Ideen',
    },
    {
        id: 'silvester',
        label: 'Silvester',
        resolve: (y) => ({ start: new Date(y, 11, 31), end: new Date(y, 11, 31) }),
        override: true,
        tagKeywords: ['silvester', 'party', 'fingerfood', 'haeppchen', 'fondue', 'raclette'],
        description: 'Silvester — Fingerfood, Fondue und Party-Snacks',
    },
    {
        id: 'grillsaison',
        label: 'Grillsaison',
        resolve: (y) => ({ start: new Date(y, 4, 1), end: new Date(y, 8, 30) }),
        override: false,
        tagKeywords: ['grillen', 'marinade', 'bbq', 'grillbeilage'],
        description: 'Grillsaison — Ab auf den Grill!',
    },
    {
        id: 'spargelzeit',
        label: 'Spargelzeit',
        resolve: (y) => ({ start: new Date(y, 3, 15), end: new Date(y, 5, 24) }),
        override: false,
        tagKeywords: ['spargel', 'hollandaise', 'spargelsuppe'],
        description: 'Spargelzeit — Weisser und gruener Spargel',
    },
    {
        id: 'erdbeerzeit',
        label: 'Erdbeerzeit',
        resolve: (y) => ({ start: new Date(y, 4, 15), end: new Date(y, 6, 15) }),
        override: false,
        tagKeywords: ['erdbeere', 'erdbeeren', 'erdbeer', 'erdbeerkuchen', 'erdbeertorte'],
        description: 'Erdbeerzeit — Frische Erdbeer-Rezepte',
    },
    {
        id: 'kuerbiszeit',
        label: 'Kuerbiszeit',
        resolve: (y) => ({ start: new Date(y, 8, 15), end: new Date(y, 10, 15) }),
        override: false,
        tagKeywords: ['kuerbis', 'kuerbissuppe', 'hokkaido', 'butternut'],
        description: 'Kuerbiszeit — Suppen, Ofengemuese und mehr',
    },
];

// ── Time Slot Detection ──────────────────────────────────────────────────────

function detectTimeSlot(hour: number, minute: number): TimeSlot {
    const t = hour * 60 + minute;
    if (t >= 300 && t < 600) return 'fruehstueck'; // 5:00–9:59
    if (t >= 600 && t < 690) return 'brunch'; // 10:00–11:29
    if (t >= 690 && t < 870) return 'mittag'; // 11:30–14:29
    if (t >= 870 && t < 1050) return 'nachmittag'; // 14:30–17:29
    if (t >= 1050 && t < 1290) return 'abend'; // 17:30–21:29
    return 'spaet'; // 21:30–4:59
}

// ── Season Detection ─────────────────────────────────────────────────────────

function detectSeason(month: number): Season {
    if (month >= 2 && month <= 4) return 'fruehling'; // Mar–May (0-indexed: 2–4)
    if (month >= 5 && month <= 7) return 'sommer'; // Jun–Aug
    if (month >= 8 && month <= 10) return 'herbst'; // Sep–Nov
    return 'winter'; // Dec–Feb
}

// ── Period Detection ─────────────────────────────────────────────────────────

function detectActivePeriods(now: Date, periods: FoodPeriod[] = FOOD_PERIODS): FoodPeriod[] {
    const year = now.getFullYear();
    return periods.filter((p) => {
        const { start, end } = p.resolve(year);
        return inRange(now, start, end);
    });
}

// ── Labels ───────────────────────────────────────────────────────────────────

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
    fruehstueck: 'Fruehstueck',
    brunch: 'Brunch',
    mittag: 'Mittagessen',
    nachmittag: 'Kaffee & Kuchen',
    abend: 'Abendessen',
    spaet: 'Spaeter Snack',
};

const SEASON_LABELS: Record<Season, string> = {
    fruehling: 'Fruehling',
    sommer: 'Sommer',
    herbst: 'Herbst',
    winter: 'Winter',
};

const TIME_SEASON_DESCRIPTIONS: Record<string, string> = {
    'fruehstueck:fruehling': 'Frische Fruehstuecksideen fuer den Fruehling',
    'fruehstueck:sommer': 'Leichtes Fruehstueck fuer warme Sommertage',
    'fruehstueck:herbst': 'Warmes Fruehstueck fuer den Herbst',
    'fruehstueck:winter': 'Gemuetliches Winter-Fruehstueck',
    'brunch:fruehling': 'Fruehlingsfrischer Brunch',
    'brunch:sommer': 'Leichter Sommerbrunch',
    'brunch:herbst': 'Herbstlicher Brunch',
    'brunch:winter': 'Gemuetlicher Winterbrunch',
    'mittag:fruehling': 'Leichte Fruehlingskueche zum Mittag',
    'mittag:sommer': 'Sommerlich-frische Mittagsgerichte',
    'mittag:herbst': 'Herbstliche Mittagsgerichte',
    'mittag:winter': 'Herzhafte Winterkueche zum Mittag',
    'nachmittag:fruehling': 'Fruehlingshaftes zum Kaffee',
    'nachmittag:sommer': 'Sommerliche Kuchen und Torten',
    'nachmittag:herbst': 'Herbstliches Gebaeck',
    'nachmittag:winter': 'Gemuetliches Wintergebaeck',
    'abend:fruehling': 'Leichte Fruehlingsgerichte zum Abend',
    'abend:sommer': 'Sommerlich-leichte Abendgerichte',
    'abend:herbst': 'Herzhafte Herbstgerichte am Abend',
    'abend:winter': 'Deftige Wintergerichte zum Abend',
    'spaet:fruehling': 'Kleine Snacks fuer den spaeten Abend',
    'spaet:sommer': 'Leichte Sommer-Snacks fuer spaet',
    'spaet:herbst': 'Herbstliche Snacks fuer den spaeten Abend',
    'spaet:winter': 'Warme Winter-Snacks fuer spaet',
};

// ── Main Detection Function ──────────────────────────────────────────────────

export function detectContext(now?: Date): FitsNowContext {
    const berlinNow = now ? new TZDate(now, TZ) : new TZDate(new Date(), TZ);
    const hour = berlinNow.getHours();
    const minute = berlinNow.getMinutes();
    const month = berlinNow.getMonth();

    const timeSlot = detectTimeSlot(hour, minute);
    const season = detectSeason(month);
    const activePeriods = detectActivePeriods(berlinNow);

    const hasOverride = activePeriods.some((p) => p.override);
    const periodIds = activePeriods.map((p) => p.id);

    // Build label & description
    let label: string;
    let description: string;

    if (hasOverride) {
        // Use the most specific override period's label
        const primaryPeriod = activePeriods.find((p) => p.override)!;
        label = primaryPeriod.label;
        description = primaryPeriod.description;
    } else {
        label = `${TIME_SLOT_LABELS[timeSlot]} im ${SEASON_LABELS[season]}`;
        description =
            TIME_SEASON_DESCRIPTIONS[`${timeSlot}:${season}`] ??
            `${TIME_SLOT_LABELS[timeSlot]} — passend zur Jahreszeit`;
    }

    return {
        timeSlot,
        season,
        periods: periodIds,
        isHolidayOverride: hasOverride,
        label,
        description,
    };
}
