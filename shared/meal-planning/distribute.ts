/**
 * Distributes the dishes chosen in the week dialog onto the chosen slots (KUC-126).
 * Pure and deterministic: greedy over all (dish, slot) pairs of the same kind, best fit first.
 */
import { addDays, diffDays, isWeekend } from '../dates';
import { clamp01 } from '../math';

import type { MealKind } from './meal-kind';
import { durationFit } from './scoring';
import type { IsoDate } from './types';

export type SelectionSlot = { date: IsoDate; slotKey: string; kind: MealKind };

export type SelectionPick = {
    recipeId: string;
    kind: MealKind;
    servings: number;
    effort: number;
    totalTime: number;
    mainCategory: string | null;
    dishType: string;
    shortestShelfLifeDays: number | null;
    sideRecipeId?: string;
};

export type PlannedEntry = {
    date: IsoDate;
    slotKey: string;
    recipeId: string;
    servings: number;
    /** Index in `entries` of the main entry this leftover belongs to */
    leftoverOf?: number;
    /** Index in `entries` of the main entry this side dish belongs to */
    sideOf?: number;
};

/** Weights of the fit of a dish to a slot */
const FIT = { effort: 1, duration: 1, fresh: 1.5, variety: 1 };

// The leftover rule (KUC-108, KUC-126, KUC-137): a meal for `eaters` people uses `eaters`
// servings, each further day of leftovers another `eaters`.

/** Whole extra days a dish feeds the household after the first meal. */
export function leftoverDays(servings: number, household: number): number {
    const h = Math.max(1, household);
    return Math.max(0, Math.floor((servings - h) / h));
}

/** Servings to cook so that `eaters` people eat once plus `days` leftover days (inverse of `leftoverDays`). */
export function servingsForLeftoverDays(eaters: number, days: number): number {
    return Math.max(1, eaters) * (1 + Math.max(0, days));
}

/** Servings when a dish is cooked for two meals: one more meal, at most 100 servings. */
export function leftoverCookServings(servings: number): number {
    return Math.min(100, servingsForLeftoverDays(servings, 1));
}

type Placed = { date: IsoDate; kind: MealKind; mainCategory: string | null; dishType: string };

export function distributeSelection(
    picks: SelectionPick[],
    slots: SelectionSlot[],
    ctx: { household: number; purchaseDate: IsoDate },
): { entries: PlannedEntry[]; unplaced: string[] } {
    const keyOf = (s: { date: IsoDate; slotKey: string }) => `${s.date}|${s.slotKey}`;
    // Unique slots in chronological order; the input order breaks ties within a day
    const seen = new Set<string>();
    const ordered = slots
        .map((slot, index) => ({ slot, index }))
        .filter(({ slot }) => !seen.has(keyOf(slot)) && !!seen.add(keyOf(slot)))
        .sort((a, b) =>
            a.slot.date < b.slot.date ? -1 : a.slot.date > b.slot.date ? 1 : a.index - b.index,
        )
        .map(({ slot }) => slot);

    const used = new Set<string>();
    const placed: Placed[] = [];
    const entries: PlannedEntry[] = [];
    const remaining = picks.map((_, i) => i);

    /** Slots for the leftover days after a main entry in `first`, or null if they do not fit. */
    function leftoverSlots(
        pick: SelectionPick,
        first: SelectionSlot,
        count: number,
    ): SelectionSlot[] | null {
        const taken = new Set<string>([keyOf(first)]);
        const free = (s: SelectionSlot) =>
            s.kind === pick.kind && !used.has(keyOf(s)) && !taken.has(keyOf(s));
        const found: SelectionSlot[] = [];
        let previous = first;
        for (let n = 0; n < count; n++) {
            const nextDay = addDays(previous.date, 1);
            const next =
                ordered.find((s) => s.date === nextDay && s.slotKey === first.slotKey && free(s)) ??
                ordered.find((s) => s.date > previous.date && free(s));
            if (!next) return null;
            taken.add(keyOf(next));
            found.push(next);
            previous = next;
        }
        return found;
    }

    const varietyOf = (pick: SelectionPick, date: IsoDate) =>
        placed.some(
            (p) =>
                p.kind === pick.kind &&
                Math.abs(diffDays(date, p.date)) === 1 &&
                ((pick.mainCategory !== null && p.mainCategory === pick.mainCategory) ||
                    p.dishType === pick.dishType),
        )
            ? 1
            : 0;

    function fitOf(pick: SelectionPick, date: IsoDate): number {
        const effortFit = isWeekend(date) ? pick.effort : 1 - pick.effort;
        const perishable =
            pick.shortestShelfLifeDays == null ? 0 : clamp01(1 - pick.shortestShelfLifeDays / 7);
        const freshFit = 1 - perishable * clamp01(diffDays(ctx.purchaseDate, date) / 6);
        return (
            FIT.effort * effortFit +
            FIT.duration * durationFit(pick.totalTime, date) +
            FIT.fresh * freshFit -
            FIT.variety * varietyOf(pick, date)
        );
    }

    while (remaining.length) {
        let best: {
            fit: number;
            pickIndex: number;
            slot: SelectionSlot;
            leftovers: SelectionSlot[];
        } | null = null;
        for (const pickIndex of remaining) {
            const pick = picks[pickIndex]!;
            const count = leftoverDays(pick.servings, ctx.household);
            for (const slot of ordered) {
                if (slot.kind !== pick.kind || used.has(keyOf(slot))) continue;
                const leftovers = leftoverSlots(pick, slot, count);
                if (!leftovers) continue;
                const fit = fitOf(pick, slot.date);
                if (!best || fit > best.fit) best = { fit, pickIndex, slot, leftovers };
            }
        }
        if (!best) break;

        const pick = picks[best.pickIndex]!;
        remaining.splice(remaining.indexOf(best.pickIndex), 1);
        const mainIndex = entries.length;
        entries.push({
            date: best.slot.date,
            slotKey: best.slot.slotKey,
            recipeId: pick.recipeId,
            servings: pick.servings,
        });
        if (pick.sideRecipeId) {
            entries.push({
                date: best.slot.date,
                slotKey: best.slot.slotKey,
                recipeId: pick.sideRecipeId,
                servings: pick.servings,
                sideOf: mainIndex,
            });
        }
        for (const s of [best.slot, ...best.leftovers]) {
            used.add(keyOf(s));
            placed.push({
                date: s.date,
                kind: pick.kind,
                mainCategory: pick.mainCategory,
                dishType: pick.dishType,
            });
        }
        for (const s of best.leftovers) {
            entries.push({
                date: s.date,
                slotKey: s.slotKey,
                recipeId: pick.recipeId,
                servings: ctx.household,
                leftoverOf: mainIndex,
            });
        }
    }

    return { entries, unplaced: remaining.map((i) => picks[i]!.recipeId) };
}
