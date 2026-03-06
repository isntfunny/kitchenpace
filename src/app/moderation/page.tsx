import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';
import { css } from 'styled-system/css';

import { ModerationQueueTable } from './moderation-queue-table';
import { ReportsTable } from './reports-table';

export default async function ModerationPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    await ensureModeratorSession('moderation-page');

    const params = await searchParams;
    const tab = params.tab ?? 'queue';

    const [pendingCount, reportCount] = await Promise.all([
        prisma.moderationQueue.count({ where: { status: 'PENDING' } }),
        prisma.report.count({ where: { resolved: false } }),
    ]);

    const items =
        tab === 'reports'
            ? []
            : await prisma.moderationQueue.findMany({
                  where: { status: 'PENDING' },
                  orderBy: { createdAt: 'asc' },
                  include: {
                      author: {
                          select: { id: true, name: true, email: true },
                      },
                  },
                  take: 100,
              });

    const reports =
        tab === 'reports'
            ? await prisma.report.findMany({
                  where: { resolved: false },
                  orderBy: { createdAt: 'desc' },
                  include: {
                      reporter: {
                          select: { id: true, name: true, email: true },
                      },
                  },
                  take: 100,
              })
            : [];

    return (
        <div>
            {/* Stats */}
            <div className={css({ display: 'flex', gap: '4', mb: '6' })}>
                <div
                    className={css({
                        px: '4',
                        py: '3',
                        borderRadius: 'xl',
                        bg: pendingCount > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                        border: '1px solid',
                        borderColor: pendingCount > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)',
                    })}
                >
                    <span className={css({ fontSize: '2xl', fontWeight: '800' })}>
                        {pendingCount}
                    </span>
                    <span className={css({ fontSize: 'sm', color: 'text.muted', ml: '2' })}>
                        ausstehend
                    </span>
                </div>
                <div
                    className={css({
                        px: '4',
                        py: '3',
                        borderRadius: 'xl',
                        bg: reportCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        border: '1px solid',
                        borderColor: reportCount > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
                    })}
                >
                    <span className={css({ fontSize: '2xl', fontWeight: '800' })}>
                        {reportCount}
                    </span>
                    <span className={css({ fontSize: 'sm', color: 'text.muted', ml: '2' })}>
                        Meldungen
                    </span>
                </div>
            </div>

            {/* Tab content */}
            {tab === 'reports' ? (
                <ReportsTable reports={reports} />
            ) : (
                <ModerationQueueTable items={items} />
            )}
        </div>
    );
}
