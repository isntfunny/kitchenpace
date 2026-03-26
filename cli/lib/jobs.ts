import { disconnectRedis } from '../../worker/queues/connection.js';
import { closeAllQueues } from '../../worker/queues/queue.js';
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
    await closeAllQueues();
    await disconnectRedis();
}

export function getJobDefinitions(): Record<string, string[]> {
    return {
        opensearch: [
            'sync-recipes',
            'sync-recipe',
            'sync-ingredients',
            'sync-tags',
            'backfill-embeddings',
            'reindex',
        ],
        scheduled: [
            'trending-recipes',
            'sync-contacts-notifuse',
            'backup-database-hourly',
            'backup-database-daily',
            'purge-thumbnail-cache',
            'generate-og-images',
            'enrich-ingredient-nutrition',
            'backfill-ingredient-enrichment',
            'backfill-ingredient-plurals',
        ],
        backup: ['database-backup'],
    };
}
