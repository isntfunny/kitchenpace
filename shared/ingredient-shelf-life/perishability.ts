import type { StorageTypeValue } from './schema';

/**
 * How urgently an ingredient has to be used, derived from the shelf life at its
 * usual storage type. Computed on the fly, never stored.
 * - IMMEDIATE (sofort): up to 2 days
 * - HIGH (hoch): 3 to 4 days
 * - MEDIUM (mittel): 5 to 21 days
 * - LOW (unkritisch): longer
 */
export type Perishability = 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';

export const PERISHABILITY_LABELS: Record<Perishability, string> = {
    IMMEDIATE: 'sofort',
    HIGH: 'hoch',
    MEDIUM: 'mittel',
    LOW: 'unkritisch',
};

export function perishabilityForDays(days: number): Perishability {
    if (days <= 2) return 'IMMEDIATE';
    if (days <= 4) return 'HIGH';
    if (days <= 21) return 'MEDIUM';
    return 'LOW';
}

/**
 * Returns null when the ingredient has no usual storage type or no shelf life
 * for it (not assessed yet, or not applicable) — callers must handle that
 * instead of failing.
 */
export function perishability(
    defaultStorage: StorageTypeValue | null | undefined,
    storageLives: ReadonlyArray<{ storage: StorageTypeValue; days: number }>,
): Perishability | null {
    if (!defaultStorage) return null;
    const life = storageLives.find((entry) => entry.storage === defaultStorage);
    if (!life) return null;
    return perishabilityForDays(life.days);
}
