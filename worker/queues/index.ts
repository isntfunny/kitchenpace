export {
    QueueName,
    type AllJob,
    type SyncRecipesJob,
    type SyncRecipeToOpenSearchJob,
    type SyncIngredientsJob,
    type SyncTagsJob,
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

import { getOpenSearchQueue, getScheduledQueue } from './queue';

export async function addRecipesSyncJob(data?: { batchSize?: number }): Promise<void> {
    const queue = getOpenSearchQueue();
    await queue.add('sync-recipes', data ?? {});
}

export async function addSyncIngredientsJob(data?: { batchSize?: number }): Promise<void> {
    const queue = getOpenSearchQueue();
    await queue.add('sync-ingredients', data ?? {});
}

export async function addSyncTagsJob(data?: { batchSize?: number }): Promise<void> {
    const queue = getOpenSearchQueue();
    await queue.add('sync-tags', data ?? {});
}

export async function addSyncRecipeJob(recipeId: string): Promise<void> {
    const queue = getOpenSearchQueue();
    await queue.add('sync-recipe', { recipeId });
}

/**
 * Enqueue OG image generation for a single recipe.
 * Call this when a recipe image is approved (auto or manual).
 */
export async function addGenerateRecipeOgJob(recipeId: string, imageKey: string): Promise<void> {
    const queue = getScheduledQueue();
    await queue.add('generate-recipe-og', { recipeId, imageKey }, { priority: 2 });
}
