'use server';

import { cookies } from 'next/headers';

import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

import { SESSION_COOKIE_NAME } from './session-cookie';

export interface SessionInfo {
    id: string;
    deviceLabel: string | null;
    ipAddress: string | null;
    createdAt: Date;
    expires: Date;
    isCurrent: boolean;
}

async function getCurrentToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function listSessions(): Promise<SessionInfo[]> {
    const session = await getServerAuthSession('listSessions');
    if (!session?.user?.id) return [];

    const currentToken = await getCurrentToken();

    const sessions = await prisma.session.findMany({
        where: {
            userId: session.user.id,
            expires: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            deviceLabel: true,
            ipAddress: true,
            createdAt: true,
            expires: true,
            sessionToken: true,
        },
    });

    return sessions.map(({ sessionToken, ...s }) => ({
        ...s,
        isCurrent: sessionToken === currentToken,
    }));
}

export async function revokeSession(id: string): Promise<{ success: true } | { error: string }> {
    const session = await getServerAuthSession('revokeSession');
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const target = await prisma.session.findUnique({
        where: { id },
        select: { userId: true, sessionToken: true },
    });

    if (!target || target.userId !== session.user.id) {
        return { error: 'Not found' };
    }

    const currentToken = await getCurrentToken();
    if (target.sessionToken === currentToken) {
        return { error: 'Cannot revoke current session' };
    }

    await prisma.session.delete({ where: { id } });
    return { success: true };
}

export async function revokeAllOtherSessions(): Promise<{ revoked: number } | { error: string }> {
    const session = await getServerAuthSession('revokeAllOtherSessions');
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const currentToken = await getCurrentToken();
    if (!currentToken) return { error: 'No active session' };

    const { count } = await prisma.session.deleteMany({
        where: {
            userId: session.user.id,
            sessionToken: { not: currentToken },
        },
    });

    return { revoked: count };
}
