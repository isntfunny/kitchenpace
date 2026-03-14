import { getOpenSearchQueue, getScheduledQueue } from './queue';

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
