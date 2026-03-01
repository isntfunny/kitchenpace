import 'dotenv/config';
import { getRedis, disconnectRedis } from '../lib/queues/connection';
import { closeAllQueues } from '../lib/queues/queue';
import { startScheduler, stopScheduler } from '../lib/queues/scheduler';
import { startWorkers, stopWorkers } from '../lib/queues/worker';

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`[Main] Received ${signal}, starting graceful shutdown...`);

    try {
        await stopScheduler();
        console.log('[Main] Scheduler stopped');
    } catch (error) {
        console.error('[Main] Error stopping scheduler:', error);
    }

    try {
        await stopWorkers();
        console.log('[Main] Workers stopped');
    } catch (error) {
        console.error('[Main] Error stopping workers:', error);
    }

    try {
        await closeAllQueues();
        console.log('[Main] Queues closed');
    } catch (error) {
        console.error('[Main] Error closing queues:', error);
    }

    try {
        await disconnectRedis();
        console.log('[Main] Redis disconnected');
    } catch (error) {
        console.error('[Main] Error disconnecting Redis:', error);
    }

    console.log('[Main] Graceful shutdown complete');
    process.exit(0);
}

async function main(): Promise<void> {
    console.log('[Main] Starting BullMQ Worker...');

    const redis = getRedis();
    await redis.connect();
    console.log('[Main] Redis connected');

    await startScheduler();
    console.log('[Main] Scheduler started');

    startWorkers();
    console.log('[Main] Workers started');

    console.log('[Main] BullMQ Worker is running');

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
        console.error('[Main] Uncaught exception:', error);
        gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        console.error('[Main] Unhandled rejection:', reason);
    });
}

main().catch((error) => {
    console.error('[Main] Fatal error:', error);
    process.exit(1);
});
