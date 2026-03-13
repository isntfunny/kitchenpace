'use server';

import { ShoppingCategory } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { prisma } from '@shared/prisma';

function generateSlug(name: string): string {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    if (!slug) throw new Error('Name muss mindestens ein Zeichen enthalten');
    return slug;
}

export async function createIngredient(data: {
    name: string;
    category?: ShoppingCategory;
    units?: string[];
}) {
    if (!data.name?.trim()) {
        throw new Error('Name ist erforderlich');
    }

    try {
        const slug = generateSlug(data.name);
        await prisma.ingredient.create({
            data: {
                name: data.name.trim(),
                slug,
                category: data.category ?? 'SONSTIGES',
                units: data.units ?? [],
            },
        });
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
        category?: ShoppingCategory;
        units?: string[];
        aliases?: string[];
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

    if (data.category !== undefined) {
        updateData.category = data.category;
    }

    if (data.units !== undefined) {
        updateData.units = data.units;
    }

    if (data.aliases !== undefined) {
        updateData.aliases = data.aliases.map((a) => a.toLowerCase().trim()).filter(Boolean);
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
            // Re-throw validation/business logic errors
            if (error.message.startsWith('Quell-') || error.message.startsWith('Eine Zutat')) {
                throw error;
            }
        }
        throw new Error('Fehler beim Zusammenführen von Zutaten');
    }
}
