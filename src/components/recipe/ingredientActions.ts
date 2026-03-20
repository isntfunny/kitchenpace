'use server';

import { createUserNotification } from '@app/lib/events/persist';
import { uploadImageFromUrl as uploadImageFromUrlShared } from '@app/lib/importer/upload-image-from-url';
import { slugify } from '@app/lib/slug';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';

const ingLog = createLogger('ingredient');

async function notifyModeratorsNewIngredient(ingredientId: string, ingredientName: string) {
    const moderators = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MODERATOR'] } },
        select: { id: true },
    });
    await Promise.allSettled(
        moderators.map((mod) =>
            createUserNotification({
                userId: mod.id,
                type: 'SYSTEM',
                title: 'Neue Zutat erstellt',
                message: `„${ingredientName}" wurde von einem Nutzer erstellt und muss überprüft werden.`,
                data: { ingredientId },
            }),
        ),
    );
}

// ── Match result types ───────────────────────────────────────────────────────

export interface IngredientMatch {
    /** 'exact' = slug matched as-is, 'stem' = matched via stemming/alias, 'new' = not found */
    status: 'exact' | 'stem' | 'new';
    /** The DB ingredient name (only set when status is 'exact' or 'stem') */
    matchedName?: string;
    /** The DB ingredient ID (only set when status is 'exact' or 'stem') */
    matchedId?: string;
}

/**
 * Lookup-only: checks if an ingredient name matches an existing DB entry
 * via OpenSearch (same fuzzy/wildcard search as the ingredient manager).
 * Does NOT create anything. Safe to call at preview/display time.
 */
export async function matchIngredient(name: string): Promise<IngredientMatch> {
    const { searchIngredientsByName } = await import('@app/lib/ingredients/search');

    const { bestMatch, matchType } = await searchIngredientsByName(name.trim());

    if (!bestMatch) return { status: 'new' };

    return {
        status: matchType === 'exact' ? 'exact' : 'stem',
        matchedName: bestMatch.name,
        matchedId: bestMatch.id,
    };
}

/**
 * Batch version of matchIngredient — matches all names in parallel.
 */
export async function matchIngredients(names: string[]): Promise<IngredientMatch[]> {
    return Promise.all(names.map((n) => matchIngredient(n)));
}

/**
 * Find a Unit by shortName or longName (case-insensitive).
 * Creates the unit if it doesn't exist (shortName = longName = capitalized input).
 * Returns the unit ID.
 */
export async function findOrCreateUnit(unitName: string): Promise<string> {
    const trimmed = unitName.trim();
    if (!trimmed) {
        const fallback = await prisma.unit.findUnique({ where: { shortName: 'Stk' } });
        return fallback!.id;
    }

    // Try exact match on shortName or longName
    const existing = await prisma.unit.findFirst({
        where: {
            OR: [
                { shortName: trimmed },
                { longName: trimmed },
                { shortName: { equals: trimmed, mode: 'insensitive' } },
                { longName: { equals: trimmed, mode: 'insensitive' } },
            ],
        },
        select: { id: true },
    });
    if (existing) return existing.id;

    // Create new unit
    const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
    ingLog.info('creating new unit', { input: trimmed, capitalized });
    try {
        const unit = await prisma.unit.create({
            data: { shortName: capitalized, longName: capitalized },
        });
        return unit.id;
    } catch (e) {
        // Race condition: already created
        if (e instanceof Error && e.message.includes('Unique constraint')) {
            const found = await prisma.unit.findFirst({
                where: { OR: [{ shortName: capitalized }, { longName: capitalized }] },
                select: { id: true },
            });
            return found!.id;
        }
        throw e;
    }
}

/**
 * Resolve a unit shortName/longName to a Unit ID.
 * Batch version — resolves all names, creating missing units.
 */
export async function resolveUnitIds(unitNames: string[]): Promise<string[]> {
    return Promise.all(unitNames.map((n) => findOrCreateUnit(n)));
}

export async function createIngredient(name: string, _category?: string, _units: string[] = []) {
    const { stemGerman, getWordVariants } = await import('@app/lib/german-stem');

    const trimmed = name.trim();

    // 1. Hunspell stemming → singular base form
    const singular = await stemGerman(trimmed);
    const isStemmed = singular.toLowerCase() !== trimmed.toLowerCase();

    // Canonical name: keep original casing style, use singular form
    const canonicalName = trimmed[0].toUpperCase() + singular.slice(1);
    const slug = slugify(canonicalName);

    ingLog.debug('lookup', { input: trimmed, singular, slug, stemmed: isStemmed });

    // 2. Try slug match (singular slug)
    const bySlug = await prisma.ingredient.findUnique({ where: { slug } });
    if (bySlug) {
        ingLog.debug('found by slug', { input: trimmed, match: bySlug.name, id: bySlug.id });
        return bySlug;
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
            return byAlias;
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
            return byOriginalSlug;
        }
    }

    // 5. Create new ingredient with singular as canonical name + default units
    ingLog.info('creating new ingredient', {
        input: trimmed,
        canonicalName,
        slug,
        stemmed: isStemmed,
    });
    try {
        const defaultUnits = await prisma.unit.findMany({
            where: { shortName: { in: ['g', 'ml', 'Stk'] } },
            select: { id: true },
        });

        const ingredient = await prisma.ingredient.create({
            data: {
                name: canonicalName,
                slug,
                pluralName: isStemmed ? trimmed[0].toUpperCase() + trimmed.slice(1) : null,
                needsReview: true,
                ingredientUnits: {
                    create: defaultUnits.map((u) => ({ unitId: u.id })),
                },
            },
        });

        ingLog.info('created', { id: ingredient.id, name: ingredient.name, slug });

        // Notify moderators about the new ingredient
        notifyModeratorsNewIngredient(ingredient.id, ingredient.name).catch(() => {});

        // Enqueue nutrition enrichment via AI
        import('@worker/queues')
            .then(({ addEnrichIngredientNutritionJob }) =>
                addEnrichIngredientNutritionJob(ingredient.id),
            )
            .catch((err) => ingLog.error('Failed to enqueue nutrition job', { err }));

        return ingredient;
    } catch (e) {
        // Race condition: slug already taken → return existing
        if (e instanceof Error && e.message.includes('Unique constraint')) {
            ingLog.debug('race condition, returning existing', { slug });
            return prisma.ingredient.findUniqueOrThrow({ where: { slug } });
        }
        throw e;
    }
}

const TAG_NAME_REGEX = /^[a-zA-ZäöüÄÖÜß0-9\- ]+$/;
const MAX_TAG_LENGTH = 40;

function tagSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export async function findOrCreateTag(
    rawName: string,
): Promise<{ id: string; name: string } | null> {
    const name = rawName.trim();
    if (!name || name.length > MAX_TAG_LENGTH || !TAG_NAME_REGEX.test(name)) {
        return null;
    }

    const slug = tagSlug(name);
    if (!slug) return null;

    const tag = await prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
        select: { id: true, name: true },
    });

    return tag;
}

/**
 * Downloads an external image URL and uploads it to S3.
 * Server action wrapper so client components can call this.
 */
export async function uploadImageFromUrl(
    imageUrl: string,
): Promise<{ success: true; key: string } | { success: false; error: string }> {
    return uploadImageFromUrlShared(imageUrl);
}
