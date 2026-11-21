import { SpanKind } from '@opentelemetry/api';
import { Job, Worker, WorkerOptions } from 'bullmq';

import { createLogger } from '../../shared/logger';
import { flushTelemetry } from '../../shared/telemetry/lifecycle';
import { withSpan } from '../../shared/telemetry/tracing';

import { getRedis } from './connection';
import { createJobRun, updateJobRun } from './job-run';
import { JOB_REGISTRY } from './registry';
import { QueueName } from './types';

const log = createLogger('worker');

// ── Registry-driven dispatch ────────────────────────────────────────
// Build a dispatch map from the central registry at module load.
// Each queue gets a Map<jobName, processor> derived automatically.

const dispatchByQueue = new Map<QueueName, Map<string, (job: Job) => Promise<unknown>>>();

for (const [name, def] of Object.entries(JOB_REGISTRY)) {
    if (!dispatchByQueue.has(def.queue)) {
        dispatchByQueue.set(def.queue, new Map());
    }
    dispatchByQueue.get(def.queue)!.set(name, def.processor);
}

function createQueueProcessor(queue: QueueName): (job: Job) => Promise<unknown> {
    const jobs = dispatchByQueue.get(queue);
    if (!jobs) throw new Error(`No jobs registered for queue: ${queue}`);
    return async (job: Job) => {
        const processor = jobs.get(job.name);
        if (!processor) throw new Error(`Unknown ${queue} job: ${job.name}`);
        return processor(job);
    };
}

// ── Worker configuration ────────────────────────────────────────────

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

// ── All queues that have at least one job in the registry ───────────

const activeQueues = [...dispatchByQueue.keys()];

// ── Public API ──────────────────────────────────────────────────────

export function startWorkers(): void {
    log.info('Starting BullMQ workers');

    for (const queueName of activeQueues) {
        const processor = createQueueProcessor(queueName);

        const worker = new Worker(
            queueName,
            async (job) => {
                return withSpan(
                    `job.${queueName}.${job.name}`,
                    async () => {
                        const jobRun = await createJobRun({
                            queueName,
                            jobName: job.name,
                            jobId: job.id,
                            payload: job.data as Record<string, unknown>,
                        });

                        try {
                            log.info('Processing job', {
                                queue: queueName,
                                jobName: job.name,
                                jobId: job.id,
                            });
                            await updateJobRun(jobRun.id, {
                                status: 'PROCESSING',
                                startedAt: new Date(),
                            });

                            const result = await processor(job);

                            await updateJobRun(jobRun.id, {
                                status: 'COMPLETED',
                                result: result as Record<string, unknown>,
                                completedAt: new Date(),
                            });

                            log.info('Completed job', {
                                queue: queueName,
                                jobName: job.name,
                                jobId: job.id,
                            });
                            return result;
                        } catch (error) {
                            await updateJobRun(jobRun.id, {
                                status: 'FAILED',
                                errorMessage:
                                    error instanceof Error ? error.message : String(error),
                                completedAt: new Date(),
                            });
                            throw error;
                        } finally {
                            await flushTelemetry();
                        }
                    },
                    {
                        kind: SpanKind.CONSUMER,
                        attributes: {
                            'messaging.system': 'bullmq',
                            'messaging.destination.name': queueName,
                            'bullmq.job.name': job.name,
                            'bullmq.job.id': job.id ?? '',
                            'bullmq.job.attempt': job.attemptsMade + 1,
                        },
                    },
                );
            },
            {
                ...DEFAULT_WORKER_OPTIONS,
                ...queueOptions[queueName],
                connection: getRedis() as any,
            },
        );

        worker.on('completed', (job) => {
            log.info('Job completed', { queue: queueName, jobName: job.name, jobId: job.id });
        });
        worker.on('failed', (job, err) => {
            log.error('Job failed', {
                queue: queueName,
                jobName: job?.name,
                jobId: job?.id,
                error: err,
            });
        });
        worker.on('error', (err) => {
            log.error('Worker error', { queue: queueName, error: err });
        });

        workers.push(worker);
        log.info('Registered worker', { queue: queueName });
    }

    log.info('All workers started', { count: workers.length });
}

export async function stopWorkers(): Promise<void> {
    log.info('Stopping BullMQ workers');
    await Promise.all(workers.map((w) => w.close()));
    workers.length = 0;
    log.info('All workers stopped');
}
