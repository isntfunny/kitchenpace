export interface CatalogEntry {
    itemId: string;
    name: string;
}
const normalize = (text: string) => text.trim().normalize('NFC').toLocaleLowerCase('de-DE');

export function resolveCatalogItem(name: string, entries: CatalogEntry[]): string {
    const match = entries.find(
        (entry) =>
            normalize(entry.name) === normalize(name) ||
            normalize(entry.itemId) === normalize(name),
    );
    return match?.itemId ?? name.trim();
}

function parseNumber(value: string): number | null {
    const fractions: Record<string, string> = {
        '½': '1/2',
        '¼': '1/4',
        '¾': '3/4',
        '⅓': '1/3',
        '⅔': '2/3',
    };
    const text = value
        .trim()
        .replace(/[½¼¾⅓⅔]/g, (char) => ` ${fractions[char]}`)
        .trim();
    const mixed = text.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
    if (mixed)
        return Number(mixed[3]) > 0
            ? Number(mixed[1] ?? 0) + Number(mixed[2]) / Number(mixed[3])
            : null;
    return /^\d+(?:[.,]\d+)?$/.test(text) ? Number(text.replace(',', '.')) : null;
}

export function scaleQuantity(raw: string, factor: number): string {
    if (!Number.isFinite(factor) || factor <= 0) return raw;
    const range = raw.trim().split(/\s*[-–]\s*/);
    const parts = range.length === 2 ? range : [raw];
    const values = parts.map(parseNumber);
    if (values.some((value) => value === null)) return raw;
    return values
        .map((value) =>
            new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(value! * factor),
        )
        .join('–');
}
