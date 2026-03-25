import { getQueueForName } from './queue';
import { JOB_REGISTRY } from './registry';

export async function addSyncRecipeJob(recipeId: string): Promise<void> {
    const queue = getQueueForName(JOB_REGISTRY['sync-recipe'].queue);
    await queue.add('sync-recipe', { recipeId });
}

/**
 * Enqueue OG image generation for a single recipe.
 * Call this when a recipe image is approved (auto or manual).
 */
export async function addGenerateRecipeOgJob(recipeId: string, imageKey: string): Promise<void> {
    const queue = getQueueForName(JOB_REGISTRY['generate-recipe-og'].queue);
    await queue.add('generate-recipe-og', { recipeId, imageKey }, { priority: 2 });
}

/**
 * Enqueue EventSub registration for a Twitch user.
 * Call this when a user connects their Twitch account.
 */
export async function addTwitchRegisterEventSubJob(
    userId: string,
    twitchId: string,
): Promise<void> {
    const queue = getQueueForName(JOB_REGISTRY['twitch-register-eventsub'].queue);
    await queue.add('twitch-register-eventsub', { userId, twitchId });
}

/**
 * Enqueue EventSub unregistration for a Twitch user.
 * Call this when a user disconnects their Twitch account.
 */
export async function addTwitchUnregisterEventSubJob(
    userId: string,
    eventSubOnlineId?: string,
    eventSubOfflineId?: string,
): Promise<void> {
    const queue = getQueueForName(JOB_REGISTRY['twitch-unregister-eventsub'].queue);
    await queue.add('twitch-unregister-eventsub', { userId, eventSubOnlineId, eventSubOfflineId });
}

export async function addTwitchStreamOnlineJob(
    userId: string,
    twitchStreamId: string,
    startedAt: string,
): Promise<void> {
    const queue = getQueueForName(JOB_REGISTRY['twitch-stream-online'].queue);
    await queue.add('twitch-stream-online', { userId, twitchStreamId, startedAt });
}

export async function addTwitchStreamOfflineJob(userId: string): Promise<void> {
    const queue = getQueueForName(JOB_REGISTRY['twitch-stream-offline'].queue);
    await queue.add('twitch-stream-offline', { userId });
}

/**
 * Enqueue nutrition enrichment for a single ingredient.
 * Call this when a new ingredient is created.
 */
export async function addEnrichIngredientNutritionJob(ingredientId: string): Promise<void> {
    const queue = getQueueForName(JOB_REGISTRY['enrich-ingredient-nutrition'].queue);
    await queue.add(
        'enrich-ingredient-nutrition',
        { ingredientId },
        {
            priority: 5,
            jobId: `enrich-nutrition-${ingredientId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 30_000 },
        },
    );
}
