/**
 * Format a scaled ingredient amount for display.
 * Integers stay whole, decimals get 1 decimal place.
 */
export function formatScaledAmount(
    amount: number,
    servings: number,
    originalServings: number,
): string {
    const scaled = amount * (servings / originalServings);
    return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
}
