import { Queue, Worker, type ConnectionOptions } from 'bullmq';

import { createImportProcessor } from '../../src/lib/api/import-processor';
import { fetchImportText } from '../../src/lib/api/safe-fetch';

import { getRedis } from './connection';
import { prisma } from './prisma';

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
    worker = new Worker(queueName, (job) => processImport(job.data.importId), {
        connection,
        concurrency: 2,
    });
    worker.on('error', (error) => console.error('[API imports] Worker error:', error.name));
    worker.on('failed', (job) => console.error('[API imports] Worker job failed:', job?.id));
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
            .catch((error) =>
                console.error(
                    '[API imports] Dispatch failed:',
                    error instanceof Error ? error.name : 'Unknown',
                ),
            )
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
