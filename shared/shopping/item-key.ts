// Identity of a shopping list entry (KUC-98, Bring! principle): every ingredient
// and every free-text name exists exactly once per list. The key is stored in
// ShoppingItem.itemKey (unique per list) and reused by ShoppingHistory and
// ShoppingSuggestionSnooze, so history survives the item being re-added.

/** Lower-case, trimmed, single-spaced, NFC-normalized name for comparisons. */
export function normalizeItemName(name: string): string {
    return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de-DE');
}

export function itemKeyFor(item: { ingredientId?: string | null; name: string }): string {
    if (item.ingredientId) return `i:${item.ingredientId}`;
    const normalized = normalizeItemName(item.name);
    if (!normalized) throw new Error('Artikel ohne Namen');
    return `t:${normalized}`;
}

export function ingredientIdFromKey(itemKey: string): string | null {
    return itemKey.startsWith('i:') ? itemKey.slice(2) : null;
}
