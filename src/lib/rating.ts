import { cache } from 'react';

import { prisma } from '@shared/prisma';

// ─── Bayesian Average (IMDB-Formel) ─────────────────────────────────────────
//
// WR = (v / (v + m)) * R + (m / (v + m)) * C
//
// R = Durchschnittsbewertung des Rezepts (rating)
// v = Anzahl Bewertungen (ratingCount)
// m = Minimum-Schwelle — Rezepte mit weniger Bewertungen werden stark
//     Richtung globalem Durchschnitt gezogen
// C = Globaler Durchschnitt aller bewerteten Rezepte

/** Default minimum votes threshold */
const DEFAULT_MIN_VOTES = 5;

/**
 * Compute Bayesian weighted rating for a single item.
 *
 * @param rating     Average rating of the item (0–5)
 * @param voteCount  Number of votes/ratings
 * @param globalAvg  Global average rating across all items (C)
 * @param minVotes   Minimum votes threshold (m) — higher = more conservative
 */
export function bayesianAverage(
    rating: number,
    voteCount: number,
    globalAvg: number,
    minVotes = DEFAULT_MIN_VOTES,
): number {
    if (voteCount === 0 && rating === 0) return 0;
    return (
        (voteCount / (voteCount + minVotes)) * rating +
        (minVotes / (voteCount + minVotes)) * globalAvg
    );
}

/**
 * Fetch the global average rating across all published recipes that have
 * at least one rating. Cached per request via React `cache()`.
 */
export const getGlobalAverageRating = cache(async (): Promise<number> => {
    const result = await prisma.recipe.aggregate({
        where: {
            publishedAt: { not: null },
            ratingCount: { gt: 0 },
        },
        _avg: { rating: true },
    });
    return result._avg.rating ?? 3.5;
});
