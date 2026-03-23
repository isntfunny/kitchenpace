import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

import { ModerationQueueTable } from './moderation-queue-table';

export const dynamic = 'force-dynamic';

export default async function ModerationQueuePage() {
    await ensureModeratorSession('moderation-queue');

    const items = await prisma.moderationQueue.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        include: {
            author: {
                select: { id: true, name: true, email: true },
            },
        },
        take: 100,
    });

    return <ModerationQueueTable items={items} />;
}
