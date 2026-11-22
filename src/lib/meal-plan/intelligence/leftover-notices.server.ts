// Leftover hints of the plan page (KUC-108): soon-expiring pantry leftovers, each with up
// to three recipes from the best rated ones that use it. Server only.
import 'server-only';

import type { Db } from '@app/lib/meal-plan/db';
import { getLeftoverHints } from '@app/lib/pantry/leftovers';
import { loadRankingRecipes } from '@app/lib/recipes/ranking-features.server';
import { loadTasteEmbedding } from '@app/lib/recipes/taste-ranking.server';
import { weekdayLong } from '@shared/dates';
import { suggestLeftoverRecipes, type LeftoverHint } from '@shared/meal-planning/leftovers';
import type { IsoDate } from '@shared/meal-planning/types';
import { normalize } from '@shared/recipe-ranking/vector';

// ── Leftovers (KUC-108) ─────────────────────────────────────────────────────

/** Pool size: the best rated published recipes are checked against the leftovers. */
export const LEFTOVER_POOL = 250;

export interface RecipeCard {
    id: string;
    slug: string;
    title: string;
    imageKey: string | null;
    totalTime: number;
}

export interface LeftoverNoticeDTO {
    leftoverId: string;
    message: string;
    suggestedDate: IsoDate;
    /** "Donnerstag" */
    dayLabel: string;
    recipes: (RecipeCard & { reasons: string[] })[];
}

/** Best rated published recipes with a cooking time, as cards. */
async function loadLeftoverPool(db: Db): Promise<Map<string, RecipeCard>> {
    const top = await db.recipe.findMany({
        where: {
            status: 'PUBLISHED',
            moderationStatus: { not: 'REJECTED' },
            totalTime: { gt: 0 },
        },
        select: { id: true, slug: true, title: true, imageKey: true, totalTime: true },
        orderBy: [{ rating: 'desc' }, { ratingCount: 'desc' }],
        take: LEFTOVER_POOL,
    });
    return new Map(top.map((r) => [r.id, r]));
}

/**
 * Hints for leftovers that expire soon, each with up to three matching recipes. Recipes come
 * as `RankingRecipe` with amounts; taste is the cosine of the user's taste profile and the
 * stored recipe embedding (no OpenAI).
 */
export async function getLeftoverNotices(
    db: Db,
    userId: string,
    ctx: { today: IsoDate; householdSize: number },
): Promise<LeftoverNoticeDTO[]> {
    const leftovers = await getLeftoverHints(db, userId, ctx.today);
    if (leftovers.length === 0) return [];
    const cards = await loadLeftoverPool(db);
    if (cards.size === 0) return [];
    const [recipes, taste] = await Promise.all([
        loadRankingRecipes([...cards.keys()], db, { amounts: true }),
        loadTasteEmbedding(userId),
    ]);
    const hints: LeftoverHint[] = suggestLeftoverRecipes({
        leftovers,
        recipes: [...recipes.values()],
        profile: taste ? normalize(taste) : null,
        household: ctx.householdSize,
        today: ctx.today,
    });
    return hints.map((hint) => ({
        leftoverId: hint.leftoverId,
        message: hint.message,
        suggestedDate: hint.suggestedDate,
        dayLabel: weekdayLong(hint.suggestedDate),
        recipes: hint.recipes.flatMap((recipe) => {
            const card = cards.get(recipe.recipeId);
            return card ? [{ ...card, reasons: recipe.reasons }] : [];
        }),
    }));
}
