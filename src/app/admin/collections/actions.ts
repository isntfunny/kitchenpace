'use server';

import { ModerationStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

export async function adminPublishCollection(id: string) {
    await ensureModeratorSession('admin-collections');

    if (!id?.trim()) {
        throw new Error('Collection-ID ist erforderlich');
    }

    try {
        await prisma.collection.update({
            where: { id },
            data: { published: true },
        });
        revalidatePath('/admin/collections');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Sammlung nicht gefunden');
        }
        throw error;
    }
}

export async function adminUnpublishCollection(id: string) {
    await ensureModeratorSession('admin-collections');

    if (!id?.trim()) {
        throw new Error('Collection-ID ist erforderlich');
    }

    try {
        await prisma.collection.update({
            where: { id },
            data: { published: false },
        });
        revalidatePath('/admin/collections');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Sammlung nicht gefunden');
        }
        throw error;
    }
}

export async function adminDeleteCollection(id: string) {
    await ensureModeratorSession('admin-collections');

    if (!id?.trim()) {
        throw new Error('Collection-ID ist erforderlich');
    }

    try {
        await prisma.collection.delete({
            where: { id },
        });
        revalidatePath('/admin/collections');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
            throw new Error('Sammlung nicht gefunden');
        }
        throw error;
    }
}

export async function adminApproveCollection(id: string) {
    await ensureModeratorSession('admin-collections');

    if (!id?.trim()) {
        throw new Error('Collection-ID ist erforderlich');
    }

    try {
        await prisma.collection.update({
            where: { id },
            data: { moderationStatus: ModerationStatus.APPROVED, published: true },
        });
        revalidatePath('/admin/collections');
        revalidatePath('/collections');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Sammlung nicht gefunden');
        }
        throw error;
    }
}

export async function adminRejectCollection(id: string) {
    await ensureModeratorSession('admin-collections');

    if (!id?.trim()) {
        throw new Error('Collection-ID ist erforderlich');
    }

    try {
        await prisma.collection.update({
            where: { id },
            data: { moderationStatus: ModerationStatus.REJECTED },
        });
        revalidatePath('/admin/collections');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            throw new Error('Sammlung nicht gefunden');
        }
        throw error;
    }
}
