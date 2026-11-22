import { servingsForLeftoverDays } from '@shared/meal-planning/distribute';

/**
 * Servings cooked when a dish is cooked for two meals: the same rule as
 * cookForTwoMeals on the server (one more meal, at most 100 servings).
 */
export function leftoverCookServings(servings: number): number {
    return Math.min(100, servingsForLeftoverDays(servings, 1));
}
