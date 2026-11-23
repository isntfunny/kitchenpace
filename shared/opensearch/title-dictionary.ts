// Loads the title dictionary (KUC-144) from the ingredient table. Cached per process for an
// hour; the recipe sync loads it fresh and re-indexes everything when its hash changed.
import type { PrismaClient } from '@prisma/client';

import { buildTitleDictionary, type TitleDictionary } from './title-terms';

const TTL_MS = 60 * 60 * 1000;
let cached: { dict: TitleDictionary; at: number } | null = null;
let loading: Promise<TitleDictionary> | null = null;

export async function loadTitleDictionaryFresh(prisma: PrismaClient): Promise<TitleDictionary> {
    const rows = await prisma.ingredient.findMany({
        orderBy: { id: 'asc' },
        select: {
            name: true,
            normalizedName: true,
            pluralName: true,
            aliases: true,
            categories: { select: { name: true, slug: true, parent: { select: { slug: true } } } },
        },
    });
    const dict = buildTitleDictionary(
        rows.map((row) => ({
            ...row,
            categories: row.categories.map((c) => ({ name: c.name, rootSlug: c.parent?.slug ?? c.slug })),
        })),
    );
    cached = { dict, at: Date.now() };
    return dict;
}

export async function loadTitleDictionary(prisma: PrismaClient): Promise<TitleDictionary> {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.dict;
    loading ??= loadTitleDictionaryFresh(prisma).finally(() => {
        loading = null;
    });
    return loading;
}
