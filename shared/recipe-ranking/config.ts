/**
 * Tunable numbers of the shared recipe ranking (KUC-126). Start values come from
 * `scripts/probe-week-selection.mjs` (`CONFIG`); `expiring` is new. They are meant to be
 * tuned on beta with the user, so nothing else in this module hard-codes them.
 */

export type RankingConfig = {
    weights: { taste: number; pick: number; season: number; rating: number; expiring: number };
    /** Share of the picks in the search vector: per pick, and the maximum */
    blendPerPick: number;
    blendMax: number;
    /** kNN neighbours when a search vector exists */
    knnK: number;
    /** Candidates taken by rating when there is no search vector */
    noVectorPool: number;
    listSize: number;
    tryAlsoSize: number;
    /** Cosine to a pick above this counts as "almost the same dish" */
    nearDuplicate: number;
    /** Bayes damping: weight of the prior mean */
    bayesM: number;
    /** Prior mean is the global mean only when at least this many recipes have ratings */
    minRatedForGlobalMean: number;
    /** Minimum number of ratings before the rating reason is shown */
    ratingReasonMin: number;
    mmr: {
        /** Cosine penalty ramps from cosStart (0) to 1 (1) */
        cosStart: number;
        cosWeightPick: number;
        cosWeightList: number;
        /** Same dish type as a pick / per earlier card of the same type in the list */
        artPick: number;
        artList: number;
        artListCap: number;
        /** Share of meaningful ingredients in common with listed cards (Jaccard) */
        jaccardStart: number;
        jaccardWeight: number;
    };
};

export const RANKING_CONFIG: RankingConfig = {
    weights: { taste: 4, pick: 3, season: 2, rating: 1.5, expiring: 1.5 },
    blendPerPick: 0.15,
    blendMax: 0.5,
    knnK: 150,
    noVectorPool: 300,
    listSize: 12,
    tryAlsoSize: 5,
    nearDuplicate: 0.8,
    bayesM: 5,
    minRatedForGlobalMean: 20,
    ratingReasonMin: 3,
    mmr: {
        cosStart: 0.5,
        cosWeightPick: 0.5,
        cosWeightList: 0.4,
        artPick: 0.12,
        artList: 0.07,
        artListCap: 3,
        jaccardStart: 0.3,
        jaccardWeight: 0.2,
    },
};
