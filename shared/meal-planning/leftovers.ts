/**
 * Leftover suggestions while planning (KUC-108): "You still have ~100 ml cream that expires
 * on Thursday — how about one of these dishes?"
 *
 * Only reliable data produces a hint: a leftover needs a positive amount in a base unit and
 * an expiry date, and a recipe needs a known amount of that ingredient in the same unit.
 * The hint targets the day before the expiry (or today, if that day has passed) and is only
 * shown while planning, never pushed. Rejected leftovers (by id) never show up again.
 */
import { addDays, diffDays, weekdayNameDe } from './dates';
import { clamp01, DEFAULT_DURATION, durationFit, tasteOf, type DurationConfig } from './scoring';
import type { BaseUnit, Candidate, IsoDate } from './types';

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
    candidates: Candidate[];
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
        const daysLeft = diffDays(leftover.expiresOn, today);
        if (daysLeft < 0 || daysLeft > windowDays) continue; // expired or not soon

        const dayBefore = addDays(leftover.expiresOn, -1);
        const suggestedDate = diffDays(dayBefore, today) < 0 ? today : dayBefore;
        const name = leftover.name ?? 'Zutat';

        const recipes: LeftoverRecipeSuggestion[] = [];
        for (const candidate of input.candidates) {
            const needed = candidate.ingredients.find(
                (ingredient) => ingredient.ingredientId === leftover.ingredientId,
            );
            // Unknown or differently measured amounts are unreliable: no suggestion
            if (
                !needed ||
                typeof needed.amountBase !== 'number' ||
                needed.amountBase <= 0 ||
                needed.unitBase !== leftover.unitBase ||
                needed.amountBase > leftover.amountBase
            ) {
                continue;
            }

            const usage = clamp01(needed.amountBase / leftover.amountBase);
            const taste = tasteOf(candidate.tasteScore);
            const time = durationFit(candidate.totalTime, suggestedDate, duration);
            const score = 3 * usage + 2 * taste + 1 * time;

            const reasons: { text: string; weight: number }[] = [
                {
                    text:
                        usage >= 0.95
                            ? `Verbraucht ${name} komplett (${formatAmount(leftover.amountBase, leftover.unitBase)})`
                            : `${formatAmount(leftover.amountBase, leftover.unitBase)} ${name} reichen, es werden ${formatAmount(needed.amountBase, leftover.unitBase)} gebraucht`,
                    weight: 3 * usage,
                },
            ];
            if (taste >= 0.65)
                reasons.push({ text: 'Passt zu deinem Geschmack', weight: 2 * taste });
            if (time === 1) {
                reasons.push({ text: `Fertig in ${candidate.totalTime} Min.`, weight: 1 });
            }
            reasons.sort((a, b) => b.weight - a.weight);

            recipes.push({
                recipeId: candidate.id,
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
                    : `die ${weekdayNameDe(leftover.expiresOn)} ablaufen`
            }. Wie wäre es mit einem dieser Gerichte?`,
            recipes: recipes.slice(0, maxRecipes),
        });
    }

    return hints.sort(
        (a, b) =>
            a.expiresOn.localeCompare(b.expiresOn) || a.leftoverId.localeCompare(b.leftoverId),
    );
}
