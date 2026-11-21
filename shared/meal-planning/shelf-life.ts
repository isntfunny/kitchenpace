/**
 * Shelf-life ordering and warnings for the week plan (KUC-96).
 *
 * A planned dish has no shelf life of its own: it is as fresh as its most perishable raw
 * ingredient. Ingredient shelf lives are given in days after the purchase day, and an
 * ingredient is usable up to and including `purchaseDate + days`.
 * Ingredients without a (valid) shelf life are never critical.
 * Nothing here mutates the plan: `suggestShelfLifeOrder` only returns a proposal.
 */
import { diffDays, weekdayNameDe } from './dates';
import { compareSlots, slotKey, type IsoDate, type PlannedSlot, type SlotRef } from './types';

export interface ShelfLifeIngredient {
    ingredientId: string;
    name?: string;
    /** Typical shelf life of the raw ingredient in days after purchase; missing = unknown */
    days?: number | null;
}

export interface ShelfLifeRecipe {
    id: string;
    title?: string;
    ingredients: ShelfLifeIngredient[];
}

export interface ShelfLifeInput {
    slots: PlannedSlot[];
    recipes: ShelfLifeRecipe[];
    /** Day the groceries of this plan are bought */
    purchaseDate: IsoDate;
}

/**
 * - `ok`: fresh enough
 * - `tight`: planned on the last usable day of its most perishable ingredient
 * - `warning`: planned after that day
 * - `unknown`: no usable shelf-life data; not critical
 */
export type FreshnessStatus = 'ok' | 'tight' | 'warning' | 'unknown';

export interface DishFreshness extends SlotRef {
    recipeId: string;
    /** Earliest deadline of the raw ingredients in days after purchase; null = unknown */
    shelfLifeDays: number | null;
    limitingIngredient?: { ingredientId: string; name?: string; days: number };
    /** Days between the purchase day and this slot (never negative) */
    daysAfterPurchase: number;
    status: FreshnessStatus;
    /** German hint for `tight` / `warning` */
    message?: string;
}

const isValidDays = (days: number | null | undefined): days is number =>
    typeof days === 'number' && Number.isFinite(days) && days > 0;

/**
 * Shared ingredients get the same deadline everywhere: if the data differs between recipes
 * the shortest one wins (they are bought together).
 */
function deadlinePerIngredient(recipes: ShelfLifeRecipe[]) {
    const map = new Map<string, { days: number; name?: string }>();
    for (const recipe of recipes) {
        for (const ingredient of recipe.ingredients) {
            if (!isValidDays(ingredient.days)) continue;
            const known = map.get(ingredient.ingredientId);
            if (!known || ingredient.days < known.days) {
                map.set(ingredient.ingredientId, {
                    days: ingredient.days,
                    name: ingredient.name ?? known?.name,
                });
            } else if (!known.name && ingredient.name) {
                known.name = ingredient.name;
            }
        }
    }
    return map;
}

function uniqueFilledSlots(slots: PlannedSlot[]): (PlannedSlot & { recipeId: string })[] {
    const seen = new Set<string>();
    const result: (PlannedSlot & { recipeId: string })[] = [];
    for (const slot of [...slots].sort(compareSlots)) {
        if (!slot.recipeId || seen.has(slotKey(slot))) continue;
        seen.add(slotKey(slot));
        result.push({ ...slot, recipeId: slot.recipeId });
    }
    return result;
}

/** Freshness of every planned dish (chronological). */
export function analyzeShelfLife(input: ShelfLifeInput): DishFreshness[] {
    const deadlines = deadlinePerIngredient(input.recipes);
    const recipes = new Map(input.recipes.map((recipe) => [recipe.id, recipe]));

    return uniqueFilledSlots(input.slots).map((slot): DishFreshness => {
        const daysAfterPurchase = Math.max(0, diffDays(slot.date, input.purchaseDate));
        const base = { date: slot.date, slot: slot.slot, recipeId: slot.recipeId };

        let limiting: DishFreshness['limitingIngredient'];
        for (const ingredient of recipes.get(slot.recipeId)?.ingredients ?? []) {
            const deadline = deadlines.get(ingredient.ingredientId);
            if (!deadline) continue;
            if (!limiting || deadline.days < limiting.days) {
                limiting = {
                    ingredientId: ingredient.ingredientId,
                    name: deadline.name,
                    days: deadline.days,
                };
            }
        }

        if (!limiting) {
            return { ...base, shelfLifeDays: null, daysAfterPurchase, status: 'unknown' };
        }

        const name = limiting.name ?? 'Eine Zutat';
        if (daysAfterPurchase > limiting.days) {
            return {
                ...base,
                shelfLifeDays: limiting.days,
                limitingIngredient: limiting,
                daysAfterPurchase,
                status: 'warning',
                message: `${name} hält nur etwa ${limiting.days} Tage nach dem Einkauf, das Gericht liegt am ${weekdayNameDe(slot.date)}.`,
            };
        }
        if (daysAfterPurchase === limiting.days) {
            return {
                ...base,
                shelfLifeDays: limiting.days,
                limitingIngredient: limiting,
                daysAfterPurchase,
                status: 'tight',
                message: `${name} ist am ${weekdayNameDe(slot.date)} am letzten Tag haltbar.`,
            };
        }
        return {
            ...base,
            shelfLifeDays: limiting.days,
            limitingIngredient: limiting,
            daysAfterPurchase,
            status: 'ok',
        };
    });
}

export interface ShelfLifeMove {
    recipeId: string;
    from: SlotRef;
    to: SlotRef;
}

export interface ShelfLifeOrderSuggestion {
    /** False when the current order already fits; `proposed` then equals the input */
    changed: boolean;
    moves: ShelfLifeMove[];
    /** The plan after applying the proposal (a copy; the input is not modified) */
    proposed: PlannedSlot[];
    /** German explanation, one entry per point */
    reasons: string[];
    warningsBefore: number;
    warningsAfter: number;
    /** Dishes that are still `tight` or `warning` in the proposal */
    remaining: DishFreshness[];
}

const countWarnings = (freshness: DishFreshness[]) =>
    freshness.filter((dish) => dish.status === 'warning').length;

/**
 * Proposes a better order: within each meal type (lunch stays lunch), dishes with a known
 * shelf life are arranged earliest-deadline-first across the slots they already occupy.
 * Dishes in slots with a fixed time and dishes without shelf-life data stay where they are.
 * Deadlines beyond the planned week are treated as equal, so durable dishes never shuffle.
 */
export function suggestShelfLifeOrder(input: ShelfLifeInput): ShelfLifeOrderSuggestion {
    const before = analyzeShelfLife(input);
    const beforeByKey = new Map(before.map((dish) => [slotKey(dish), dish]));
    const filled = uniqueFilledSlots(input.slots);
    const horizon = Math.max(0, ...before.map((dish) => dish.daysAfterPurchase));

    const movable = filled.filter((slot) => {
        const dish = beforeByKey.get(slotKey(slot));
        return !slot.fixedTime && dish?.shelfLifeDays != null;
    });

    const assigned = new Map<string, string>(); // slotKey -> new recipeId
    for (const type of new Set(movable.map((slot) => slot.slot))) {
        const group = movable.filter((slot) => slot.slot === type); // chronological
        const items = group
            .map((slot, index) => ({
                recipeId: slot.recipeId,
                index,
                deadline: Math.min(beforeByKey.get(slotKey(slot))!.shelfLifeDays!, horizon),
            }))
            .sort((a, b) => a.deadline - b.deadline || a.index - b.index);
        group.forEach((slot, i) => assigned.set(slotKey(slot), items[i].recipeId));
    }

    const proposed = input.slots.map((slot) => {
        const next = slot.recipeId ? assigned.get(slotKey(slot)) : undefined;
        return next ? { ...slot, recipeId: next } : { ...slot };
    });

    const moves: ShelfLifeMove[] = [];
    for (const slot of movable) {
        const to = assigned.get(slotKey(slot));
        if (to && to !== slot.recipeId) {
            // Each moved recipe is reported once, at its new position
            const from = movable.find((candidate) => candidate.recipeId === to)!;
            moves.push({
                recipeId: to,
                from: { date: from.date, slot: from.slot },
                to: { date: slot.date, slot: slot.slot },
            });
        }
    }

    const after = analyzeShelfLife({ ...input, slots: proposed });
    const warningsBefore = countWarnings(before);
    const warningsAfter = countWarnings(after);

    if (moves.length === 0 || warningsAfter > warningsBefore) {
        return {
            changed: false,
            moves: [],
            proposed: input.slots.map((slot) => ({ ...slot })),
            reasons: ['Die Reihenfolge passt bereits zur Haltbarkeit der Zutaten.'],
            warningsBefore,
            warningsAfter: warningsBefore,
            remaining: before.filter(
                (dish) => dish.status === 'tight' || dish.status === 'warning',
            ),
        };
    }

    const titles = new Map(input.recipes.map((recipe) => [recipe.id, recipe.title]));
    const afterByRecipe = new Map(after.map((dish) => [dish.recipeId, dish]));
    const reasons: string[] = [];
    for (const move of [...moves].sort((a, b) => compareSlots(a.to, b.to))) {
        if (compareSlots(move.to, move.from) >= 0) continue; // only explain "moved earlier"
        const dish = afterByRecipe.get(move.recipeId);
        const title = titles.get(move.recipeId) ?? 'Ein Gericht';
        const ingredient = dish?.limitingIngredient;
        reasons.push(
            `${title} rückt von ${weekdayNameDe(move.from.date)} auf ${weekdayNameDe(move.to.date)} vor${
                ingredient
                    ? `, weil ${ingredient.name ?? 'eine Zutat'} nur etwa ${ingredient.days} Tage hält`
                    : ''
            }.`,
        );
    }
    reasons.push('Haltbarere Gerichte rücken dafür weiter nach hinten.');
    if (warningsAfter < warningsBefore) {
        reasons.push(`Damit sinken die Warnungen von ${warningsBefore} auf ${warningsAfter}.`);
    }
    const remaining = after.filter((dish) => dish.status === 'tight' || dish.status === 'warning');
    if (warningsAfter > 0) {
        reasons.push(
            `${warningsAfter === 1 ? 'Für ein Gericht bleibt' : `Für ${warningsAfter} Gerichte bleibt`} die Warnung (feste Uhrzeit oder zu kurze Haltbarkeit).`,
        );
    }

    return { changed: true, moves, proposed, reasons, warningsBefore, warningsAfter, remaining };
}
