import { BringError } from './client';
import { resolveCatalogItem, type CatalogEntry } from './items';
import type { BringItems, BringList, BringOperation, TransferItem, TransferOutcome } from './types';

export function requireList(lists: BringList[], listUuid: string): BringList {
    const list = lists.find((entry) => entry.listUuid === listUuid);
    if (!list)
        throw new BringError(
            'FORBIDDEN',
            'Diese Liste ist nicht verfügbar. Bitte wähle eine andere Liste.',
        );
    return list;
}

interface TransferClient {
    items(listUuid: string): Promise<BringItems>;
    write(
        listUuid: string,
        operation: BringOperation,
        name: string,
        specification: string,
    ): Promise<void>;
}

export async function transferItems(
    client: TransferClient,
    listUuid: string,
    items: TransferItem[],
    catalog: CatalogEntry[],
): Promise<TransferOutcome[]> {
    const existing = new Set((await client.items(listUuid)).purchase.map((item) => item.name));
    const outcomes: TransferOutcome[] = [];
    const deadline = Date.now() + 35_000;
    for (const item of items) {
        const name = resolveCatalogItem(item.name, catalog);
        if (existing.has(name)) {
            outcomes.push({ id: item.id, name: item.name, status: 'existing' });
            continue;
        }
        if (Date.now() >= deadline) {
            outcomes.push({ id: item.id, name: item.name, status: 'failed' });
            continue;
        }
        // Bring stores one item per name. Keep all selected occurrences in its
        // specification instead of silently discarding the second recipe use.
        const specification = items
            .filter((other) => other.name === item.name)
            .map((other) => other.specification)
            .filter(Boolean)
            .join(' + ');
        let added = false;
        try {
            await client.write(listUuid, 'add', name, specification);
            added = true;
        } catch {
            // A lost response can follow a successful write. Read before offering a retry.
            try {
                added = (await client.items(listUuid)).purchase.some(
                    (entry) => entry.name === name && entry.specification === specification,
                );
            } catch {
                /* Remains failed/uncertain. Retry reads the list again. */
            }
        }
        if (added) existing.add(name);
        outcomes.push({ id: item.id, name: item.name, status: added ? 'added' : 'failed' });
    }
    return outcomes;
}
