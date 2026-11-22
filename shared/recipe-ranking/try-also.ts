import { hash01 } from '../meal-planning/scoring';

import { RANKING_CONFIG } from './config';
import { dishTypeOf } from './dish-type';
import { styleTags, type RankingRecipe } from './features';
import { bayesRating, dot, meanVector, normalize } from './vector';

/**
 * "Probier auch mal": well-rated dishes far from the user's usual taste.
 *
 * - Candidates with a damped rating of at least `minBayes` come first, ordered by distance
 *   (smallest cosine to the profile, else to the mean of the picks, else a seeded hash).
 *   Too few of them: the rest follow by highest damped rating.
 * - At most one per dish type and per style tag.
 * - The caller passes a pool without the dishes already listed; picks are skipped here.
 */
export function pickTryAlso(
    pool: RankingRecipe[],
    ctx: {
        profile: number[] | null;
        picks: RankingRecipe[];
        globalMean: number;
        seed: string;
        need: number;
        minBayes: number;
    },
): { id: string; reason: string }[] {
    const pickIds = new Set(ctx.picks.map((p) => p.id));
    const pickEmbeddings = ctx.picks.map((p) => p.embedding).filter((e): e is number[] => !!e);
    const anchor =
        ctx.profile && ctx.profile.some((x) => x !== 0)
            ? normalize(ctx.profile)
            : pickEmbeddings.length
              ? normalize(meanVector(pickEmbeddings))
              : null;

    const rows = pool
        .filter((r) => !pickIds.has(r.id))
        .map((r) => ({
            r,
            bayes: bayesRating(r.rating, r.ratingCount, ctx.globalMean, RANKING_CONFIG.bayesM),
            // Smaller = farther away = better; unknown embeddings count as unrelated (0)
            distance: anchor
                ? r.embedding
                    ? dot(anchor, r.embedding)
                    : 0
                : hash01(`${ctx.seed}|${r.id}`),
        }));

    const good = rows
        .filter((x) => x.bayes >= ctx.minBayes)
        .sort((a, b) => a.distance - b.distance);
    const rest = rows.filter((x) => x.bayes < ctx.minBayes).sort((a, b) => b.bayes - a.bayes);

    const out: { id: string; reason: string }[] = [];
    const usedTypes = new Set<string>();
    const usedStyles = new Set<string>();
    for (const { r } of [...good, ...rest]) {
        if (out.length >= ctx.need) break;
        const type = dishTypeOf(r);
        const styles = styleTags(r);
        if (usedTypes.has(type) || styles.some((s) => usedStyles.has(s))) continue;
        usedTypes.add(type);
        for (const s of styles) usedStyles.add(s);
        out.push({ id: r.id, reason: `Mal was anderes: ${styles[0] ?? type}` });
    }
    return out;
}
