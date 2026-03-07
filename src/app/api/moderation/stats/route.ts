import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

export async function GET() {
    const session = await getServerAuthSession('api/moderation/stats');
    if (!session?.user?.id) {
        return NextResponse.json({ total: 0 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== Role.ADMIN && user?.role !== Role.MODERATOR) {
        return NextResponse.json({ total: 0 });
    }

    const [pendingCount, reportCount] = await Promise.all([
        prisma.moderationQueue.count({ where: { status: 'PENDING' } }),
        prisma.report.count({ where: { resolved: false } }),
    ]);

    return NextResponse.json({ total: pendingCount + reportCount });
}
