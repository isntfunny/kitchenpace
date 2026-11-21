// Catalogue lookup behind createIngredient (KUC-115). Kept out of the
// 'use server' module so it is no public server action.

import { slugify } from '@app/lib/slug';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';

const ingLog = createLogger('ingredient');

/**
 * Catalogue lookup of createIngredient without creating anything: the
 * existing ingredient a name resolves to (singular slug, alias, original slug),
 * or `null` plus the canonical name a new entry would get. Also used by
 * dry runs that report which ingredients an import would create (KUC-115).
 */
export async function matchExistingIngredient(name: string) {
    const { stemGerman, getWordVariants } = await import('@app/lib/german-stem');

    const trimmed = name.trim();

    // 1. Hunspell stemming → singular base form
    const singular = await stemGerman(trimmed);
    const isStemmed = singular.toLowerCase() !== trimmed.toLowerCase();

    // Canonical name: keep original casing style, use singular form
    const canonicalName = trimmed[0].toUpperCase() + singular.slice(1);
    const slug = slugify(canonicalName);
    const miss = { existing: null, trimmed, canonicalName, slug, isStemmed };

    ingLog.debug('lookup', { input: trimmed, singular, slug, stemmed: isStemmed });

    // 2. Try slug match (singular slug)
    const bySlug = await prisma.ingredient.findUnique({ where: { slug } });
    if (bySlug) {
        ingLog.debug('found by slug', { input: trimmed, match: bySlug.name, id: bySlug.id });
        return { ...miss, existing: bySlug };
    }

    // 3. Try alias match (for regional synonyms)
    const variants = await getWordVariants(trimmed);
    if (variants.length > 1) {
        const byAlias = await prisma.ingredient.findFirst({
            where: { aliases: { hasSome: variants } },
        });
        if (byAlias) {
            ingLog.debug('found by alias', {
                input: trimmed,
                variants,
                match: byAlias.name,
                id: byAlias.id,
            });
            return { ...miss, existing: byAlias };
        }
    }

    // 4. Also try the original name's slug (in case it wasn't stemmed to the same slug)
    const originalSlug = slugify(trimmed);
    if (originalSlug !== slug) {
        const byOriginalSlug = await prisma.ingredient.findUnique({
            where: { slug: originalSlug },
        });
        if (byOriginalSlug) {
            ingLog.debug('found by original slug', {
                input: trimmed,
                originalSlug,
                match: byOriginalSlug.name,
                id: byOriginalSlug.id,
            });
            return { ...miss, existing: byOriginalSlug };
        }
    }

    // 5. Exact name: older entries keep the slug of an earlier slugify
    //    ("Kirschtomate(n)" → kirschtomate-n, today kirschtomaten)
    const names = [...new Set([trimmed, canonicalName])];
    const byName = await prisma.ingredient.findFirst({
        where: { OR: names.map((n) => ({ name: { equals: n, mode: 'insensitive' as const } })) },
    });
    if (byName) {
        ingLog.debug('found by name', { input: trimmed, match: byName.name, id: byName.id });
        return { ...miss, existing: byName };
    }

    // 6. Display name ("Weißwein" → "Wein weiss, 12.5 vol%"), only if unambiguous
    const byDisplayName = await prisma.ingredient.findMany({
        where: {
            OR: names.map((n) => ({ normalizedName: { equals: n, mode: 'insensitive' as const } })),
        },
        take: 2,
    });
    if (byDisplayName.length === 1) {
        const [hit] = byDisplayName;
        ingLog.debug('found by display name', { input: trimmed, match: hit.name, id: hit.id });
        return { ...miss, existing: hit };
    }
    return miss;
}
