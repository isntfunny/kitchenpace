import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

import { ModerationHistoryTable } from '../moderation-history-table';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
    await ensureModeratorSession('moderation-history');

    const [logs, autoItems] = await Promise.all([
        prisma.moderationLog.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                actor: {
                    select: { id: true, name: true, email: true },
                },
            },
            take: 100,
        }),
        prisma.moderationQueue.findMany({
            where: {
                status: { in: ['AUTO_APPROVED', 'REJECTED'] },
                reviewedBy: null,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { id: true, name: true, email: true },
                },
            },
            take: 200,
        }),
    ]);

    return <ModerationHistoryTable logs={logs} autoItems={autoItems} />;
}
