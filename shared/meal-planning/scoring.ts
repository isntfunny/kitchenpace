/** Small scoring helpers shared by the planner and the leftover suggestions. */
import { isWeekend } from './dates';
import type { IsoDate } from './types';

export interface DurationConfig {
    /** Preferred max. total time on weekdays Mon–Fri, minutes */
    weekdayMaxMinutes: number;
    /** Weekdays above this are excluded (unless nothing else is left), minutes */
    weekdayHardMaxMinutes: number;
    /** Weekend dishes below this total time score a bit lower (more time to cook), minutes */
    weekendMinMinutes: number;
}

export const DEFAULT_DURATION: DurationConfig = {
    weekdayMaxMinutes: 40,
    weekdayHardMaxMinutes: 75,
    weekendMinMinutes: 45,
};

/** 0..1: how well a total time fits the day (short on weekdays, longer on weekends). */
export function durationFit(
    totalTime: number,
    date: IsoDate,
    config: DurationConfig = DEFAULT_DURATION,
): number {
    if (isWeekend(date)) {
        if (totalTime >= config.weekendMinMinutes) return 1;
        return 0.6 + (0.4 * Math.max(0, totalTime)) / config.weekendMinMinutes;
    }
    if (totalTime <= config.weekdayMaxMinutes) return 1;
    return Math.max(0, 1 - (totalTime - config.weekdayMaxMinutes) / config.weekdayMaxMinutes);
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Missing or invalid taste scores are neutral. */
export function tasteOf(score: number | undefined): number {
    return typeof score === 'number' && Number.isFinite(score) ? clamp01(score) : 0.5;
}

/** Deterministic hash → [0, 1) (FNV-1a), independent of call order. */
export function hash01(input: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) / 4294967296;
}
