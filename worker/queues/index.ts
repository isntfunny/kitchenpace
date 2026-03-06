export {
    QueueName,
    type AllJob,
    type SyncOpenSearchJob,
    type SyncRecipeToOpenSearchJob,
    type SyncIngredientsJob,
} from './types';
export { getOpenSearchQueue, getScheduledQueue, closeAllQueues } from './queue';
export { getRedis, getSubscriber, disconnectRedis, redisConfig } from './connection';
export { startWorkers, stopWorkers } from './worker';
export {
    startScheduler,
    stopScheduler,
    triggerJobNow,
    getScheduledJobDefinitions,
} from './scheduler';
export { prisma } from './prisma';

import { getOpenSearchQueue } from './queue';

export async function addOpenSearchSyncJob(data?: { batchSize?: number }): Promise<void> {
    const queue = getOpenSearchQueue();
    await queue.add('sync-opensearch', data ?? {});
}

export async function addSyncIngredientsJob(data?: { batchSize?: number }): Promise<void> {
    const queue = getOpenSearchQueue();
    await queue.add('sync-ingredients', data ?? {});
}

export async function addSyncRecipeJob(recipeId: string): Promise<void> {
    const queue = getOpenSearchQueue();
    await queue.add('sync-recipe', { recipeId });
}
