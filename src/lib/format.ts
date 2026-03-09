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

/**
 * Truncate text to a maximum length, appending an ellipsis if truncated.
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '\u2026';
}
