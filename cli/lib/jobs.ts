import { triggerJobNow as triggerJob } from '../../worker/queues/scheduler.js';
import { QueueName } from '../../worker/queues/types.js';

export async function triggerJobNow(queue: string, jobName: string, data: Record<string, unknown>) {
    if (!Object.values(QueueName).includes(queue as QueueName)) {
        console.error(
            `Error: Unknown queue "${queue}". Use one of: ${Object.values(QueueName).join(', ')}`,
        );
        process.exit(1);
    }
    await triggerJob(queue as QueueName, jobName, data);
}

export function listQueues(): string[] {
    return Object.values(QueueName);
}

export function listJobs(queue: string): string[] {
    const defs = getJobDefinitions();
    return defs[queue as keyof typeof defs] || [];
}

export function getJobDefinitions(): Record<string, string[]> {
    return {
        opensearch: ['sync-opensearch', 'sync-recipe', 'sync-ingredients'],
        scheduled: ['opensearch-sync', 'sync-ingredients', 'trending-recipes'],
    };
}
