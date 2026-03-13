'use server';

import { revalidatePath } from 'next/cache';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { createUserNotification } from '@app/lib/events/persist';
import { publishToast } from '@app/lib/realtime/toastEvents';
import { prisma } from '@shared/prisma';

export type SendSystemMessageInput = {
    userId: string;
    title: string;
    message: string;
    sendToast?: boolean;
    toastType?: 'success' | 'info' | 'warning' | 'error';
};

export async function sendSystemMessage(input: SendSystemMessageInput) {
    await ensureAdminSession('send-system-message');

    if (!input.userId || !input.title.trim()) {
        throw new Error('Benutzer und Titel sind erforderlich');
    }

    const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, name: true, email: true },
    });

    if (!user) {
        throw new Error('Benutzer nicht gefunden');
    }

    // Create notification in database
    await createUserNotification({
        userId: input.userId,
        type: 'SYSTEM',
        title: input.title.trim(),
        message: input.message.trim() || ' ',
    });

    // Optionally send a toast notification
    if (input.sendToast && input.toastType) {
        await publishToast(input.userId, {
            type: input.toastType,
            title: input.title.trim(),
            message: input.message.trim() || undefined,
            duration: 8000,
        });
    }

    revalidatePath('/admin/notifications');

    return {
        success: true,
        userName: user.name ?? user.email ?? input.userId,
    };
}

export async function getUsersForSelect() {
    await ensureAdminSession('get-users-for-select');

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
        orderBy: {
            name: 'asc',
        },
        take: 200,
    });

    return users.map((user) => ({
        id: user.id,
        label: `${user.name ?? user.email ?? user.id}${user.role === 'ADMIN' ? ' (Admin)' : ''}`,
        email: user.email,
    }));
}
