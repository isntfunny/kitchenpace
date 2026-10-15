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

export { scaleQuantity } from '../ingredients/quantities';
