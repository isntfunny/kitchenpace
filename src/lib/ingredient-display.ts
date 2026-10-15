import { parseQuantityNumber, isNumericQuantity } from './ingredients/quantities';

/**
 * Returns singular or plural ingredient name based on amount.
 * Uses pluralName when amount > 1, otherwise singular name.
 */
export function ingredientDisplayName(
    name: string,
    pluralName: string | null | undefined,
    amount: string,
): string {
    if (!pluralName) return name;
    const parsed = parseAmount(amount);
    if (parsed === null || parsed <= 1) return name;
    return pluralName;
}

export function parseAmount(amount: string): number | null {
    if (!isNumericQuantity(amount)) return null;
    // Nutrition remains an estimate using the lower end of a stated range.
    return parseQuantityNumber(amount.trim().split(/\s*[-–]\s*/)[0]);
}
