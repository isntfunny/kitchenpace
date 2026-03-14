'use server';

import type { PersistedViewerState } from '@app/components/flow/viewer/viewerPersistence';
import { getServerAuthSession } from '@app/lib/auth';
import {
    clearRecipeProgress,
    loadRecipeProgress,
    saveRecipeProgress,
} from '@app/lib/recipe-progress/redis';

export async function syncRecipeProgress(
    recipeSlug: string,
    state: PersistedViewerState,
): Promise<void> {
    const session = await getServerAuthSession('syncRecipeProgress');
    if (!session?.user?.id) return;
    await saveRecipeProgress(session.user.id, recipeSlug, state);
}

export async function fetchRecipeProgress(
    recipeSlug: string,
): Promise<PersistedViewerState | null> {
    const session = await getServerAuthSession('fetchRecipeProgress');
    if (!session?.user?.id) return null;
    return loadRecipeProgress(session.user.id, recipeSlug);
}

export async function deleteRecipeProgress(recipeSlug: string): Promise<void> {
    const session = await getServerAuthSession('deleteRecipeProgress');
    if (!session?.user?.id) return;
    await clearRecipeProgress(session.user.id, recipeSlug);
}
