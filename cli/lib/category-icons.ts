import type { PrismaClient } from '@prisma/client';

import { planCategoryIconUpdates } from '@shared/ingredient-icons/category-sync';

/**
 * Stores the fixed icons of the main ingredient categories (KUC-125).
 * Idempotent: only categories without an icon are updated (`icon: null` in the
 * where clause too), so manual changes are kept.
 */
export async function syncCategoryIcons(
    db: PrismaClient,
    options: { apply: boolean },
): Promise<{ planned: number; updated: number }> {
    const rows = await db.ingredientCategory.findMany({
        select: { id: true, slug: true, parentId: true, icon: true },
    });
    const plan = planCategoryIconUpdates(rows);
    let updated = 0;
    if (options.apply) {
        for (const { id, icon } of plan) {
            const { count } = await db.ingredientCategory.updateMany({
                where: { id, icon: null },
                data: { icon },
            });
            updated += count;
        }
    }
    return { planned: plan.length, updated };
}
