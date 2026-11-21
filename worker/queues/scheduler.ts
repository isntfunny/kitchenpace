import { createLogger } from '../../shared/logger';

import { getQueueForName } from './queue';
import { JOB_REGISTRY } from './registry';
import { QueueName, type JobPayloadSchema } from './types';

const log = createLogger('scheduler');

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

// ── Derive job definitions from the central registry ────────────────

function getScheduledJobDefinitions(): ScheduledJobDefinition[] {
    return Object.entries(JOB_REGISTRY).map(([name, def]) => {
        const d = def as {
            queue: QueueName;
            defaultData: unknown;
            schema?: JobPayloadSchema;
            repeat?: { pattern: string; tz?: string };
        };
        return {
            name,
            queue: d.queue,
            data: d.defaultData as Record<string, unknown>,
            schema: d.schema,
            options: d.repeat ? { repeat: d.repeat } : undefined,
        };
    });
}

// ── Scheduler internals ─────────────────────────────────────────────

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
        log.info('Added repeatable job', { jobName, pattern: repeatOpts.pattern });
    } else if (job.options?.delay) {
        await queue.add(jobName, jobData, {
            delay: job.options.delay,
        });
        log.info('Added delayed job', { jobName, delayMs: job.options.delay });
    }
}

/**
 * Remove repeatable jobs from a queue that are no longer defined in the registry.
 * This prevents stale/renamed jobs from firing indefinitely in Redis.
 */
async function pruneStaleRepeatables(): Promise<void> {
    const allJobs = getScheduledJobDefinitions();
    const expectedByQueue = new Map<QueueName, Set<string>>();

    for (const job of allJobs) {
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
                log.info('Removed stale repeatable job', { jobName: rep.name, queue: queueName });
            }
        }
    }
}

export async function startScheduler(): Promise<void> {
    log.info('Starting job scheduler');

    await pruneStaleRepeatables();

    const allJobs = getScheduledJobDefinitions();
    for (const job of allJobs) {
        await addRepeatableJob(job);
    }

    log.info('Scheduler started', { jobCount: allJobs.length });
}

export function stopScheduler(): void {
    log.info('Scheduler stopped');
}

export async function triggerJobNow(
    name: QueueName,
    jobName: string,
    data: Record<string, unknown>,
): Promise<void> {
    if (!(jobName in JOB_REGISTRY)) {
        throw new Error(`Unknown job: ${jobName}`);
    }
    const queue = getQueueForName(name);
    await queue.add(jobName, data);
    log.info('Triggered job', { queue: name, jobName });
}
