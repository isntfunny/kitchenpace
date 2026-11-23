/**
 * "Verbraucht meine Reste" (KUC-132): how much of the pantry a recipe uses up.
 *
 * Per pantry ingredient the recipe uses a share of the remaining amount (0..1, in the base
 * unit of KUC-98; pieces and grams convert via the piece weight). Each share is weighted by
 * the urgency of the expiry date (KUC-96): what expires today counts three times as much as
 * something without a date. The score is the sum over all pantry ingredients. The same order
 * ranks the search sort `leftovers` and the leftover hints of the plan (KUC-108).
 */
import { diffDays } from '../dates';
import { requiredIngredients, type RankingRecipe } from '../recipe-ranking/features';

import type { BaseUnit, IsoDate } from './types';

export interface PantryStock {
    ingredientId: string;
    /** Display name, e.g. "Hackfleisch" */
    name: string;
    /** Remaining amount in `unitBase`; <= 0 is ignored */
    amountBase: number;
    unitBase: BaseUnit;
    /** Expiry date; missing = not urgent */
    expiresOn?: IsoDate;
    /** Weight of one piece in grams, for converting between pieces and grams */
    gramsPerPiece?: number | null;
}

export interface LeftoverUse {
    ingredientId: string;
    name: string;
    /** Amount the recipe takes from the pantry, in the pantry's unit */
    amount: number;
    unit: BaseUnit;
    /** Used share of the remaining amount, 0..1 */
    share: number;
    /** Urgency weight of the expiry date, 1..3 */
    urgency: number;
}

export interface LeftoverScore {
    score: number;
    /** Most valuable use first */
    uses: LeftoverUse[];
}

/** Days ahead from which an expiry date makes no difference any more */
export const URGENCY_HORIZON_DAYS = 7;
/** Weight of something that expires today; no date = 1 */
export const MAX_URGENCY = 3;

const UNIT_LABEL: Record<BaseUnit, string> = { g: 'g', ml: 'ml', Stk: 'Stk.' };

/** "300 g", "1,5 Stk."; rounded to one decimal. */
export function formatAmount(amount: number, unit: BaseUnit): string {
    const rounded = Math.round(amount * 10) / 10;
    return `${String(rounded).replace('.', ',')} ${UNIT_LABEL[unit]}`;
}

/**
 * Urgency weight of an expiry date: 3 today, falling linearly to 1 at the horizon and
 * beyond; 1 without a date; 0 once expired (spoiled food is never suggested).
 */
export function urgencyWeight(today: IsoDate, expiresOn?: IsoDate): number {
    if (!expiresOn) return 1;
    const daysLeft = diffDays(today, expiresOn);
    if (daysLeft < 0) return 0;
    const closeness = Math.max(0, URGENCY_HORIZON_DAYS - daysLeft) / URGENCY_HORIZON_DAYS;
    return 1 + (MAX_URGENCY - 1) * closeness;
}

/** Converts between base units; only pieces ↔ grams via the piece weight. Unsafe = null. */
export function convertAmount(
    amount: number,
    from: BaseUnit,
    to: BaseUnit,
    gramsPerPiece?: number | null,
): number | null {
    if (from === to) return amount;
    if (!gramsPerPiece || gramsPerPiece <= 0) return null;
    if (from === 'Stk' && to === 'g') return amount * gramsPerPiece;
    if (from === 'g' && to === 'Stk') return amount / gramsPerPiece;
    return null;
}

/** Amount of an ingredient the household needs for one meal of `recipe`; unknown = null. */
export function neededAmount(
    recipe: RankingRecipe,
    ingredientId: string,
    household: number,
): { amount: number; unit: BaseUnit } | null {
    const needed = requiredIngredients(recipe).find((i) => i.id === ingredientId);
    if (!needed || needed.amount === undefined || !needed.unit) return null;
    const factor = recipe.servings && recipe.servings > 0 ? household / recipe.servings : 1;
    return { amount: Math.round(needed.amount * factor * 1000) / 1000, unit: needed.unit };
}

/** Pantry posts of one ingredient added up (in the first post's unit), earliest expiry. */
function groupStock(stock: readonly PantryStock[]): PantryStock[] {
    const byIngredient = new Map<string, PantryStock>();
    for (const item of stock) {
        if (!(item.amountBase > 0) || !Number.isFinite(item.amountBase)) continue;
        const known = byIngredient.get(item.ingredientId);
        if (!known) {
            byIngredient.set(item.ingredientId, { ...item });
            continue;
        }
        const pieceGrams = known.gramsPerPiece ?? item.gramsPerPiece;
        const added = convertAmount(item.amountBase, item.unitBase, known.unitBase, pieceGrams);
        if (added === null) continue; // not comparable: keep the first post only
        known.amountBase += added;
        known.gramsPerPiece = pieceGrams;
        if (item.expiresOn && (!known.expiresOn || item.expiresOn < known.expiresOn)) {
            known.expiresOn = item.expiresOn;
        }
    }
    return [...byIngredient.values()];
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * How much of the pantry one meal of `recipe` uses up. Unknown or unconvertible amounts
 * and expired posts add nothing.
 */
export function scoreLeftoverUse(
    recipe: RankingRecipe,
    stock: readonly PantryStock[],
    options: { household: number; today: IsoDate },
): LeftoverScore {
    const uses: LeftoverUse[] = [];
    for (const item of groupStock(stock)) {
        const urgency = urgencyWeight(options.today, item.expiresOn);
        if (urgency === 0) continue;
        const needed = neededAmount(recipe, item.ingredientId, options.household);
        if (!needed || needed.amount <= 0) continue;
        const inStockUnit = convertAmount(
            needed.amount,
            needed.unit,
            item.unitBase,
            item.gramsPerPiece,
        );
        if (inStockUnit === null || inStockUnit <= 0) continue;
        const amount = Math.min(inStockUnit, item.amountBase);
        uses.push({
            ingredientId: item.ingredientId,
            name: item.name,
            amount: round3(amount),
            unit: item.unitBase,
            share: round3(amount / item.amountBase),
            urgency: round3(urgency),
        });
    }
    uses.sort(
        (a, b) =>
            b.share * b.urgency - a.share * a.urgency ||
            a.ingredientId.localeCompare(b.ingredientId),
    );
    return { score: round3(uses.reduce((sum, use) => sum + use.share * use.urgency, 0)), uses };
}

/** Reason on the card: "Verbraucht 300 g Hackfleisch und 100 ml Sahne"; none = undefined. */
export function leftoverReason(uses: readonly LeftoverUse[], max = 2): string | undefined {
    if (uses.length === 0) return undefined;
    const parts = uses
        .slice(0, max)
        .map((use) => `${formatAmount(use.amount, use.unit)} ${use.name}`);
    const more = uses.length - max;
    const list = parts.join(' und ');
    return `Verbraucht ${list}${more > 0 ? ` (+${more} weitere)` : ''}`;
}

export interface LeftoverRanked {
    id: string;
    score: number;
    reason: string;
}

/**
 * Recipes that use up something from the pantry, best first; recipes that use nothing are
 * left out. Ties keep the incoming order (e.g. by rating).
 */
export function rankByLeftovers(
    recipes: readonly RankingRecipe[],
    stock: readonly PantryStock[],
    options: { household: number; today: IsoDate },
): LeftoverRanked[] {
    const ranked = recipes.flatMap((recipe, index) => {
        const { score, uses } = scoreLeftoverUse(recipe, stock, options);
        const reason = leftoverReason(uses);
        return score > 0 && reason ? [{ id: recipe.id, score, reason, index }] : [];
    });
    ranked.sort((a, b) => b.score - a.score || a.index - b.index);
    return ranked.map(({ id, score, reason }) => ({ id, score, reason }));
}
