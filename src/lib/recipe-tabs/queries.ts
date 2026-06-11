import { prisma } from '@shared/prisma';

import { MAX_PINNED, MAX_RECENT, type RecipeTabItem, type RecipeTabsData } from './types';

const RECIPE_SELECT = {
    id: true,
    title: true,
    slug: true,
    imageKey: true,
    prepTime: true,
    cookTime: true,
    difficulty: true,
} as const;

type RecipeRow = {
    id: string;
    title: string;
    slug: string | null;
    imageKey: string | null;
    prepTime: number | null;
    cookTime: number | null;
    difficulty: string | null;
};

function toTabItem(recipe: RecipeRow): RecipeTabItem {
    return {
        id: recipe.id,
        title: recipe.title,
        slug: recipe.slug ?? undefined,
        imageKey: recipe.imageKey,
        prepTime: recipe.prepTime ?? undefined,
        cookTime: recipe.cookTime ?? undefined,
        difficulty: recipe.difficulty ?? undefined,
    };
}

/**
 * Pinned recipes come from PinnedFavorite (ordered by slot position),
 * recent ones from UserViewHistory. Pinned recipes are excluded from
 * the recent list so each recipe appears at most once in the header.
 */
export async function fetchRecipeTabs(userId: string): Promise<RecipeTabsData> {
    const [pins, views] = await Promise.all([
        prisma.pinnedFavorite.findMany({
            where: { userId },
            include: { recipe: { select: RECIPE_SELECT } },
            orderBy: { position: 'asc' },
        }),
        prisma.userViewHistory.findMany({
            where: { userId },
            include: { recipe: { select: RECIPE_SELECT } },
            orderBy: { viewedAt: 'desc' },
            take: MAX_RECENT + MAX_PINNED,
        }),
    ]);

    const pinned = pins.map((pin) => toTabItem(pin.recipe));
    const pinnedIds = new Set(pinned.map((item) => item.id));

    const recent = views
        .filter((view) => !pinnedIds.has(view.recipe.id))
        .slice(0, MAX_RECENT)
        .map((view) => toTabItem(view.recipe));

    return { pinned, recent };
}
