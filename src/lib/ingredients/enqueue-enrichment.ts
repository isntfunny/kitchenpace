// Enqueues AI enrichment (nutrition, units, categories, shelf life, display
// name) for a newly created ingredient. Never throws: if the queue is down,
// the daily backfill-ingredient-enrichment job finds the ingredient later
// (it selects ingredients without shelfLifeSource or normalizedName).

import { createLogger } from '@shared/logger';

const log = createLogger('ingredient-enrichment');

type Enqueue = (ingredientId: string) => Promise<void>;

const defaultEnqueue: Enqueue = async (ingredientId) => {
    const { addEnrichIngredientNutritionJob } = await import('@worker/queues');
    await addEnrichIngredientNutritionJob(ingredientId);
};

let enqueue: Enqueue = defaultEnqueue;

/**
 * Replaces the queue call; pass nothing to restore it. Used by tests and by
 * bulk scripts that collect the new ingredients and enqueue them at the end.
 */
export function setEnrichmentEnqueuer(next?: Enqueue) {
    enqueue = next ?? defaultEnqueue;
}

/** Test seam (same as setEnrichmentEnqueuer). */
export const setEnrichmentEnqueuerForTests = setEnrichmentEnqueuer;

/** Returns false when enqueueing failed; the caller can ignore the result. */
export async function enqueueIngredientEnrichment(ingredientId: string): Promise<boolean> {
    try {
        await enqueue(ingredientId);
        return true;
    } catch (error) {
        log.warn('enqueue failed, daily backfill will pick it up', {
            ingredientId,
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
