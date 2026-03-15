'use server';

import { headers } from 'next/headers';

import { auth } from '@app/lib/auth-server';

import { parseDeviceLabel } from './device';

export interface SessionInfo {
    id: string;
    token: string;
    deviceLabel: string | null;
    ipAddress: string | null;
    createdAt: Date;
    expiresAt: Date;
    isCurrent: boolean;
}

export async function listSessions(): Promise<SessionInfo[]> {
    const reqHeaders = await headers();

    const currentSession = await auth.api.getSession({ headers: reqHeaders });
    if (!currentSession?.session) return [];

    const currentToken = currentSession.session.token;

    const sessions = await auth.api.listSessions({ headers: reqHeaders });
    if (!sessions || !Array.isArray(sessions)) return [];

    return sessions.map((s) => ({
        id: s.id,
        token: s.token,
        deviceLabel: parseDeviceLabel(s.userAgent ?? null),
        ipAddress: s.ipAddress ?? null,
        createdAt: new Date(s.createdAt),
        expiresAt: new Date(s.expiresAt),
        isCurrent: s.token === currentToken,
    }));
}

export async function revokeSession(token: string): Promise<{ success: true } | { error: string }> {
    const reqHeaders = await headers();

    const currentSession = await auth.api.getSession({ headers: reqHeaders });
    if (!currentSession?.session) return { error: 'Unauthorized' };

    if (currentSession.session.token === token) {
        return { error: 'Cannot revoke current session' };
    }

    try {
        await auth.api.revokeSession({ headers: reqHeaders, body: { token } });
        return { success: true };
    } catch {
        return { error: 'Failed to revoke session' };
    }
}

export async function revokeAllOtherSessions(): Promise<{ revoked: true } | { error: string }> {
    const reqHeaders = await headers();

    const currentSession = await auth.api.getSession({ headers: reqHeaders });
    if (!currentSession?.session) return { error: 'Unauthorized' };

    try {
        await auth.api.revokeOtherSessions({ headers: reqHeaders });
        return { revoked: true };
    } catch {
        return { error: 'Failed to revoke sessions' };
    }
}
