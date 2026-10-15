/** Values from query parameters and Cast messages are untrusted input. */
export function servingCount(value: unknown, fallback: number): number {
    const number =
        typeof value === 'number'
            ? value
            : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value)
              ? Number(value)
              : NaN;
    return Number.isFinite(number) && number > 0 && number <= Number.MAX_SAFE_INTEGER
        ? number
        : fallback;
}
export function castRecipeUrl(message: unknown): string | null {
    if (!message || typeof message !== 'object') return null;
    const msg = message as Record<string, unknown>;
    if (
        msg.type !== 'LOAD_RECIPE' ||
        typeof msg.slug !== 'string' ||
        !msg.slug.trim() ||
        msg.slug.length > 200
    )
        return null;
    const servings = servingCount(msg.servings, 0);
    return `/recipe/${encodeURIComponent(msg.slug)}/mobile${servings ? `?servings=${servings}` : ''}`;
}
