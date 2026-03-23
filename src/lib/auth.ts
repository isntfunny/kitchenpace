import { headers } from 'next/headers';
import { cache } from 'react';

import { authDebugEnabled, logAuth } from '@app/lib/auth-logger';
import { auth, type Session } from '@app/lib/auth-server';

export type { Session };

const formatContext = (context?: string) => (context ? ` (${context})` : '');

export const getServerAuthSession = cache(async function getServerAuthSession(
    context?: string,
): Promise<Session | null> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (authDebugEnabled) {
        logAuth('debug', `getServerAuthSession${formatContext(context)}`, {
            hasSession: Boolean(session),
            userId: session?.user?.id ?? null,
        });
    }

    return session;
});

export function logMissingSession(session: Session | null | undefined, context: string) {
    if (!session?.user?.id && authDebugEnabled) {
        logAuth('warn', `missing authenticated user${formatContext(context)}`);
    }
}
