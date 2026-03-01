import { Worker, WorkerOptions } from 'bullmq';

import { getRedis } from './connection';
import {
    processSendEmail,
    processSendTemplatedEmail,
    processSendBatchEmails,
} from './email-processor';
import { createJobRun, updateJobRun } from './job-run';
import { processSyncOpenSearch, processSyncRecipeToOpenSearch } from './opensearch-processor';
import { processDailyRecipe, processWeeklyNewsletter } from './scheduled-processor';
import { QueueName } from './types';

const DEFAULT_WORKER_OPTIONS: WorkerOptions = {
    concurrency: 5,
    limiter: {
        max: 10,
        duration: 1000,
    },
    removeOnComplete: {
        count: 100,
        age: 3600,
    },
    removeOnFail: {
        count: 200,
    },
};

export interface WorkerRegistration {
    name: string;
    queue: QueueName;
    processor: (job: any) => Promise<any>;
    options?: WorkerOptions;
}

const workerRegistrations: WorkerRegistration[] = [
    {
        name: 'send-email',
        queue: QueueName.EMAIL,
        processor: processSendEmail,
    },
    {
        name: 'send-templated-email',
        queue: QueueName.EMAIL,
        processor: processSendTemplatedEmail,
    },
    {
        name: 'send-batch-emails',
        queue: QueueName.EMAIL,
        processor: processSendBatchEmails,
    },
    {
        name: 'sync-opensearch',
        queue: QueueName.OPENSEARCH,
        processor: processSyncOpenSearch,
    },
    {
        name: 'sync-recipe',
        queue: QueueName.OPENSEARCH,
        processor: processSyncRecipeToOpenSearch,
    },
    {
        name: 'daily-recipe',
        queue: QueueName.SCHEDULED,
        processor: processDailyRecipe,
    },
    {
        name: 'weekly-newsletter',
        queue: QueueName.SCHEDULED,
        processor: processWeeklyNewsletter,
    },
];

const workers: Worker[] = [];

export function startWorkers(): void {
    console.log('[Worker] Starting BullMQ workers...');

    for (const registration of workerRegistrations) {
        const queueName = registration.queue;

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

                    await updateJobRun(jobRun.id, {
                        status: 'PROCESSING',
                        startedAt: new Date(),
                    });

                    const result = await registration.processor(job);

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
                ...registration.options,
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
        console.log(`[Worker] Registered: ${registration.name} -> ${registration.queue}`);
    }

    console.log(`[Worker] All workers started (${workers.length} workers)`);
}

export async function stopWorkers(): Promise<void> {
    console.log('[Worker] Stopping BullMQ workers...');

    await Promise.all(
        workers.map(async (worker) => {
            await worker.close();
        }),
    );

    workers.length = 0;
    console.log('[Worker] All workers stopped');
}

export { QueueName };
