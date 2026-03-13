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

function parseAmount(amount: string): number | null {
    const trimmed = amount.trim();
    if (!trimmed) return null;

    // Fractions: "1/2" → 0.5
    if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        const n = parseFloat(parts[0]);
        const d = parseFloat(parts[1]);
        if (!isNaN(n) && !isNaN(d) && d !== 0) return n / d;
    }

    // Ranges: "2-3" → take first number
    const first = parseFloat(trimmed);
    return isNaN(first) ? null : first;
}
