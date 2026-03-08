import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

import { fetchAdminInboxItems } from '@app/lib/admin-inbox';
import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

async function requireModerator() {
    const session = await getServerAuthSession('api/admin/notifications');

    if (!session?.user?.id) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== Role.ADMIN && user?.role !== Role.MODERATOR) {
        return null;
    }

    return session.user;
}

export async function GET() {
    const user = await requireModerator();
    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await fetchAdminInboxItems(50);
    return NextResponse.json({
        notifications,
        count: notifications.length,
    });
}
