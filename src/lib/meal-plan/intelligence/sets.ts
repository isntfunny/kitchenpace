import { getTimeSeasonFilterSets } from '@app/lib/fits-now/db-queries';

import type { TimeSeasonSet } from './mappers';

/** TIME_SEASON filter sets (cached) in the shape `seasonsAndSlots` needs. */
export async function loadTimeSeasonSets(): Promise<TimeSeasonSet[]> {
    try {
        const sets = await getTimeSeasonFilterSets();
        return sets.map((set) => ({
            timeSlot: set.timeSlot,
            season: set.season,
            tagIds: set.tags.map((entry) => entry.tagId),
            categoryIds: set.categories.map((entry) => entry.categoryId),
        }));
    } catch (error) {
        // Without the sets recipes are simply not restricted by season or meal type
        console.error('[plan] time/season sets unavailable', error);
        return [];
    }
}
