'use server';

import { revalidatePath } from 'next/cache';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { createUserNotification } from '@app/lib/events/persist';
import { publishToast } from '@app/lib/realtime/toastEvents';
import { prisma } from '@shared/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecipientMode = 'user' | 'role';
export type TargetRole = 'ALL' | 'user' | 'moderator' | 'admin';

export type SendMessageInput = {
    recipientMode: RecipientMode;
    userId?: string;
    targetRole?: TargetRole;
    title: string;
    message: string;
    sendToast: boolean;
    toastType: 'success' | 'info' | 'warning' | 'error';
};

export type SendMessageResult = {
    success: true;
    recipientCount: number;
    recipientLabel: string;
};

// ---------------------------------------------------------------------------
// Send message action
// ---------------------------------------------------------------------------

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    await ensureAdminSession('send-system-message');

    if (!input.title.trim()) {
        throw new Error('Titel ist erforderlich');
    }

    const title = input.title.trim();
    const message = input.message.trim() || ' ';
    const toastType = input.toastType ?? 'info';

    // Resolve recipient user IDs
    let userIds: string[];
    let recipientLabel: string;

    if (input.recipientMode === 'user') {
        if (!input.userId) {
            throw new Error('Benutzer ist erforderlich');
        }
        const user = await prisma.user.findUnique({
            where: { id: input.userId },
            select: { id: true, name: true, email: true },
        });
        if (!user) throw new Error('Benutzer nicht gefunden');
        userIds = [user.id];
        recipientLabel = user.name ?? user.email ?? user.id;
    } else {
        const where =
            input.targetRole === 'ALL'
                ? { banned: false }
                : { role: input.targetRole as 'user' | 'moderator' | 'admin', banned: false };

        const users = await prisma.user.findMany({
            where,
            select: { id: true },
        });
        userIds = users.map((u) => u.id);

        const ROLE_LABELS: Record<TargetRole, string> = {
            ALL: 'Alle Benutzer',
            user: 'Alle normalen Benutzer',
            moderator: 'Alle Moderatoren',
            admin: 'Alle Administratoren',
        };
        recipientLabel = ROLE_LABELS[input.targetRole ?? 'ALL'];
    }

    if (userIds.length === 0) {
        throw new Error('Keine Empfänger gefunden');
    }

    // Send to all recipients
    const results = await Promise.allSettled(
        userIds.map(async (userId) => {
            await createUserNotification({
                userId,
                type: 'SYSTEM',
                title,
                message,
            });

            if (input.sendToast) {
                await publishToast(userId, {
                    type: toastType,
                    title,
                    message: message.trim() || undefined,
                    duration: 8000,
                });
            }
        }),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;

    revalidatePath('/admin/notifications');

    return {
        success: true,
        recipientCount: successCount,
        recipientLabel,
    };
}

// ---------------------------------------------------------------------------
// Data loaders
// ---------------------------------------------------------------------------

export type RoleStats = {
    total: number;
    users: number;
    moderators: number;
    admins: number;
};

export async function getRoleStats(): Promise<RoleStats> {
    await ensureAdminSession('get-role-stats');

    const [total, users, moderators, admins] = await Promise.all([
        prisma.user.count({ where: { banned: false } }),
        prisma.user.count({ where: { role: 'user' } }),
        prisma.user.count({ where: { role: 'moderator' } }),
        prisma.user.count({ where: { role: 'admin' } }),
    ]);

    return { total, users, moderators, admins };
}

export type RecentMessage = {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    recipientName: string;
};

export async function getRecentSystemMessages(): Promise<RecentMessage[]> {
    await ensureAdminSession('get-recent-system-messages');

    const notifications = await prisma.notification.findMany({
        where: { type: 'SYSTEM' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
            id: true,
            title: true,
            message: true,
            createdAt: true,
            user: {
                select: { name: true, email: true },
            },
        },
    });

    return notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
        recipientName: n.user.name ?? n.user.email ?? '?',
    }));
}
