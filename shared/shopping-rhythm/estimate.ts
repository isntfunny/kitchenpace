/**
 * Purchase rhythm of one item, from its PURCHASED timestamps.
 *
 * - Purchases are collapsed to Berlin calendar days (several check-offs on one day, e.g. in
 *   the app and in Bring!, are one purchase) and only the last `maxPurchases` days count.
 * - interval = median of the gaps between consecutive purchase days.
 * - spread = MAD / median (median absolute deviation of the gaps, relative to the interval).
 *   Above `maxSpread` (0.25) the item is "irregular": 7 d and 14 d gaps (0.33) are irregular,
 *   7 d and 9 d gaps (0.125) are regular.
 * - Fewer than `minPurchases` (3) purchase days: no estimate.
 */
import { diffDays, toBerlinDate } from '../dates';

import {
    DEFAULT_RHYTHM_CONFIG,
    type PurchaseEvent,
    type RhythmConfig,
    type RhythmEstimate,
} from './types';

export function median(values: readonly number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function estimateRhythm(
    purchases: readonly PurchaseEvent[],
    config: Partial<RhythmConfig> = {},
): RhythmEstimate {
    const cfg = { ...DEFAULT_RHYTHM_CONFIG, ...definedOnly(config) };
    const days = [...new Set(purchases.map((p) => toBerlinDate(p.occurredAt)))]
        .sort()
        .slice(-cfg.maxPurchases);

    if (days.length < cfg.minPurchases) return { kind: 'insufficient', purchaseCount: days.length };

    const gaps = days.slice(1).map((day, i) => diffDays(days[i], day));
    const intervalDays = median(gaps);
    const spread = median(gaps.map((gap) => Math.abs(gap - intervalDays))) / intervalDays;

    if (intervalDays < cfg.minIntervalDays || spread > cfg.maxSpread) {
        return { kind: 'irregular', spread, purchaseCount: days.length };
    }
    return {
        kind: 'regular',
        intervalDays,
        spread,
        purchaseCount: days.length,
        lastPurchaseDate: days[days.length - 1],
    };
}

function definedOnly<T extends object>(value: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, v]) => v !== undefined),
    ) as Partial<T>;
}
