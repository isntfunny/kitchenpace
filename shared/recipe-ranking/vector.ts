import { RANKING_CONFIG, type RankingConfig } from './config';

export function dot(a: readonly number[], b: readonly number[]): number {
    let d = 0;
    for (let i = 0; i < a.length; i++) d += a[i]! * b[i]!;
    return d;
}

/** Cosine similarity; 0 for vectors of different length or without magnitude. */
export function cosine(a: readonly number[], b: readonly number[]): number {
    if (a.length === 0 || a.length !== b.length) return 0;
    let dotAB = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotAB += a[i]! * b[i]!;
        normA += a[i]! * a[i]!;
        normB += b[i]! * b[i]!;
    }
    if (normA === 0 || normB === 0) return 0;
    return dotAB / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** A usable taste profile (or embedding): present, not empty, not all zero. */
export function hasTasteProfile<T extends readonly number[]>(v: T | null | undefined): v is T {
    return !!v && v.length > 0 && v.some((x) => x !== 0);
}

export function normalize(v: number[]): number[] {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return n ? v.map((x) => x / n) : v;
}

export function meanVector(vs: number[][]): number[] {
    return vs[0]!.map((_, i) => vs.reduce((s, v) => s + v[i]!, 0) / vs.length);
}

/**
 * `q = normalize(a · profile + b · mean(picks))` with `a = 1 − b` and
 * `b = min(blendMax, blendPerPick · n)`. Without a profile it is the normalised mean of the
 * picks, without both `null`.
 */
export function searchVector(
    profile: number[] | null,
    picks: number[][],
    cfg: RankingConfig = RANKING_CONFIG,
): number[] | null {
    const taste = hasTasteProfile(profile) ? normalize(profile) : null;
    if (!picks.length) return taste;
    const centre = meanVector(picks);
    if (!taste) return normalize(centre);
    const b = Math.min(cfg.blendMax, cfg.blendPerPick * picks.length);
    return normalize(taste.map((x, i) => (1 - b) * x + b * centre[i]!));
}

/** Bayes-damped mean rating `(R · n + m · C) / (n + m)`. */
export function bayesRating(rating: number, count: number, globalMean: number, m: number): number {
    return (rating * count + m * globalMean) / (count + m);
}

/** Rating-weighted mean over all rated recipes; meaningless (3.5) below `minRated` recipes. */
export function globalMeanRating(
    rated: { rating: number; ratingCount: number }[],
    minRated: number,
): number {
    const withRatings = rated.filter((r) => r.ratingCount > 0);
    if (withRatings.length < Math.max(1, minRated)) return 3.5;
    const total = withRatings.reduce((s, r) => s + r.ratingCount, 0);
    return withRatings.reduce((s, r) => s + r.rating * r.ratingCount, 0) / total;
}
