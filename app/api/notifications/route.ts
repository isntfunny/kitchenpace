import { NextResponse, type NextRequest } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

const requireSession = async (context: string) => {
    const session = await getServerAuthSession(context);

    if (!session?.user?.id) {
        logMissingSession(session, context);
        return null;
    }

    return session.user;
};

export async function GET() {
    const user = await requireSession('api/notifications:GET');
    if (!user) {
        logAuth('warn', 'GET /api/notifications: unauthorized');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
            take: 50,
        }),
        prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
    const user = await requireSession('api/notifications:PATCH');
    if (!user) {
        logAuth('warn', 'PATCH /api/notifications: unauthorized');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as Partial<{
        ids: unknown[];
        markRead?: boolean;
    }>;
    const ids = Array.isArray(payload.ids)
        ? payload.ids.filter((id): id is string => typeof id === 'string')
        : [];

    if (ids.length === 0) {
        return NextResponse.json(
            { success: false, message: 'Missing notification ids' },
            { status: 400 },
        );
    }

    const markRead = payload.markRead !== false;

    await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { read: markRead },
    });

    const unreadCount = await prisma.notification.count({
        where: { userId: user.id, read: false },
    });

    return NextResponse.json({ success: true, unreadCount });
}
