import { portionFactor, scaleQuantity } from './ingredients/quantities';

/**
 * Format a scaled ingredient amount for display.
 * Integers stay whole, decimals get 1 decimal place.
 */
export function formatScaledAmount(
    amount: number,
    servings: number,
    originalServings: number,
): string {
    return scaleQuantity(String(amount), portionFactor(servings, originalServings));
}
