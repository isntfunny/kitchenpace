'use server';

import { revalidatePath } from 'next/cache';

import type { PaletteColor } from '@app/lib/palette';
import { prisma } from '@shared/prisma';

function generateSlug(name: string): string {
    const slug = name
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    if (!slug) throw new Error('Name muss mindestens ein Zeichen enthalten');
    return slug;
}

export interface CategoryFormData {
    name: string;
    description?: string;
    color?: PaletteColor;
    icon?: string;
    sortOrder?: number;
}

export async function createCategory(data: CategoryFormData) {
    if (!data.name?.trim()) throw new Error('Name ist erforderlich');

    try {
        const slug = generateSlug(data.name);
        await prisma.category.create({
            data: {
                name: data.name.trim(),
                slug,
                description: data.description?.trim() || null,
                color: data.color ?? 'orange',
                icon: data.icon?.trim() || null,
                sortOrder: data.sortOrder ?? 0,
            },
        });
        revalidatePath('/admin/categories');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unique constraint failed')) {
            throw new Error('Eine Kategorie mit diesem Namen existiert bereits');
        }
        throw error;
    }
}

export async function updateCategory(id: string, data: CategoryFormData) {
    if (!id?.trim()) throw new Error('Kategorie-ID ist erforderlich');
    if (!data.name?.trim()) throw new Error('Name ist erforderlich');

    try {
        const slug = generateSlug(data.name);
        await prisma.category.update({
            where: { id },
            data: {
                name: data.name.trim(),
                slug,
                description: data.description?.trim() || null,
                color: data.color ?? 'orange',
                icon: data.icon?.trim() || null,
                sortOrder: data.sortOrder ?? 0,
            },
        });
        revalidatePath('/admin/categories');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Kategorie nicht gefunden');
        }
        throw error;
    }
}

export async function deleteCategory(id: string) {
    if (!id?.trim()) throw new Error('Kategorie-ID ist erforderlich');

    try {
        await prisma.category.delete({ where: { id } });
        revalidatePath('/admin/categories');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to delete not found')) {
            throw new Error('Kategorie nicht gefunden');
        }
        throw error;
    }
}
