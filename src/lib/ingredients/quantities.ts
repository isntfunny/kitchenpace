/** Original strings stay in storage; scale only at display/export boundaries. */
const unicodeFractions: Record<string, string> = {
    '½': '1/2',
    '¼': '1/4',
    '¾': '3/4',
    '⅓': '1/3',
    '⅔': '2/3',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8',
};
const numberPattern = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)`;
export function parseQuantityNumber(raw: string): number | null {
    const value = raw
        .trim()
        .replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, (c) => ` ${unicodeFractions[c]}`)
        .trim();
    const fraction = value.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
    if (fraction) {
        const denominator = Number(fraction[3]);
        if (!denominator) return null;
        const result = Number(fraction[1] ?? 0) + Number(fraction[2]) / denominator;
        return Number.isFinite(result) ? result : null;
    }
    if (!/^\d+(?:[.,]\d+)?$/.test(value)) return null;
    const result = Number(value.replace(',', '.'));
    return Number.isFinite(result) ? result : null;
}
function formatNumber(value: number): string {
    return new Intl.NumberFormat('de-DE', {
        useGrouping: false,
        ...(value > 0 && value < 0.01
            ? { maximumSignificantDigits: 2 }
            : { maximumFractionDigits: 2 }),
    }).format(value);
}
export function portionFactor(servings: number, originalServings: number): number {
    if (
        !Number.isFinite(servings) ||
        !Number.isFinite(originalServings) ||
        servings <= 0 ||
        originalServings <= 0
    )
        return 1;
    const factor = servings / originalServings;
    return Number.isFinite(factor) && factor > 0 ? factor : 1;
}
export function isNumericQuantity(raw: string): boolean {
    const parts = raw.trim().split(/\s*[-–]\s*/);
    return parts.length <= 2 && parts.every((part) => parseQuantityNumber(part) !== null);
}
export function scaleQuantity(raw: string, factor: number): string {
    if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return raw;
    const range = raw.trim().split(/\s*[-–]\s*/);
    if (range.length > 2) return raw;
    const numbers = range.map(parseQuantityNumber);
    if (numbers.some((n) => n === null)) return raw;
    const scaled = (numbers as number[]).map((n) => n * factor);
    if (scaled.some((n) => !Number.isFinite(n))) return raw;
    return scaled.map(formatNumber).join('–');
}
export function scaleMentionOverride(raw: string, factor: number): string {
    // Only a numeric amount followed by a unit; prose is never rewritten.
    const normalized = raw.replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, (c) => ` ${unicodeFractions[c]}`).trim();
    const match = normalized.match(
        new RegExp(
            `^(${numberPattern}(?:\\s*[-–]\\s*${numberPattern})?)\\s*([\\p{L}%]+\\.?)$`,
            'u',
        ),
    );
    if (!match) return scaleQuantity(raw, factor);
    if (factor === 1 || !Number.isFinite(factor) || factor <= 0) return raw;
    const scaled = scaleQuantity(match[1], factor);
    return `${scaled} ${match[2]}`;
}
