import { getOpenSearchQueue, getScheduledQueue, getTwitchQueue } from './queue';

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

/**
 * Enqueue EventSub registration for a Twitch user.
 * Call this when a user connects their Twitch account.
 */
export async function addTwitchRegisterEventSubJob(
    userId: string,
    twitchId: string,
): Promise<void> {
    const queue = getTwitchQueue();
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
    const queue = getTwitchQueue();
    await queue.add('twitch-unregister-eventsub', { userId, eventSubOnlineId, eventSubOfflineId });
}

export async function addTwitchStreamOnlineJob(
    userId: string,
    twitchStreamId: string,
    startedAt: string,
): Promise<void> {
    const queue = getTwitchQueue();
    await queue.add('twitch-stream-online', { userId, twitchStreamId, startedAt });
}

export async function addTwitchStreamOfflineJob(userId: string): Promise<void> {
    const queue = getTwitchQueue();
    await queue.add('twitch-stream-offline', { userId });
}

/**
 * Enqueue nutrition enrichment for a single ingredient.
 * Call this when a new ingredient is created.
 */
export async function addEnrichIngredientNutritionJob(ingredientId: string): Promise<void> {
    const queue = getScheduledQueue();
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
