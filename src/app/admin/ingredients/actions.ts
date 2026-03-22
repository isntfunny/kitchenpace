'use server';

import { revalidatePath } from 'next/cache';

import { slugify } from '@app/lib/slug';
import { prisma } from '@shared/prisma';

function generateSlug(name: string): string {
    const slug = slugify(name);
    if (!slug) throw new Error('Name muss mindestens ein Zeichen enthalten');
    return slug;
}

export async function createIngredient(data: { name: string }) {
    if (!data.name?.trim()) {
        throw new Error('Name ist erforderlich');
    }

    try {
        const slug = generateSlug(data.name);
        const ingredient = await prisma.ingredient.create({
            data: {
                name: data.name.trim(),
                slug,
            },
        });

        // Enqueue nutrition enrichment via AI
        import('@worker/queues')
            .then(({ addEnrichIngredientNutritionJob }) =>
                addEnrichIngredientNutritionJob(ingredient.id),
            )
            .catch((err) => console.error('Failed to enqueue nutrition job:', err));

        revalidatePath('/admin/ingredients');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unique constraint failed')) {
            throw new Error('Eine Zutat mit diesem Namen existiert bereits');
        }
        throw error;
    }
}

export async function updateIngredient(
    id: string,
    data: {
        name?: string;
        pluralName?: string | null;
        aliases?: string[];
        categoryIds?: string[];
        unitIds?: string[];
        // Nutrition per 100g
        energyKcal?: number | null;
        protein?: number | null;
        fat?: number | null;
        carbs?: number | null;
        fiber?: number | null;
        sugar?: number | null;
        sodium?: number | null;
        saturatedFat?: number | null;
    },
) {
    if (!id?.trim()) {
        throw new Error('Zutat-ID ist erforderlich');
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
        if (!data.name.trim()) {
            throw new Error('Name ist erforderlich');
        }
        updateData.name = data.name.trim();
        updateData.slug = generateSlug(data.name);
    }

    if (data.pluralName !== undefined) {
        updateData.pluralName = data.pluralName?.trim() || null;
    }

    if (data.aliases !== undefined) {
        updateData.aliases = data.aliases.map((a) => a.toLowerCase().trim()).filter(Boolean);
    }

    if (data.categoryIds !== undefined) {
        updateData.categories = {
            set: data.categoryIds.map((cid) => ({ id: cid })),
        };
    }

    // Nutrition fields
    const nutritionFields = [
        'energyKcal',
        'protein',
        'fat',
        'carbs',
        'fiber',
        'sugar',
        'sodium',
        'saturatedFat',
    ] as const;

    for (const field of nutritionFields) {
        if (data[field] !== undefined) {
            updateData[field] = data[field];
        }
    }

    try {
        await prisma.ingredient.update({
            where: { id },
            data: updateData,
        });
        revalidatePath('/admin/ingredients');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Zutat nicht gefunden');
        }
        throw error;
    }
}

export async function updateIngredientUnits(
    ingredientId: string,
    units: Array<{ unitId: string; grams?: number | null }>,
) {
    if (!ingredientId?.trim()) {
        throw new Error('Zutat-ID ist erforderlich');
    }

    await prisma.$transaction([
        // Remove all existing unit links
        prisma.ingredientUnit.deleteMany({ where: { ingredientId } }),
        // Create new ones
        prisma.ingredientUnit.createMany({
            data: units.map((u) => ({
                ingredientId,
                unitId: u.unitId,
                grams: u.grams ?? null,
            })),
        }),
    ]);

    revalidatePath('/admin/ingredients');
}

export async function deleteIngredient(id: string) {
    if (!id?.trim()) {
        throw new Error('Zutat-ID ist erforderlich');
    }

    try {
        await prisma.ingredient.delete({
            where: { id },
        });
        revalidatePath('/admin/ingredients');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to delete not found')) {
            throw new Error('Zutat nicht gefunden');
        }
        throw error;
    }
}

export async function mergeIngredients(sourceId: string, targetId: string) {
    if (!sourceId?.trim() || !targetId?.trim()) {
        throw new Error('Quell- und Ziel-IDs sind erforderlich');
    }

    if (sourceId === targetId) {
        throw new Error('Quell- und Zielzutat dürfen nicht identisch sein');
    }

    try {
        const [source, target] = await Promise.all([
            prisma.ingredient.findUniqueOrThrow({ where: { id: sourceId } }),
            prisma.ingredient.findUniqueOrThrow({ where: { id: targetId } }),
        ]);

        const sourceRecipeIngredients = await prisma.recipeIngredient.findMany({
            where: { ingredientId: sourceId },
        });

        for (const sourceRi of sourceRecipeIngredients) {
            const existingTargetRi = await prisma.recipeIngredient.findFirst({
                where: {
                    recipeId: sourceRi.recipeId,
                    ingredientId: targetId,
                },
            });

            if (existingTargetRi) {
                const combinedAmount = `${existingTargetRi.amount} + ${sourceRi.amount}`;
                await prisma.recipeIngredient.update({
                    where: { id: existingTargetRi.id },
                    data: { amount: combinedAmount },
                });
                await prisma.recipeIngredient.delete({ where: { id: sourceRi.id } });
            } else {
                await prisma.recipeIngredient.update({
                    where: { id: sourceRi.id },
                    data: { ingredientId: targetId },
                });
            }
        }

        // Transfer source name + aliases to target aliases
        const mergedAliases = Array.from(
            new Set([
                ...(target.aliases ?? []),
                source.name.toLowerCase(),
                ...(source.aliases ?? []),
            ]),
        ).filter((a) => a !== target.name.toLowerCase());

        await prisma.ingredient.update({
            where: { id: targetId },
            data: { aliases: mergedAliases },
        });

        await prisma.ingredient.delete({
            where: { id: sourceId },
        });

        revalidatePath('/admin/ingredients');
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('Record to delete not found')) {
                throw new Error('Zutat nicht gefunden');
            }
            if (error.message.startsWith('Quell-') || error.message.startsWith('Eine Zutat')) {
                throw error;
            }
        }
        throw new Error('Fehler beim Zusammenführen von Zutaten');
    }
}

// Category CRUD
export async function createCategory(data: { name: string; slug?: string }) {
    if (!data.name?.trim()) throw new Error('Name ist erforderlich');
    const slug = data.slug || generateSlug(data.name);
    await prisma.ingredientCategory.create({ data: { name: data.name.trim(), slug } });
    revalidatePath('/admin/ingredients');
}

export async function updateCategory(id: string, data: { name?: string; sortOrder?: number }) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) {
        updateData.name = data.name.trim();
        updateData.slug = generateSlug(data.name);
    }
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    await prisma.ingredientCategory.update({ where: { id }, data: updateData });
    revalidatePath('/admin/ingredients');
}

export async function deleteCategory(id: string) {
    await prisma.ingredientCategory.delete({ where: { id } });
    revalidatePath('/admin/ingredients');
}

// Unit CRUD
export async function createUnit(data: {
    shortName: string;
    longName: string;
    gramsDefault?: number | null;
}) {
    if (!data.shortName?.trim() || !data.longName?.trim()) {
        throw new Error('Kurz- und Langname sind erforderlich');
    }
    await prisma.unit.create({
        data: {
            shortName: data.shortName.trim(),
            longName: data.longName.trim(),
            gramsDefault: data.gramsDefault ?? null,
        },
    });
    revalidatePath('/admin/ingredients');
}

export async function updateUnit(
    id: string,
    data: { shortName?: string; longName?: string; gramsDefault?: number | null },
) {
    const updateData: Record<string, unknown> = {};
    if (data.shortName !== undefined) updateData.shortName = data.shortName.trim();
    if (data.longName !== undefined) updateData.longName = data.longName.trim();
    if (data.gramsDefault !== undefined) updateData.gramsDefault = data.gramsDefault;
    await prisma.unit.update({ where: { id }, data: updateData });
    revalidatePath('/admin/ingredients');
}

export async function deleteUnit(id: string) {
    await prisma.unit.delete({ where: { id } });
    revalidatePath('/admin/ingredients');
}
