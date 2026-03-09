import { Job, Worker, WorkerOptions } from 'bullmq';

import { processDatabaseBackup } from './backup-processor';
import { getRedis } from './connection';
import { createJobRun, updateJobRun } from './job-run';
import {
    processSyncIngredients,
    processSyncOpenSearch,
    processSyncRecipeToOpenSearch,
} from './opensearch-processor';
import {
    processTrendingRecipes,
    processSyncContactsNotifuse,
    processBackupDatabase,
    processCachePurge,
} from './scheduled-processor';
import { QueueName } from './types';

// Job processors per queue — each queue has exactly one Worker instance.
// Jobs are dispatched by name to avoid multiple Workers competing on the same queue
// with the wrong processor.
const queueProcessors: Record<QueueName, (job: Job) => Promise<unknown>> = {
    [QueueName.OPENSEARCH]: async (job) => {
        switch (job.name) {
            case 'sync-opensearch':
                return processSyncOpenSearch(job);
            case 'sync-ingredients':
                return processSyncIngredients(job);
            case 'sync-recipe':
                return processSyncRecipeToOpenSearch(job);
            default:
                throw new Error(`Unknown opensearch job: ${job.name}`);
        }
    },
    [QueueName.SCHEDULED]: async (job) => {
        switch (job.name) {
            case 'trending-recipes':
                return processTrendingRecipes(job);
            case 'sync-contacts-notifuse':
                return processSyncContactsNotifuse(job);
            case 'backup-database-hourly':
                return processBackupDatabase(job, 'hourly');
            case 'backup-database-daily':
                return processBackupDatabase(job, 'daily');
            case 'purge-thumbnail-cache':
                return processCachePurge(job);
            default:
                throw new Error(`Unknown scheduled job: ${job.name}`);
        }
    },
    [QueueName.BACKUP]: async (job) => {
        switch (job.name) {
            case 'database-backup':
                return processDatabaseBackup(job);
            default:
                throw new Error(`Unknown backup job: ${job.name}`);
        }
    },
};

const queueOptions: Partial<Record<QueueName, Omit<WorkerOptions, 'connection'>>> = {
    [QueueName.BACKUP]: {
        concurrency: 1,
        limiter: { max: 1, duration: 60000 },
    },
};

const DEFAULT_WORKER_OPTIONS: Omit<WorkerOptions, 'connection'> = {
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
    removeOnComplete: { count: 100, age: 3600 },
    removeOnFail: { count: 200 },
};

const workers: Worker[] = [];

export interface WorkerDefinitionSummary {
    name: string;
    queue: QueueName;
    concurrency: number;
    limiter?: WorkerOptions['limiter'];
}

export function getWorkerDefinitions(): WorkerDefinitionSummary[] {
    return (Object.keys(queueProcessors) as QueueName[]).map((queue) => {
        const opts = queueOptions[queue];
        return {
            name: queue,
            queue,
            concurrency: opts?.concurrency ?? DEFAULT_WORKER_OPTIONS.concurrency ?? 5,
            limiter: opts?.limiter ?? DEFAULT_WORKER_OPTIONS.limiter,
        };
    });
}

export function startWorkers(): void {
    console.log('[Worker] Starting BullMQ workers...');

    for (const [queueName, processor] of Object.entries(queueProcessors) as [
        QueueName,
        (job: Job) => Promise<unknown>,
    ][]) {
        const worker = new Worker(
            queueName,
            async (job) => {
                const jobRun = await createJobRun({
                    queueName,
                    jobName: job.name,
                    jobId: job.id,
                    payload: job.data as Record<string, unknown>,
                });

                try {
                    console.log(`[Worker] Processing job: ${job.name} (${job.id})`);
                    await updateJobRun(jobRun.id, { status: 'PROCESSING', startedAt: new Date() });

                    const result = await processor(job);

                    await updateJobRun(jobRun.id, {
                        status: 'COMPLETED',
                        result: result as Record<string, unknown>,
                        completedAt: new Date(),
                    });

                    console.log(`[Worker] Completed job: ${job.name} (${job.id})`);
                    return result;
                } catch (error) {
                    await updateJobRun(jobRun.id, {
                        status: 'FAILED',
                        errorMessage: error instanceof Error ? error.message : String(error),
                        completedAt: new Date(),
                    });
                    throw error;
                }
            },
            {
                ...DEFAULT_WORKER_OPTIONS,
                ...queueOptions[queueName],
                connection: getRedis() as any,
            },
        );

        worker.on('completed', (job) => {
            console.log(`[Worker] Job ${job.name} (${job.id}) completed successfully`);
        });
        worker.on('failed', (job, err) => {
            console.error(`[Worker] Job ${job?.name} (${job?.id}) failed:`, err.message);
        });
        worker.on('error', (err) => {
            console.error(`[Worker] Worker error:`, err.message);
        });

        workers.push(worker);
        console.log(`[Worker] Registered worker for queue: ${queueName}`);
    }

    console.log(`[Worker] All workers started (${workers.length} workers)`);
}

export async function stopWorkers(): Promise<void> {
    console.log('[Worker] Stopping BullMQ workers...');
    await Promise.all(workers.map((w) => w.close()));
    workers.length = 0;
    console.log('[Worker] All workers stopped');
}

export { QueueName };
