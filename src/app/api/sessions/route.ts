import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';
import { SESSION_COOKIE_NAME } from '@app/lib/auth/session-cookie';
import { prisma } from '@shared/prisma';

export async function GET() {
    const session = await getServerAuthSession('api/sessions');
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

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

    const result = sessions.map(({ sessionToken, ...s }) => ({
        ...s,
        isCurrent: sessionToken === currentToken,
    }));

    return NextResponse.json(result);
}

export async function DELETE() {
    const session = await getServerAuthSession('api/sessions/revoke-all');
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!currentToken) {
        return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }

    const { count } = await prisma.session.deleteMany({
        where: {
            userId: session.user.id,
            sessionToken: { not: currentToken },
        },
    });

    return NextResponse.json({ revoked: count });
}
