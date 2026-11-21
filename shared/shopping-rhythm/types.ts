export type IsoDate = string;

/** One PURCHASED history event of an item (any origin, Bring! included). */
export interface PurchaseEvent {
    occurredAt: Date;
}

export type RhythmEstimate =
    | {
          kind: 'regular';
          /** Median gap between purchase days, in days (may be x.5). */
          intervalDays: number;
          /** Relative spread: median absolute deviation / median. */
          spread: number;
          /** Number of distinct purchase days the estimate is based on. */
          purchaseCount: number;
          lastPurchaseDate: IsoDate;
      }
    | { kind: 'insufficient'; purchaseCount: number }
    | { kind: 'irregular'; spread: number; purchaseCount: number };

export interface RhythmConfig {
    /** Minimum number of distinct purchase days (default 3). */
    minPurchases: number;
    /** Only the most recent N purchase days are used, so a changed habit wins (default 8). */
    maxPurchases: number;
    /** Above this relative spread (MAD / median) an item counts as irregular (default 0.25). */
    maxSpread: number;
    /** Rhythms shorter than this many days are ignored (default 2). */
    minIntervalDays: number;
    /** Share of the interval after which an item is due (default 0.8). */
    dueFraction: number;
    /** Not suggested any more once this many intervals passed since the last purchase (default 3). */
    staleFactor: number;
}

export const DEFAULT_RHYTHM_CONFIG: RhythmConfig = {
    minPurchases: 3,
    maxPurchases: 8,
    maxSpread: 0.25,
    minIntervalDays: 2,
    dueFraction: 0.8,
    staleFactor: 3,
};

/** Suggestion shown under "Vorschläge" (DTO of `getRhythmSuggestions`). */
export interface RhythmSuggestion {
    itemKey: string;
    ingredientId?: string;
    name: string;
    /** German reason, e.g. "jede Woche" or "alle ~12 Tage · zuletzt vor 11 T." */
    reason: string;
    intervalDays: number;
    lastPurchasedAt: Date;
}
