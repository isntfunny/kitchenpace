'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@shared/prisma';
import { findListedTag } from '@shared/tags/tag-list';

/** Tags come from the fixed list in shared/tags/tag-list.ts (KUC-116). */
function listedTag(name: string) {
    const tag = findListedTag(name);
    if (!tag) {
        throw new Error(
            'Nur Tags aus der festen Tag-Liste sind erlaubt. Neue Tags werden im Code gepflegt (shared/tags/tag-list.ts).',
        );
    }
    return tag;
}

export async function createTag(data: { name: string }) {
    if (!data.name?.trim()) {
        throw new Error('Name ist erforderlich');
    }

    try {
        const { name, slug } = listedTag(data.name);
        await prisma.tag.create({ data: { name, slug } });
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
        const { name, slug } = listedTag(data.name);
        await prisma.tag.update({ where: { id }, data: { name, slug } });
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
