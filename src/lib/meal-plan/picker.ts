// Slot search (KUC-100, KUC-126): only recipes that may fill the slot's meal kind, so
// sauces or drinks are never offered as dinner. Pure; the actions and the dialog use it.
import { allowedFor, mealKindOf } from '@shared/meal-planning/meal-kind';

export type PickerSlot = { slotKey: string; time: string };

type Classified = { categorySlugs?: string[]; tags?: string[] };

/**
 * Recipes allowed for the slot; without a slot all of them. `keepUnknown` keeps recipes
 * without any category (search hits from an index document written before KUC-126).
 */
export function recipesForSlot<T extends Classified>(
    recipes: T[],
    slot: PickerSlot | undefined,
    { keepUnknown = false }: { keepUnknown?: boolean } = {},
): T[] {
    if (!slot) return recipes;
    const kind = mealKindOf({ key: slot.slotKey, time: slot.time });
    return recipes.filter((recipe) => {
        const categorySlugs = recipe.categorySlugs ?? [];
        if (keepUnknown && categorySlugs.length === 0) return true;
        return allowedFor(kind, { categorySlugs, tags: recipe.tags ?? [] });
    });
}
