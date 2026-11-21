import { SpanKind } from '@opentelemetry/api';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';

import { createLogger } from '../../shared/logger';
import { flushTelemetry } from '../../shared/telemetry/lifecycle';
import { withSpan } from '../../shared/telemetry/tracing';
import { createImportProcessor } from '../../src/lib/api/import-processor';
import { fetchImportText } from '../../src/lib/api/safe-fetch';

import { getRedis } from './connection';
import { prisma } from './prisma';

const log = createLogger('api-import-worker');
const queueName = 'personal-api-imports';
let queue: Queue | undefined;
let worker: Worker | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let dispatching: Promise<void> | undefined;

export function startApiImportWorker() {
    const connection = getRedis() as unknown as ConnectionOptions;
    queue = new Queue(queueName, { connection });
    const processImport = createImportProcessor(prisma, {
        analyze: async (text, url, userId) => {
            const { analyzeWithAI } = await import('../../src/lib/importer/pipeline');
            return analyzeWithAI(prisma, text, url, userId);
        },
        moderate: async (text) => {
            const { moderateContent } = await import('../../src/lib/moderation/moderationService');
            return moderateContent({ text });
        },
        save: async (tx, recipe, userId) => {
            const { saveImportedRecipe } = await import('../../src/lib/importer/pipeline');
            return saveImportedRecipe(tx, recipe, userId);
        },
        fetchText: fetchImportText,
    });
    worker = new Worker(
        queueName,
        (job) =>
            withSpan(
                'job.personal-api-imports.import-recipe',
                async () => {
                    try {
                        return await processImport(job.data.importId);
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
                        'api_import.id': String(job.data?.importId ?? ''),
                    },
                },
            ),
        {
            connection,
            concurrency: 2,
        },
    );
    worker.on('error', (error) => log.error('Worker error', { error }));
    worker.on('failed', (job, error) => log.error('Worker job failed', { jobId: job?.id, error }));
    async function dispatch() {
        await prisma.apiImport.updateMany({
            where: { status: { in: ['queued', 'processing'] }, deadline: { lte: new Date() } },
            data: { status: 'failed', errorCode: 'IMPORT_EXPIRED', input: {} },
        });
        const pending = await prisma.apiImport.findMany({
            where: { status: { in: ['queued', 'processing'] }, deadline: { gt: new Date() } },
            orderBy: { createdAt: 'asc' },
            take: 100,
            select: { id: true },
        });
        for (const row of pending)
            await queue!.add(
                'import-recipe',
                { importId: row.id },
                {
                    jobId: row.id,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    removeOnComplete: true,
                    removeOnFail: true,
                },
            );
    }
    const tick = () => {
        if (dispatching) return;
        dispatching = dispatch()
            .catch((error) => log.error('Dispatch failed', { error }))
            .finally(() => {
                dispatching = undefined;
            });
    };
    timer = setInterval(tick, 5000);
    tick();
}
export async function stopApiImportWorker() {
    if (timer) clearInterval(timer);
    await dispatching;
    await worker?.close();
    await queue?.close();
}
