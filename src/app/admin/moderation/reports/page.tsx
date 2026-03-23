import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

import { ReportsTable } from '../reports-table';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
    await ensureModeratorSession('moderation-reports');

    const reports = await prisma.report.findMany({
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
        include: {
            reporter: {
                select: { id: true, name: true, email: true },
            },
        },
        take: 100,
    });

    return <ReportsTable reports={reports} />;
}
