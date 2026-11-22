import { isAiAutomationEnabled } from '../../shared/ai-automation';
import { createLogger } from '../../shared/logger';

import { getQueueForName } from './queue';
import { JOB_REGISTRY } from './registry';
import {
    buildScheduledJobDefinitions,
    staleRepeatableKeys,
    type ScheduledJobDefinition,
} from './schedule-definitions';
import { QueueName } from './types';

export type { ScheduledJobDefinition } from './schedule-definitions';

const log = createLogger('scheduler');

function getScheduledJobDefinitions(): ScheduledJobDefinition[] {
    return buildScheduledJobDefinitions(JOB_REGISTRY, isAiAutomationEnabled());
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
 * Remove repeatable jobs that have no repeat in the current definitions
 * (gone from the registry, renamed, or switched off with AI_AUTOMATION=off).
 * This prevents stale jobs from firing indefinitely in Redis.
 */
async function pruneStaleRepeatables(): Promise<void> {
    const allJobs = getScheduledJobDefinitions();
    const expectedByQueue = new Map<QueueName, Set<string>>();

    // Every queue of the registry is checked, also one whose jobs all lost their repeat
    for (const job of allJobs) {
        if (!expectedByQueue.has(job.queue)) {
            expectedByQueue.set(job.queue, new Set());
        }
        if (job.options?.repeat) expectedByQueue.get(job.queue)!.add(job.name);
    }

    for (const [queueName, expectedNames] of expectedByQueue) {
        const queue = getQueueForName(queueName);
        const repeatables = await queue.getRepeatableJobs();

        for (const key of staleRepeatableKeys(repeatables, expectedNames)) {
            await queue.removeRepeatableByKey(key);
            log.info('Removed stale repeatable job', { key, queue: queueName });
        }
    }
}

export async function startScheduler(): Promise<void> {
    log.info('Starting job scheduler', { aiAutomation: isAiAutomationEnabled() });

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
