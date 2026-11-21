// Glue between the recipe page "Gekocht" (src/app/actions/social.ts) and the plan
// (KUC-103): links the cook to a planned entry and books it into the pantry.
// Never throws; the cook itself is already saved.
import { bookCookedEntry } from '@app/lib/pantry/book';
import { prisma } from '@shared/prisma';

import { linkCookToPlan } from './cook';
import { getMealPlanSettings } from './repository';
import { todayIn } from './week';

export async function linkCookToMealPlan(
    userId: string,
    recipeId: string,
    cookHistoryId: string,
    cookedAt: Date,
): Promise<void> {
    try {
        const settings = await getMealPlanSettings(prisma, userId);
        const entryId = await linkCookToPlan(prisma, userId, {
            cookHistoryId,
            recipeId,
            cookedAt,
            today: todayIn(settings.timezone, cookedAt),
        });
        if (entryId) await bookCookedEntry(prisma, userId, entryId, cookedAt);
    } catch (error) {
        console.error('[meal-plan] linking a cook to the plan failed', error);
    }
}
