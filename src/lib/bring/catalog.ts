import 'server-only';
import { z } from 'zod';

import type { CatalogEntry } from './items';

let cached: { at: number; entries: CatalogEntry[] } | undefined;
let retryAfter = 0;
let pending: Promise<CatalogEntry[]> | undefined;

export async function loadCatalog(): Promise<CatalogEntry[]> {
    if (cached && Date.now() - cached.at < 86_400_000) return cached.entries;
    if (Date.now() < retryAfter) return cached?.entries ?? [];
    if (pending) return pending;
    pending = (async () => {
        try {
            const [catalog, articles] = await Promise.all(
                ['catalog', 'articles'].map(async (part) => {
                    const response = await fetch(
                        `https://web.getbring.com/locale/${part}.de-DE.json`,
                        { signal: AbortSignal.timeout(4000), cache: 'no-store' },
                    );
                    if (!response.ok) throw new Error('Catalog unavailable');
                    return response.json();
                }),
            );
            const parsed = z
                .object({
                    catalog: z.object({
                        sections: z.array(
                            z.object({
                                items: z.array(z.object({ itemId: z.string(), name: z.string() })),
                            }),
                        ),
                    }),
                })
                .parse(catalog);
            const labels = z.record(z.string(), z.string()).parse(articles);
            const entries = parsed.catalog.sections.flatMap((section) =>
                section.items.map((item) => ({
                    itemId: item.itemId,
                    name: labels[item.itemId] ?? item.name,
                })),
            );
            cached = { at: Date.now(), entries };
            return entries;
        } catch {
            retryAfter = Date.now() + 60_000;
            return cached?.entries ?? [];
        } finally {
            pending = undefined;
        }
    })();
    return pending;
}
