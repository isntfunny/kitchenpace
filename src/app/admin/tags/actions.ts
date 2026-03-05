'use server';

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

export async function createTag(data: { name: string }) {
    if (!data.name?.trim()) {
        throw new Error('Name ist erforderlich');
    }

    try {
        const slug = generateSlug(data.name);
        await prisma.tag.create({
            data: {
                name: data.name.trim(),
                slug,
            },
        });
        revalidatePath('/admin/tags');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unique constraint failed')) {
            throw new Error('Ein Tag mit diesem Namen existiert bereits');
        }
        throw error;
    }
}

export async function updateTag(id: string, data: { name: string }) {
    if (!id?.trim()) {
        throw new Error('Tag-ID ist erforderlich');
    }

    if (!data.name?.trim()) {
        throw new Error('Name ist erforderlich');
    }

    try {
        const slug = generateSlug(data.name);
        await prisma.tag.update({
            where: { id },
            data: {
                name: data.name.trim(),
                slug,
            },
        });
        revalidatePath('/admin/tags');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Tag nicht gefunden');
        }
        throw error;
    }
}

export async function deleteTag(id: string) {
    if (!id?.trim()) {
        throw new Error('Tag-ID ist erforderlich');
    }

    try {
        await prisma.tag.delete({
            where: { id },
        });
        revalidatePath('/admin/tags');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to delete not found')) {
            throw new Error('Tag nicht gefunden');
        }
        throw error;
    }
}
