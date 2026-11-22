import { SEASON_NAMES_DE } from '../meal-planning/dates';
import type { Season } from '../meal-planning/types';

import { RANKING_CONFIG, type RankingConfig } from './config';
import { dishTypeOf, type DishType } from './dish-type';
import {
    meaningfulIngredientIds,
    requiredIngredients,
    styleTags,
    type RankingRecipe,
} from './features';
import { bayesRating, dot } from './vector';

export type ScoreContext = {
    /** Normalised taste profile, or null */
    profile: number[] | null;
    picks: RankingRecipe[];
    season: Season;
    globalMean: number;
    /** Pantry ingredients that expire soon */
    expiring: { id: string; name: string }[];
    withReasons: boolean;
};

export type Scored = {
    id: string;
    /** 0..1 */
    relevance: number;
    reason?: string;
    dishType: DishType;
    parts: { taste: number; pick: number; season: number; rating: number; expiring: number };
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Season tag of the recipe vs. the season of the week: 1 fits, 0 only other seasons, else 0.5. */
function seasonFit(r: RankingRecipe, season: Season): number {
    const own = SEASON_NAMES_DE[season];
    if (r.tags.includes(own)) return 1;
    const others = Object.values(SEASON_NAMES_DE).filter((n) => n !== own);
    return r.tags.some((t) => others.includes(t)) ? 0 : 0.5;
}

/**
 * Relevance 0..1 of each candidate with its parts and, if asked, a short reason. Returned
 * sorted by relevance, best first (stable). Diversity is added by `diversify`.
 */
export function scoreCandidates(
    pool: RankingRecipe[],
    ctx: ScoreContext,
    cfg: RankingConfig = RANKING_CONFIG,
): Scored[] {
    const W = cfg.weights;
    const hasStock = ctx.expiring.length > 0;
    const weightSum = W.taste + W.pick + W.season + W.rating + (hasStock ? W.expiring : 0);

    // Taste: cosine to the profile, min-max scaled over the pool
    const tasteCos = pool.map((r) =>
        ctx.profile && r.embedding ? dot(ctx.profile, r.embedding) : null,
    );
    const known = tasteCos.filter((c): c is number => c !== null);
    const lo = known.length ? Math.min(...known) : 0;
    const hi = known.length ? Math.max(...known) : 0;

    const pickIngredients = new Set(ctx.picks.flatMap((p) => [...meaningfulIngredientIds(p)]));
    const pickTypes = new Set(ctx.picks.map(dishTypeOf));
    const pickStyles = new Set(ctx.picks.flatMap(styleTags));
    const pickEmbeddings = ctx.picks.map((p) => p.embedding).filter((e): e is number[] => !!e);
    const expiringIds = new Map(ctx.expiring.map((e) => [e.id, e.name]));

    const scored = pool.map((r, i): Scored => {
        const dishType = dishTypeOf(r);
        const cos = tasteCos[i];
        const tasteS = cos !== null && cos !== undefined && hi > lo ? (cos - lo) / (hi - lo) : 0.5;

        let pickS = 0.5;
        let shared = 0;
        if (ctx.picks.length) {
            shared = [...meaningfulIngredientIds(r)].filter((x) => pickIngredients.has(x)).length;
            const nearest =
                r.embedding && pickEmbeddings.length
                    ? Math.max(...pickEmbeddings.map((e) => dot(r.embedding!, e)))
                    : 0;
            pickS = clamp01(
                0.5 +
                    (0.5 * Math.min(shared, 3)) / 3 -
                    (pickTypes.has(dishType) ? 0.2 : 0) -
                    (styleTags(r).some((s) => pickStyles.has(s)) ? 0.1 : 0) -
                    (nearest > cfg.nearDuplicate ? 0.5 : 0),
            );
        }

        const seasonS = seasonFit(r, ctx.season);
        const ratingS = clamp01(
            (bayesRating(r.rating, r.ratingCount, ctx.globalMean, cfg.bayesM) - 1) / 4,
        );

        const usedStock = hasStock
            ? requiredIngredients(r).filter((x) => expiringIds.has(x.id))
            : [];
        const expiringS = Math.min(1, usedStock.length / 2);

        const relevance =
            (W.taste * tasteS +
                W.pick * pickS +
                W.season * seasonS +
                W.rating * ratingS +
                (hasStock ? W.expiring * expiringS : 0)) /
            weightSum;

        let reason: string | undefined;
        if (ctx.withReasons) {
            // The strongest contribution above neutral; ties keep this order
            const reasons = [
                ctx.profile && {
                    v: W.taste * (tasteS - 0.5) * 2,
                    text: 'Passt zu deinem Geschmack',
                },
                shared > 0 &&
                    ctx.picks.length > 0 && {
                        v: W.pick * (pickS - 0.5) * 2,
                        text: `Teilt ${shared} ${shared === 1 ? 'Zutat' : 'Zutaten'} mit deiner Auswahl`,
                    },
                seasonS === 1 && { v: W.season, text: `Passt zum ${SEASON_NAMES_DE[ctx.season]}` },
                r.ratingCount >= cfg.ratingReasonMin &&
                    ratingS > 0.7 && { v: W.rating * (ratingS - 0.5) * 2, text: 'Gut bewertet' },
                usedStock.length > 0 && {
                    v: W.expiring * expiringS,
                    text: `Verbraucht ${[...new Set(usedStock.map((x) => expiringIds.get(x.id)!))]
                        .slice(0, 2)
                        .join(', ')}`,
                },
            ]
                .filter((x): x is { v: number; text: string } => !!x && x.v > 0)
                .sort((a, b) => b.v - a.v);
            reason = reasons[0]?.text ?? 'Gut für die Woche';
        }

        return {
            id: r.id,
            relevance,
            reason,
            dishType,
            parts: {
                taste: tasteS,
                pick: pickS,
                season: seasonS,
                rating: ratingS,
                expiring: expiringS,
            },
        };
    });

    return scored.sort((a, b) => b.relevance - a.relevance);
}
