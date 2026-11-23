// Leftover hints of the plan page (KUC-108): soon-expiring pantry leftovers, each with up
// to three recipes that use it. Candidates and order are the same as in the search sort
// "Verbraucht meine Reste" (KUC-132). Server only.
import 'server-only';

import type { Db } from '@app/lib/meal-plan/db';
import { getLeftoverHints } from '@app/lib/pantry/leftovers';
import { loadRankingRecipes } from '@app/lib/recipes/ranking-features.server';
import { loadTasteEmbedding } from '@app/lib/recipes/taste-ranking.server';
import {
    LEFTOVER_CANDIDATE_POOL,
    searchRecipeIds,
    withPantryIngredients,
} from '@app/lib/recipeSearch';
import { weekdayLong } from '@shared/dates';
import { createLogger } from '@shared/logger';
import { suggestLeftoverRecipes, type LeftoverHint } from '@shared/meal-planning/leftovers';
import type { IsoDate } from '@shared/meal-planning/types';
import { normalize } from '@shared/recipe-ranking/vector';

// ── Leftovers (KUC-108) ─────────────────────────────────────────────────────

const log = createLogger('leftover-notices');

/** Fallback pool when the search is unavailable: the best rated published recipes. */
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

/**
 * Candidates as cards: the best rated published recipes that contain one of the leftover
 * ingredients (same search as the sort "Verbraucht meine Reste"). If the search fails, the
 * best rated recipes overall.
 */
async function loadLeftoverPool(db: Db, ingredientIds: string[]): Promise<Map<string, RecipeCard>> {
    let ids: string[] | null = null;
    try {
        const names = await db.ingredient.findMany({
            where: { id: { in: ingredientIds } },
            select: { name: true },
        });
        ids = await searchRecipeIds(
            withPantryIngredients(
                { term: { status: 'PUBLISHED' } },
                names.map((n) => n.name),
            ),
            LEFTOVER_CANDIDATE_POOL,
        );
    } catch (err) {
        log.warn('Leftover candidate search failed, using the best rated recipes', {
            error: err instanceof Error ? err.message : String(err),
        });
    }
    const top = await db.recipe.findMany({
        where: {
            ...(ids ? { id: { in: ids } } : {}),
            status: 'PUBLISHED',
            moderationStatus: { not: 'REJECTED' },
            totalTime: { gt: 0 },
        },
        select: { id: true, slug: true, title: true, imageKey: true, totalTime: true },
        orderBy: [{ rating: 'desc' }, { ratingCount: 'desc' }],
        take: ids ? undefined : LEFTOVER_POOL,
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
    const cards = await loadLeftoverPool(db, [
        ...new Set(leftovers.map((leftover) => leftover.ingredientId)),
    ]);
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
