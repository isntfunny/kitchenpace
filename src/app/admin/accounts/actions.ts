'use server';

import { revalidatePath } from 'next/cache';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { createUserNotification } from '@app/lib/events/persist';
import { prisma } from '@shared/prisma';

export async function updateUserRole(userId: string, role: string) {
    if (!['user', 'admin', 'moderator'].includes(role)) {
        throw new Error('Ungültige Rolle');
    }
    await prisma.user.update({
        where: { id: userId },
        data: { role },
    });
    revalidatePath('/admin/accounts');
}

export async function banUser(userId: string, reason: string, expiresAt?: Date) {
    const session = await ensureAdminSession('ban-user');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, banned: true },
    });
    if (!user) throw new Error('Benutzer nicht gefunden');
    if (user.banned) throw new Error('Benutzer ist bereits gesperrt');

    // Set banned flag, store ban metadata
    await prisma.user.update({
        where: { id: userId },
        data: {
            banned: true,
            banReason: reason,
            banExpires: expiresAt ?? null,
        },
    });

    // Log the action
    await prisma.moderationLog.create({
        data: {
            actorId: session.user.id,
            action: 'ban_user',
            contentType: 'user',
            contentId: userId,
            reason,
            metadata: {
                expiresAt: expiresAt?.toISOString() ?? null,
            },
        },
    });

    // Invalidate user sessions
    await prisma.session.deleteMany({ where: { userId } });

    // Send notification before session kill (best effort)
    await createUserNotification({
        userId,
        type: 'SYSTEM',
        title: 'Konto gesperrt',
        message: `Dein Konto wurde gesperrt: ${reason}`,
    });

    revalidatePath('/admin/accounts');
}

export async function unbanUser(userId: string) {
    const session = await ensureAdminSession('unban-user');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { banned: true },
    });
    if (!user || !user.banned) throw new Error('Benutzer ist nicht gesperrt');

    await prisma.user.update({
        where: { id: userId },
        data: {
            banned: false,
            banReason: null,
            banExpires: null,
        },
    });

    await prisma.moderationLog.create({
        data: {
            actorId: session.user.id,
            action: 'unban_user',
            contentType: 'user',
            contentId: userId,
        },
    });

    await createUserNotification({
        userId,
        type: 'SYSTEM',
        title: 'Konto entsperrt',
        message: 'Dein Konto wurde entsperrt. Du kannst die Plattform wieder nutzen.',
    });

    revalidatePath('/admin/accounts');
}
