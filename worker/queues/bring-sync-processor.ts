import { Job } from 'bullmq';

import { loadCatalog } from '@app/lib/bring/catalog';
import { BringClient } from '@app/lib/bring/client';
import { isDueForSync, syncConnection, type SyncReport } from '@app/lib/bring/sync';

import { prisma } from './prisma';
import { getQueueForName } from './queue';
import { QueueName, type BringSyncConnectionJob, type BringSyncJob } from './types';

/** Spread the per-connection jobs so Bring! is not hit by all accounts at once. */
const STAGGER_MS = 400;

export interface BringSyncFanOutReport {
    connections: number;
    due: number;
    enqueued: number;
    waitingForBackoff: number;
    dryRun: boolean;
}

/**
 * Every few minutes (KUC-106): one job per Bring! connection with sync turned on. Per-user jobs
 * keep a failing account from holding up the others and give each its own retry/backoff.
 * Connections with repeated errors wait longer (see `backoffMs`); `AUTH_FAILED` is not synced.
 */
export async function processBringSync(job: Job<BringSyncJob>): Promise<BringSyncFanOutReport> {
    const dryRun = job.data.dryRun === true;
    const now = new Date();
    const connections = await prisma.bringConnection.findMany({
        where: { syncEnabled: true, syncStatus: { not: 'AUTH_FAILED' } },
        select: {
            userId: true,
            syncEnabled: true,
            syncStatus: true,
            syncErrorCount: true,
            updatedAt: true,
        },
        orderBy: { lastSyncAt: 'asc' },
        take: job.data.limit ?? 500,
    });
    const due = connections.filter((connection) => isDueForSync(connection, now));
    let enqueued = 0;
    if (!dryRun) {
        const queue = getQueueForName(QueueName.SCHEDULED);
        for (const [index, connection] of due.entries()) {
            const added = await queue.add(
                'bring-sync-connection',
                { userId: connection.userId },
                {
                    // Already queued by a local change or the previous tick: do not stack up
                    jobId: `bring-sync-${connection.userId}`,
                    delay: index * STAGGER_MS,
                    attempts: 1,
                    removeOnComplete: true,
                    removeOnFail: true,
                },
            );
            if (added) enqueued += 1;
        }
    }
    const report = {
        connections: connections.length,
        due: due.length,
        enqueued,
        waitingForBackoff: connections.length - due.length,
        dryRun,
    };
    console.log(
        `[BringSync] ${dryRun ? 'Dry run: ' : ''}${report.due}/${report.connections} connections due, ${report.enqueued} enqueued`,
    );
    return report;
}

/** Syncs one connection; the outcome (including a Bring! outage) is the job result. */
export async function processBringSyncConnection(
    job: Job<BringSyncConnectionJob>,
): Promise<SyncReport> {
    const report = await syncConnection(prisma, job.data.userId, {
        login: (credentials) => BringClient.login(credentials),
        loadCatalog,
        findIngredientId: async (name) =>
            (
                await prisma.ingredient.findFirst({
                    where: { name: { equals: name, mode: 'insensitive' } },
                    select: { id: true },
                })
            )?.id ?? null,
        dryRun: job.data.dryRun === true,
    });
    console.log(
        `[BringSync] user ${job.data.userId}: ${report.outcome} (pushed ${report.pushed}, pulled ${report.pulled}, conflicts ${report.conflicts}, failed ${report.failed})`,
    );
    return report;
}
