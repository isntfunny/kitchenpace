import { RANKING_CONFIG, type RankingConfig } from './config';
import { dishTypeOf } from './dish-type';
import { meaningfulIngredientIds, type RankingRecipe } from './features';
import type { Scored } from './score';
import { dot } from './vector';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function jaccard(a: Set<string>, b: Set<string>): number {
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    const union = a.size + b.size - inter;
    return union ? inter / union : 0;
}

/**
 * Greedy MMR over the whole list: each next place goes to the candidate with the best
 * relevance minus a penalty for being close to the picks and to cards already placed
 * (embedding cosine, same dish type, shared ingredients). Returns the full new order.
 * Candidates missing in `pool` or without embedding only get the dish-type penalty.
 */
export function diversify(
    scored: Scored[],
    pool: Map<string, RankingRecipe>,
    picks: RankingRecipe[],
    cfg: RankingConfig = RANKING_CONFIG,
): Scored[] {
    const m = cfg.mmr;
    const ramp = (cosine: number) => clamp01((cosine - m.cosStart) / (1 - m.cosStart));
    const pickEmbeddings = picks.map((p) => p.embedding).filter((e): e is number[] => !!e);
    const pickDishTypes = new Set(picks.map(dishTypeOf));

    // Per candidate: constant part of the penalty, and running maxima against the placed cards
    const rest = scored.map((card) => {
        const recipe = pool.get(card.id);
        const embedding = recipe?.embedding ?? null;
        const simPick = embedding
            ? Math.max(0, ...pickEmbeddings.map((e) => ramp(dot(embedding, e))))
            : 0;
        return {
            card,
            embedding,
            ingredients: recipe ? meaningfulIngredientIds(recipe) : new Set<string>(),
            simPick,
            simList: 0,
            jaccard: 0,
            sameType: 0,
        };
    });

    const ordered: Scored[] = [];
    while (rest.length) {
        let bestIndex = 0;
        let bestValue = -Infinity;
        for (let i = 0; i < rest.length; i++) {
            const c = rest[i]!;
            const penalty =
                m.cosWeightPick * c.simPick +
                m.cosWeightList * c.simList +
                (pickDishTypes.has(c.card.dishType) ? m.artPick : 0) +
                m.artList * Math.min(m.artListCap, c.sameType) +
                m.jaccardWeight * clamp01((c.jaccard - m.jaccardStart) / (1 - m.jaccardStart));
            const value = c.card.relevance - penalty;
            if (value > bestValue) {
                bestValue = value;
                bestIndex = i;
            }
        }
        const [chosen] = rest.splice(bestIndex, 1);
        ordered.push(chosen!.card);
        for (const c of rest) {
            if (c.embedding && chosen!.embedding) {
                c.simList = Math.max(c.simList, ramp(dot(c.embedding, chosen!.embedding)));
            }
            c.jaccard = Math.max(c.jaccard, jaccard(c.ingredients, chosen!.ingredients));
            if (c.card.dishType === chosen!.card.dishType) c.sameType++;
        }
    }
    return ordered;
}
