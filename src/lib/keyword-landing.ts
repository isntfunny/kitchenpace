import type { Prisma } from '@prisma/client';

import { toRecipeCardData, type RecipeCardData } from '@app/lib/recipe-card';
import { describeShelfLife, type ShelfLifeSummary } from '@shared/ingredient-shelf-life/describe';
import { prisma } from '@shared/prisma';

/** Max recipes rendered on a keyword landing page */
export const KEYWORD_LANDING_LIMIT = 24;

export type KeywordLandingData = {
    name: string;
    slug: string;
    totalCount: number;
    recipes: RecipeCardData[];
};

const PUBLISHED_RECIPE_FILTER: Prisma.RecipeWhereInput = {
    status: 'PUBLISHED',
    publishedAt: { not: null },
    moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
};

const RECIPE_CARD_INCLUDE = {
    categories: { include: { category: true } },
} satisfies Prisma.RecipeInclude;

const RECIPE_ORDER: Prisma.RecipeOrderByWithRelationInput[] = [
    { rating: 'desc' },
    { publishedAt: 'desc' },
];

export async function fetchTagLanding(slug: string): Promise<KeywordLandingData | null> {
    const tag = await prisma.tag.findUnique({
        where: { slug },
        select: { name: true, slug: true },
    });
    if (!tag) return null;

    const where: Prisma.RecipeWhereInput = {
        ...PUBLISHED_RECIPE_FILTER,
        tags: { some: { tag: { slug } } },
    };

    const [totalCount, recipes] = await Promise.all([
        prisma.recipe.count({ where }),
        prisma.recipe.findMany({
            where,
            include: RECIPE_CARD_INCLUDE,
            orderBy: RECIPE_ORDER,
            take: KEYWORD_LANDING_LIMIT,
        }),
    ]);

    if (totalCount === 0) return null;

    return {
        name: tag.name,
        slug: tag.slug,
        totalCount,
        recipes: recipes.map(toRecipeCardData),
    };
}

export async function fetchIngredientLanding(
    slug: string,
): Promise<(KeywordLandingData & { id: string; shelfLife: ShelfLifeSummary | null }) | null> {
    const ingredient = await prisma.ingredient.findUnique({
        where: { slug },
        select: {
            id: true,
            name: true,
            slug: true,
            shelfLifeSource: true,
            defaultStorage: true,
            openedShelfLifeDays: true,
            storageLives: { select: { storage: true, days: true } },
        },
    });
    if (!ingredient) return null;

    const where: Prisma.RecipeWhereInput = {
        ...PUBLISHED_RECIPE_FILTER,
        recipeIngredients: { some: { ingredient: { slug } } },
    };

    const [totalCount, recipes] = await Promise.all([
        prisma.recipe.count({ where }),
        prisma.recipe.findMany({
            where,
            include: RECIPE_CARD_INCLUDE,
            orderBy: RECIPE_ORDER,
            take: KEYWORD_LANDING_LIMIT,
        }),
    ]);

    if (totalCount === 0) return null;

    return {
        id: ingredient.id,
        name: ingredient.name,
        slug: ingredient.slug,
        totalCount,
        recipes: recipes.map(toRecipeCardData),
        shelfLife: describeShelfLife(ingredient),
    };
}

/**
 * Landing pages with fewer published recipes are thin lists: they stay reachable
 * but are noindex and left out of the sitemap, so Google spends its small crawl
 * budget on recipes instead (KUC-142).
 */
export const MIN_INDEXABLE_LANDING_RECIPES = 5;

export function isIndexableLanding(totalCount: number): boolean {
    return totalCount >= MIN_INDEXABLE_LANDING_RECIPES;
}

/** Slugs whose distinct published recipe count reaches the index threshold. */
function indexableSlugs(rows: { recipeId: string; slug: string }[]): string[] {
    const recipesBySlug = new Map<string, Set<string>>();
    for (const { recipeId, slug } of rows) {
        const ids = recipesBySlug.get(slug) ?? new Set<string>();
        ids.add(recipeId);
        recipesBySlug.set(slug, ids);
    }
    return [...recipesBySlug]
        .filter(([, ids]) => isIndexableLanding(ids.size))
        .map(([slug]) => slug);
}

/** Slugs for the sitemap — only tags whose landing page is indexable */
export async function fetchTagSlugsWithRecipes(): Promise<string[]> {
    const rows = await prisma.recipeTag.findMany({
        where: { recipe: PUBLISHED_RECIPE_FILTER },
        select: { recipeId: true, tag: { select: { slug: true } } },
    });
    return indexableSlugs(rows.map((r) => ({ recipeId: r.recipeId, slug: r.tag.slug })));
}

/** Slugs for the sitemap — only ingredients whose landing page is indexable */
export async function fetchIngredientSlugsWithRecipes(): Promise<string[]> {
    const rows = await prisma.recipeIngredient.findMany({
        where: { recipe: PUBLISHED_RECIPE_FILTER },
        select: { recipeId: true, ingredient: { select: { slug: true } } },
    });
    return indexableSlugs(rows.map((r) => ({ recipeId: r.recipeId, slug: r.ingredient.slug })));
}
