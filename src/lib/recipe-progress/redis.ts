import type { PersistedViewerState } from '@app/components/flow/viewer/viewerPersistence';
import { getRealtimeRedis } from '@app/lib/realtime/redis';

const TTL_SECONDS = 48 * 60 * 60; // 48 hours

const key = (userId: string, recipeSlug: string) => `recipe-progress:${userId}:${recipeSlug}`;

export async function saveRecipeProgress(
    userId: string,
    recipeSlug: string,
    state: PersistedViewerState,
): Promise<void> {
    const redis = getRealtimeRedis();
    await redis.set(key(userId, recipeSlug), JSON.stringify(state), 'EX', TTL_SECONDS);
}

export async function loadRecipeProgress(
    userId: string,
    recipeSlug: string,
): Promise<PersistedViewerState | null> {
    const redis = getRealtimeRedis();
    const raw = await redis.get(key(userId, recipeSlug));
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as PersistedViewerState;
        if (parsed.version !== 1) return null;
        return parsed;
    } catch {
        return null;
    }
}

export async function clearRecipeProgress(userId: string, recipeSlug: string): Promise<void> {
    const redis = getRealtimeRedis();
    await redis.del(key(userId, recipeSlug));
}
