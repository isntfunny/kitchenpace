import 'dotenv/config';

import { createLogger } from '../shared/logger';
import { initTelemetry, shutdownTelemetry } from '../shared/telemetry/node-sdk';
import { recordError } from '../shared/telemetry/tracing';

import { startApiImportWorker, stopApiImportWorker } from './queues/api-import-worker';
import { disconnectRedis, getRedis } from './queues/connection';
import { closeAllQueues } from './queues/queue';
import { startScheduler, stopScheduler } from './queues/scheduler';
import { startWorkers, stopWorkers } from './queues/worker';

const log = createLogger('worker');

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    log.info('Starting graceful shutdown', { signal });

    try {
        stopScheduler();
        log.info('Scheduler stopped');
    } catch (error) {
        log.error('Error stopping scheduler', { error });
    }

    try {
        await stopApiImportWorker();
        await stopWorkers();
        log.info('Workers stopped');
    } catch (error) {
        log.error('Error stopping workers', { error });
    }

    try {
        await closeAllQueues();
        log.info('Queues closed');
    } catch (error) {
        log.error('Error closing queues', { error });
    }

    try {
        await disconnectRedis();
        log.info('Redis disconnected');
    } catch (error) {
        log.error('Error disconnecting Redis', { error });
    }

    await shutdownTelemetry();

    log.info('Graceful shutdown complete');
    process.exit(0);
}

async function main(): Promise<void> {
    initTelemetry('kitchenpace-worker');
    log.info('Starting BullMQ Worker...');

    const redis = getRedis();
    await redis.connect();
    log.info('Redis connected');

    await startScheduler();
    log.info('Scheduler started');

    startWorkers();
    startApiImportWorker();
    log.info('BullMQ Worker is running');

    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
        recordError('worker.uncaught_exception', error, {}, { ownSpan: true, module: 'worker' });
        void gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        recordError('worker.unhandled_rejection', reason, {}, { ownSpan: true, module: 'worker' });
    });
}

main().catch((error) => {
    recordError('worker.fatal', error, {}, { ownSpan: true, module: 'worker' });
    void shutdownTelemetry().finally(() => process.exit(1));
});
