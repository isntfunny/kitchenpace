import { TZDate } from '@date-fns/tz';
import { cache } from 'react';

import { inRange, resolveDisplayWindow } from './date-resolver';
import { type FilterSetWithRelations, getFoodPeriodFilterSets } from './db-queries';
import { toFilterCriteria, type FilterCriteria } from './mappings';

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

export interface ResolvedPeriod {
    filterSet: FilterSetWithRelations;
    criteria: FilterCriteria;
}

export interface DetectResult {
    context: FitsNowContext;
    activePeriods: ResolvedPeriod[];
}

// ── Time Slot Detection ──────────────────────────────────────────────────────

const TZ = 'Europe/Berlin';

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

export async function detectActivePeriods(now: Date): Promise<ResolvedPeriod[]> {
    const periodSets = await getFoodPeriodFilterSets();
    const year = now.getFullYear();

    return periodSets
        .filter((p) => {
            if (!p.resolveType) return false;
            const window = resolveDisplayWindow(
                {
                    resolveType: p.resolveType,
                    startMonth: p.startMonth,
                    startDay: p.startDay,
                    endMonth: p.endMonth,
                    endDay: p.endDay,
                    startOffsetDays: p.startOffsetDays,
                    endOffsetDays: p.endOffsetDays,
                    leadDays: p.leadDays,
                    trailDays: p.trailDays,
                },
                year,
            );
            return inRange(now, window.start, window.end);
        })
        .map((p) => ({
            filterSet: p,
            criteria: toFilterCriteria(p),
        }));
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

// ── Main Detection Function (per-request dedup via React cache) ─────────────

export const detectContext = cache(async (now?: Date): Promise<DetectResult> => {
    const berlinNow = now ? new TZDate(now, TZ) : new TZDate(new Date(), TZ);
    const hour = berlinNow.getHours();
    const minute = berlinNow.getMinutes();
    const month = berlinNow.getMonth();

    const timeSlot = detectTimeSlot(hour, minute);
    const season = detectSeason(month);
    const activePeriods = await detectActivePeriods(berlinNow);

    const hasOverride = activePeriods.some((p) => p.filterSet.override);
    const periodSlugs = activePeriods
        .map((p) => p.filterSet.slug)
        .filter((s): s is string => s !== null);

    let label: string;
    let description: string;

    if (hasOverride) {
        const primaryPeriod = activePeriods.find((p) => p.filterSet.override)!;
        label = primaryPeriod.filterSet.label ?? 'Saisonale Rezepte';
        description = primaryPeriod.filterSet.description ?? label;
    } else {
        label = `${TIME_SLOT_LABELS[timeSlot]} im ${SEASON_LABELS[season]}`;
        description = `${TIME_SLOT_LABELS[timeSlot]} — passend zur Jahreszeit`;
    }

    return {
        context: {
            timeSlot,
            season,
            periods: periodSlugs,
            isHolidayOverride: hasOverride,
            label,
            description,
        },
        activePeriods,
    };
});
