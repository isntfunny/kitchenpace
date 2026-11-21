// Allowed icon names for ingredients (KUC-125): the IconOven names without the
// "iconoven:" prefix. The lists are generated from scripts/ingredient-icons/manifest.json.

import {
    EXTRA_FOOD_ICON_NAMES,
    FOOD_ICON_NAMES,
    HOUSEHOLD_ICON_NAMES,
    NOT_FOR_ENRICHMENT_ICON_NAMES,
} from './names.generated';

export {
    EXTRA_FOOD_ICON_NAMES,
    FOOD_ICON_NAMES,
    HOUSEHOLD_ICON_NAMES,
    NOT_FOR_ENRICHMENT_ICON_NAMES,
};

export const ICON_NAMES = [
    ...FOOD_ICON_NAMES,
    ...EXTRA_FOOD_ICON_NAMES,
    ...HOUSEHOLD_ICON_NAMES,
] as const;

export type IngredientIconName = (typeof ICON_NAMES)[number];

/** Last resort of the fallback chain: a neutral food icon */
export const FALLBACK_ICON: IngredientIconName = 'fork-knife';

const ALLOWED = new Set<string>(ICON_NAMES);
const HOUSEHOLD = new Set<string>(HOUSEHOLD_ICON_NAMES);

export function isIngredientIconName(value: unknown): value is IngredientIconName {
    return typeof value === 'string' && ALLOWED.has(value);
}

/**
 * Names the enrichment model may pick: all allowed icons except household
 * items, utensils, marks and the neutral fallback (no answer means fallback).
 */
export const ENRICHMENT_ICON_NAMES: readonly IngredientIconName[] = ICON_NAMES.filter(
    (name) => !HOUSEHOLD.has(name) && !NOT_FOR_ENRICHMENT_ICON_NAMES.includes(name),
);
