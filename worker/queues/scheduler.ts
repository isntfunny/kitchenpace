import { getOpenSearchQueue, getScheduledQueue, getBackupQueue } from './queue';
import { QueueName, type JobPayloadSchema } from './types';

export interface ScheduledJobDefinition {
    name: string;
    queue: QueueName;
    data: Record<string, unknown>;
    schema?: JobPayloadSchema;
    options?: {
        repeat?: {
            pattern: string;
            tz?: string;
        };
        delay?: number;
    };
}

const scheduledJobs: ScheduledJobDefinition[] = [
    {
        name: 'sync-recipes',
        queue: QueueName.OPENSEARCH,
        data: { batchSize: 150 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 150, min: 1, max: 1000 },
        },
        options: {
            repeat: {
                pattern: '*/15 * * * *',
            },
        },
    },
    {
        name: 'sync-ingredients',
        queue: QueueName.OPENSEARCH,
        data: { batchSize: 500 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 500, min: 1, max: 2000 },
        },
        options: {
            repeat: {
                pattern: '0 */1 * * *',
                tz: 'Europe/Berlin',
            },
        },
    },
    {
        name: 'sync-tags',
        queue: QueueName.OPENSEARCH,
        data: { batchSize: 500 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 500, min: 1, max: 2000 },
        },
        options: {
            repeat: {
                pattern: '0 */1 * * *',
                tz: 'Europe/Berlin',
            },
        },
    },
    {
        name: 'trending-recipes',
        queue: QueueName.SCHEDULED,
        data: {},
        options: {
            repeat: {
                pattern: '0 6 * * *',
                tz: 'Europe/Berlin',
            },
        },
    },
    {
        name: 'sync-contacts-notifuse',
        queue: QueueName.SCHEDULED,
        data: { batchSize: 100 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 100, min: 1, max: 500 },
        },
        options: {
            repeat: {
                pattern: '0 */6 * * *',
                tz: 'Europe/Berlin',
            },
        },
    },
    {
        name: 'backup-database-hourly',
        queue: QueueName.SCHEDULED,
        data: {},
        options: {
            repeat: {
                pattern: '0 * * * *',
                tz: 'Europe/Berlin',
            },
        },
    },
    {
        name: 'backup-database-daily',
        queue: QueueName.SCHEDULED,
        data: {},
        options: {
            repeat: {
                pattern: '0 2 * * *',
                tz: 'Europe/Berlin',
            },
        },
    },
    {
        name: 'generate-og-images',
        queue: QueueName.SCHEDULED,
        data: { batchSize: 50 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 50, min: 1, max: 200 },
        },
        options: {
            repeat: {
                pattern: '0 */2 * * *', // every 2 hours
                tz: 'Europe/Berlin',
            },
        },
    },
    {
        name: 'purge-thumbnail-cache',
        queue: QueueName.SCHEDULED,
        data: { maxAgeDays: 3 },
        schema: {
            maxAgeDays: { type: 'number', label: 'Max Age (days)', default: 3, min: 1, max: 30 },
        },
        options: {
            repeat: {
                pattern: '0 * * * *',
                tz: 'Europe/Berlin',
            },
        },
    },
];

async function addRepeatableJob(job: ScheduledJobDefinition): Promise<void> {
    const queue = getQueueForName(job.queue);

    const jobName = job.name;
    const jobData = job.data;
    const repeatOpts = job.options?.repeat;

    if (repeatOpts) {
        await queue.add(jobName, jobData, {
            repeat: {
                pattern: repeatOpts.pattern,
                tz: repeatOpts.tz,
            },
        });
        console.log(`[Scheduler] Added repeatable job: ${jobName} (${repeatOpts.pattern})`);
    } else if (job.options?.delay) {
        await queue.add(jobName, jobData, {
            delay: job.options.delay,
        });
        console.log(`[Scheduler] Added delayed job: ${jobName} (${job.options.delay}ms)`);
    }
}

function getQueueForName(queueName: QueueName) {
    switch (queueName) {
        case QueueName.OPENSEARCH:
            return getOpenSearchQueue();
        case QueueName.SCHEDULED:
            return getScheduledQueue();
        case QueueName.BACKUP:
            return getBackupQueue();
        default:
            throw new Error(`Unknown queue: ${queueName}`);
    }
}

/**
 * Remove repeatable jobs from a queue that are no longer defined in scheduledJobs.
 * This prevents stale/renamed jobs from firing indefinitely in Redis.
 */
async function pruneStaleRepeatables(): Promise<void> {
    const expectedByQueue = new Map<QueueName, Set<string>>();
    for (const job of scheduledJobs) {
        if (!expectedByQueue.has(job.queue)) {
            expectedByQueue.set(job.queue, new Set());
        }
        expectedByQueue.get(job.queue)!.add(job.name);
    }

    for (const [queueName, expectedNames] of expectedByQueue) {
        const queue = getQueueForName(queueName);
        const repeatables = await queue.getRepeatableJobs();

        for (const rep of repeatables) {
            if (!expectedNames.has(rep.name)) {
                await queue.removeRepeatableByKey(rep.key);
                console.log(
                    `[Scheduler] Removed stale repeatable job: "${rep.name}" from queue "${queueName}"`,
                );
            }
        }
    }
}

export async function startScheduler(): Promise<void> {
    console.log('[Scheduler] Starting job scheduler...');

    await pruneStaleRepeatables();

    for (const job of scheduledJobs) {
        await addRepeatableJob(job);
    }

    console.log(`[Scheduler] Scheduler started with ${scheduledJobs.length} jobs`);
}

export function stopScheduler(): void {
    console.log('[Scheduler] Scheduler stopped');
}

export async function triggerJobNow(
    name: QueueName,
    jobName: string,
    data: Record<string, unknown>,
): Promise<void> {
    const queue = getQueueForName(name);
    await queue.add(jobName, data);
    console.log(`[Scheduler] Triggered job: ${jobName}`);
}

export function getScheduledJobDefinitions(): ScheduledJobDefinition[] {
    return scheduledJobs;
}
