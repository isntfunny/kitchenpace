import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { authDebugEnabled, logAuth } from '@/lib/auth-logger';

const formatContext = (context?: string) => (context ? ` (${context})` : '');

export async function getServerAuthSession(context?: string) {
    const session = await getServerSession(authOptions);

    if (authDebugEnabled) {
        logAuth('debug', `getServerAuthSession${formatContext(context)}`, {
            hasSession: Boolean(session),
            userId: session?.user?.id ?? null,
        });
    }

    return session;
}

export function logMissingSession(session: Session | null | undefined, context: string) {
    if (!session?.user?.id && authDebugEnabled) {
        logAuth('warn', `missing authenticated user${formatContext(context)}`);
    }
}
