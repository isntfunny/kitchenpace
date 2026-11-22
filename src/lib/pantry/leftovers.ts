// Input for the leftover suggestions while planning (KUC-108): the pantry posts that
// qualify as a leftover hint, in the shape `suggestLeftoverRecipes` expects. The recipes
// to match against come from the plan side. Declined hints (`leftoverHintDismissedAt`)
// are left out; `dismissLeftoverHint` in `repository.ts` records a decline.
import { type Db } from '@app/lib/meal-plan/db';
import { userIdSchema } from '@app/lib/meal-plan/schemas';
import { toBerlinDate } from '@shared/dates';
import type { Leftover } from '@shared/meal-planning/leftovers';
import type { BaseUnit, IsoDate } from '@shared/meal-planning/types';

import { isLeftoverHintEligible } from './rules';

const UNIT: Record<'G' | 'ML' | 'PIECE', BaseUnit> = { G: 'g', ML: 'ml', PIECE: 'Stk' };

/**
 * Open-sensitive, opened pantry posts with a known amount, pack size and expiry that have
 * not expired before `today`. Without pack size or shelf life after opening there is no hint
 * and no error. Posts with an uncertain amount ("~") still count: the hint says "ca.".
 */
export async function getLeftoverHints(
    db: Db,
    userId: string,
    today: IsoDate,
): Promise<Leftover[]> {
    const owner = userIdSchema.parse(userId);
    const posts = await db.pantryItem.findMany({
        where: { userId: owner, status: 'AVAILABLE', openedAt: { not: null } },
        select: {
            id: true,
            ingredientId: true,
            name: true,
            quantity: true,
            baseUnit: true,
            openedAt: true,
            expiresAt: true,
            status: true,
            leftoverHintDismissedAt: true,
        },
    });
    const ingredientIds = [
        ...new Set(posts.flatMap((p) => (p.ingredientId ? [p.ingredientId] : []))),
    ];
    if (ingredientIds.length === 0) return [];
    const ingredients = await db.ingredient.findMany({
        where: { id: { in: ingredientIds } },
        select: {
            id: true,
            name: true,
            normalizedName: true,
            openSensitive: true,
            openedShelfLifeDays: true,
            packSize: true,
        },
    });
    const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

    const leftovers: Leftover[] = [];
    for (const post of posts) {
        const ingredient = post.ingredientId ? byId.get(post.ingredientId) : undefined;
        if (!post.ingredientId || !ingredient || !post.expiresAt || !post.baseUnit) continue;
        if (!isLeftoverHintEligible({ ...post, ingredient })) continue;
        const expiresOn = toBerlinDate(post.expiresAt);
        if (expiresOn < today) continue;
        leftovers.push({
            id: post.id,
            ingredientId: post.ingredientId,
            name: ingredient.normalizedName?.trim() || ingredient.name,
            amountBase: post.quantity ?? undefined,
            unitBase: UNIT[post.baseUnit],
            expiresOn,
        });
    }
    return leftovers.sort(
        (a, b) => (a.expiresOn ?? '').localeCompare(b.expiresOn ?? '') || a.id.localeCompare(b.id),
    );
}
