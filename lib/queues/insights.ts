import { Queue } from 'bullmq';

import { getEmailQueue, getOpenSearchQueue, getScheduledQueue } from './queue';
import { QueueName } from './types';

export interface QueueSnapshot {
    queue: QueueName;
    counts: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
    workerCount: number;
    idleWorkers: number;
    workerHosts: string[];
    healthy: boolean;
}

function getQueues(): Array<[QueueName, Queue]> {
    return [
        [QueueName.EMAIL, getEmailQueue()],
        [QueueName.OPENSEARCH, getOpenSearchQueue()],
        [QueueName.SCHEDULED, getScheduledQueue()],
    ];
}

export async function getQueueSnapshots(): Promise<QueueSnapshot[]> {
    const queues = getQueues();

    return Promise.all(
        queues.map(async ([queueName, queue]) => {
            const [counts, workers] = await Promise.all([
                queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
                queue.getWorkers(),
            ]);

            const workerCount = workers.length;
            const idleWorkers = workers.filter((worker) => worker.idle).length;
            const workerHosts = workers
                .map((worker) => worker.name || worker.id)
                .filter(Boolean)
                .slice(0, 5) as string[];

            const healthy = workerCount > 0 && (idleWorkers > 0 || counts.active > 0);

            return {
                queue: queueName,
                counts: {
                    waiting: counts.waiting ?? 0,
                    active: counts.active ?? 0,
                    completed: counts.completed ?? 0,
                    failed: counts.failed ?? 0,
                    delayed: counts.delayed ?? 0,
                },
                workerCount,
                idleWorkers,
                workerHosts,
                healthy,
            } satisfies QueueSnapshot;
        }),
    );
}
