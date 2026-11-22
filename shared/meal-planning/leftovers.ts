/**
 * Leftover suggestions while planning (KUC-108): "You still have ~100 ml cream that expires
 * on Thursday — how about one of these dishes?"
 *
 * Only reliable data produces a hint: a leftover needs a positive amount in a base unit and
 * an expiry date, and a recipe needs a known amount of that ingredient in the same unit.
 * The hint targets the day before the expiry (or today, if that day has passed) and is only
 * shown while planning, never pushed. Rejected leftovers (by id) never show up again.
 */
import { addDays, diffDays, weekdayLong } from '../dates';
import { clamp01 } from '../math';
import { requiredIngredients, type RankingRecipe } from '../recipe-ranking/features';
import { dot } from '../recipe-ranking/vector';

import { DEFAULT_DURATION, durationFit, tasteOf, type DurationConfig } from './scoring';
import type { BaseUnit, IsoDate } from './types';

export interface Leftover {
    /** Id of this leftover (e.g. pantry entry), used to remember rejections */
    id: string;
    ingredientId: string;
    name?: string;
    /** Remaining amount in the base unit; missing/<= 0 = unreliable */
    amountBase?: number;
    unitBase?: BaseUnit;
    /** Expiry date; missing = unreliable */
    expiresOn?: IsoDate;
}

export interface LeftoverInput {
    leftovers: Leftover[];
    /** Recipes with their amounts (`loadRankingRecipes(ids, db, { amounts: true })`) */
    recipes: readonly RankingRecipe[];
    /** Normalised taste profile; null = no profile, every recipe tastes neutral */
    profile: readonly number[] | null;
    /** Eaters of one meal: amounts are scaled from the recipe's servings to this */
    household: number;
    today: IsoDate;
    /** Leftovers the user dismissed */
    rejectedLeftoverIds?: readonly string[];
    /** Only leftovers expiring within this many days are offered (default 3) */
    windowDays?: number;
    /** Max. recipes per hint (default 3) */
    maxRecipes?: number;
    duration?: DurationConfig;
}

export interface LeftoverRecipeSuggestion {
    recipeId: string;
    score: number;
    /** 1–2 short German reasons */
    reasons: string[];
}

export interface LeftoverHint {
    leftoverId: string;
    ingredientId: string;
    expiresOn: IsoDate;
    /** Day to offer/plan the dish: the day before expiry, but not before today */
    suggestedDate: IsoDate;
    message: string;
    recipes: LeftoverRecipeSuggestion[];
}

const UNIT_LABEL: Record<BaseUnit, string> = { g: 'g', ml: 'ml', Stk: 'Stk.' };

function formatAmount(amount: number, unit: BaseUnit): string {
    const rounded = Math.round(amount * 10) / 10;
    return `${String(rounded).replace('.', ',')} ${UNIT_LABEL[unit]}`;
}

/** Taste 0..1 from the cosine of profile and recipe embedding; unknown = undefined. */
export function tasteScoreOf(
    profile: readonly number[] | null,
    embedding: readonly number[] | null,
): number | undefined {
    if (!profile || !embedding || embedding.length === 0) return undefined;
    // Both are unit length, so the dot product is the cosine; other lengths do not compare
    const cosine = profile.length === embedding.length ? dot(profile, embedding) : 0;
    return Number.isFinite(cosine) ? clamp01((cosine + 1) / 2) : undefined;
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

export function isReliableLeftover(
    leftover: Leftover,
): leftover is Leftover & { amountBase: number; unitBase: BaseUnit; expiresOn: IsoDate } {
    return (
        typeof leftover.amountBase === 'number' &&
        Number.isFinite(leftover.amountBase) &&
        leftover.amountBase > 0 &&
        !!leftover.unitBase &&
        !!leftover.expiresOn
    );
}

/** Hints for soon-expiring leftovers, most urgent first. Leftovers without a match yield none. */
export function suggestLeftoverRecipes(input: LeftoverInput): LeftoverHint[] {
    const { today, windowDays = 3, maxRecipes = 3, duration = DEFAULT_DURATION } = input;
    const rejected = new Set(input.rejectedLeftoverIds ?? []);
    const hints: LeftoverHint[] = [];

    for (const leftover of input.leftovers) {
        if (rejected.has(leftover.id) || !isReliableLeftover(leftover)) continue;
        const daysLeft = diffDays(today, leftover.expiresOn);
        if (daysLeft < 0 || daysLeft > windowDays) continue; // expired or not soon

        const dayBefore = addDays(leftover.expiresOn, -1);
        const suggestedDate = diffDays(today, dayBefore) < 0 ? today : dayBefore;
        const name = leftover.name ?? 'Zutat';

        const recipes: LeftoverRecipeSuggestion[] = [];
        for (const recipe of input.recipes) {
            const needed = neededAmount(recipe, leftover.ingredientId, input.household);
            // Unknown or differently measured amounts are unreliable: no suggestion
            if (
                !needed ||
                needed.amount <= 0 ||
                needed.unit !== leftover.unitBase ||
                needed.amount > leftover.amountBase
            ) {
                continue;
            }

            const usage = clamp01(needed.amount / leftover.amountBase);
            const taste = tasteOf(tasteScoreOf(input.profile, recipe.embedding));
            const time = durationFit(recipe.totalTime, suggestedDate, duration);
            const score = 3 * usage + 2 * taste + 1 * time;

            const reasons: { text: string; weight: number }[] = [
                {
                    text:
                        usage >= 0.95
                            ? `Verbraucht ${name} komplett (${formatAmount(leftover.amountBase, leftover.unitBase)})`
                            : `${formatAmount(leftover.amountBase, leftover.unitBase)} ${name} reichen, es werden ${formatAmount(needed.amount, leftover.unitBase)} gebraucht`,
                    weight: 3 * usage,
                },
            ];
            if (taste >= 0.65)
                reasons.push({ text: 'Passt zu deinem Geschmack', weight: 2 * taste });
            if (time === 1) {
                reasons.push({ text: `Fertig in ${recipe.totalTime} Min.`, weight: 1 });
            }
            reasons.sort((a, b) => b.weight - a.weight);

            recipes.push({
                recipeId: recipe.id,
                score: Math.round(score * 1000) / 1000,
                reasons: reasons.slice(0, 2).map((reason) => reason.text),
            });
        }

        if (recipes.length === 0) continue;
        recipes.sort((a, b) => b.score - a.score || a.recipeId.localeCompare(b.recipeId));

        hints.push({
            leftoverId: leftover.id,
            ingredientId: leftover.ingredientId,
            expiresOn: leftover.expiresOn,
            suggestedDate,
            message: `Du hast noch ca. ${formatAmount(leftover.amountBase, leftover.unitBase)} ${name}, ${
                daysLeft === 0
                    ? 'die heute ablaufen'
                    : `die ${weekdayLong(leftover.expiresOn)} ablaufen`
            }. Wie wäre es mit einem dieser Gerichte?`,
            recipes: recipes.slice(0, maxRecipes),
        });
    }

    return hints.sort(
        (a, b) =>
            a.expiresOn.localeCompare(b.expiresOn) || a.leftoverId.localeCompare(b.leftoverId),
    );
}
