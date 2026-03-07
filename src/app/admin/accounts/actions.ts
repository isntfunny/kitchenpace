'use server';

import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { createUserNotification } from '@app/lib/events/persist';
import { prisma } from '@shared/prisma';

export async function updateUserRole(userId: string, role: Role) {
    // Prevent setting BANNED via role dropdown — use banUser() instead
    if (role === Role.BANNED) {
        throw new Error('Gesperrte Konten können nur über die Sperrfunktion verwaltet werden');
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
        select: { role: true },
    });
    if (!user) throw new Error('Benutzer nicht gefunden');
    if (user.role === Role.BANNED) throw new Error('Benutzer ist bereits gesperrt');

    // Set role to BANNED, store ban metadata
    await prisma.user.update({
        where: { id: userId },
        data: {
            role: Role.BANNED,
            banReason: reason,
            banExpiresAt: expiresAt ?? null,
        },
    });

    // Log the action with previous role for unban restoration
    await prisma.moderationLog.create({
        data: {
            actorId: session.user.id,
            action: 'ban_user',
            contentType: 'user',
            contentId: userId,
            reason,
            metadata: {
                previousRole: user.role,
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
        select: { role: true },
    });
    if (!user || user.role !== Role.BANNED) throw new Error('Benutzer ist nicht gesperrt');

    // Find previous role from the most recent ban log
    const banLog = await prisma.moderationLog.findFirst({
        where: {
            contentId: userId,
            action: 'ban_user',
        },
        orderBy: { createdAt: 'desc' },
        select: { metadata: true },
    });

    const previousRole = (banLog?.metadata as Record<string, string> | null)?.previousRole as Role | undefined;

    await prisma.user.update({
        where: { id: userId },
        data: {
            role: previousRole ?? Role.USER,
            banReason: null,
            banExpiresAt: null,
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

export async function toggleUserActive(userId: string, isActive: boolean) {
    await prisma.user.update({
        where: { id: userId },
        data: { isActive },
    });
    revalidatePath('/admin/accounts');
}

export async function sendPasswordReset(userId: string) {
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.user.update({
        where: { id: userId },
        data: {
            resetToken,
            resetTokenExpiry,
        },
    });

    // In a real app, you would send an email here
    // For now, we just return the token for testing purposes
    return { token: resetToken };
}
