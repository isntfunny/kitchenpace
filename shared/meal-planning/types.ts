/**
 * Narrow input DTOs for the meal-planning logic (KUC-113, KUC-96, KUC-108).
 *
 * Everything here is plain data: no Prisma types, no dates as `Date` objects. The app maps
 * its DB rows to these shapes. Calendar dates are `YYYY-MM-DD` strings in Europe/Berlin
 * (see `dates.ts`), so no function in this module depends on the server's time zone.
 */
import type { Season } from './season';

export type { Season };

/** Calendar date `YYYY-MM-DD` in Europe/Berlin. */
export type IsoDate = string;

export type MealSlotType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

/** Base units for amounts: grams, millilitres, pieces. */
export type BaseUnit = 'g' | 'ml' | 'Stk';

/** One slot of the week plan; empty when `recipeId` is not set. */
export interface PlannedSlot {
    date: IsoDate;
    slot: MealSlotType;
    recipeId?: string;
    /** `HH:mm`. A slot with a fixed time is pinned: the logic never moves it. */
    fixedTime?: string;
}

/** An ingredient of a recipe; amounts are optional because data is often incomplete. */
export interface IngredientAmount {
    ingredientId: string;
    /** Display name, only used for reasons */
    name?: string;
    /** Amount for the recipe's default servings, in the base unit */
    amountBase?: number;
    unitBase?: BaseUnit;
}

/** Leftover / soon-expiring ingredient that the planner should try to use up. */
export interface ExpiringIngredient {
    ingredientId: string;
    name?: string;
    expiresOn: IsoDate;
}

export interface SlotRef {
    date: IsoDate;
    slot: MealSlotType;
}

export const MEAL_SLOT_ORDER: Record<MealSlotType, number> = {
    BREAKFAST: 0,
    LUNCH: 1,
    SNACK: 2,
    DINNER: 3,
};

export const slotKey = (ref: SlotRef) => `${ref.date}|${ref.slot}`;

/** Chronological order: day first, then meal type. */
export function compareSlots(a: SlotRef, b: SlotRef): number {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return MEAL_SLOT_ORDER[a.slot] - MEAL_SLOT_ORDER[b.slot];
}
