import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';
import { SESSION_COOKIE_NAME } from '@app/lib/auth/session-cookie';
import { prisma } from '@shared/prisma';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerAuthSession('api/sessions/[id]');
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const targetSession = await prisma.session.findUnique({
        where: { id },
        select: { userId: true, sessionToken: true },
    });

    if (!targetSession || targetSession.userId !== session.user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (targetSession.sessionToken === currentToken) {
        return NextResponse.json({ error: 'Cannot revoke current session' }, { status: 400 });
    }

    await prisma.session.delete({ where: { id } });

    return NextResponse.json({ revoked: true });
}
