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
