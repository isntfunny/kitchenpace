import { getEmailQueue, getOpenSearchQueue, getScheduledQueue } from './queue';
import { QueueName } from './types';

interface ScheduledJob {
    name: string;
    queue: QueueName;
    data: Record<string, unknown>;
    options?: {
        repeat?: {
            pattern: string;
            tz?: string;
        };
        delay?: number;
    };
}

const scheduledJobs: ScheduledJob[] = [
    {
        name: 'opensearch-sync',
        queue: QueueName.OPENSEARCH,
        data: { batchSize: 150 },
        options: {
            repeat: {
                pattern: '*/15 * * * *',
            },
        },
    },
    {
        name: 'daily-recipe',
        queue: QueueName.SCHEDULED,
        data: {},
        options: {
            repeat: {
                pattern: '0 8 * * *',
                tz: 'Europe/Berlin',
            },
        },
    },
];

let schedulerInterval: NodeJS.Timeout | null = null;

async function addRepeatableJob(job: ScheduledJob): Promise<void> {
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
        case QueueName.EMAIL:
            return getEmailQueue();
        case QueueName.OPENSEARCH:
            return getOpenSearchQueue();
        case QueueName.SCHEDULED:
            return getScheduledQueue();
        default:
            throw new Error(`Unknown queue: ${queueName}`);
    }
}

export async function startScheduler(): Promise<void> {
    console.log('[Scheduler] Starting job scheduler...');

    for (const job of scheduledJobs) {
        await addRepeatableJob(job);
    }

    console.log(`[Scheduler] Scheduler started with ${scheduledJobs.length} jobs`);

    schedulerInterval = setInterval(async () => {
        console.log('[Scheduler] Checking scheduled jobs...');
    }, 60000);
}

export async function stopScheduler(): Promise<void> {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
    }
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
