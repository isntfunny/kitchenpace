import type { Prisma } from '@prisma/client';

import { toRecipeCardData, type RecipeCardData } from '@app/lib/recipe-card';
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

export async function fetchIngredientLanding(slug: string): Promise<KeywordLandingData | null> {
    const ingredient = await prisma.ingredient.findUnique({
        where: { slug },
        select: { name: true, slug: true },
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
        name: ingredient.name,
        slug: ingredient.slug,
        totalCount,
        recipes: recipes.map(toRecipeCardData),
    };
}

/** Slugs for the sitemap — only keywords that resolve to at least one published recipe */
export async function fetchTagSlugsWithRecipes(): Promise<string[]> {
    const tags = await prisma.tag.findMany({
        where: { recipes: { some: { recipe: PUBLISHED_RECIPE_FILTER } } },
        select: { slug: true },
    });
    return tags.map((t) => t.slug);
}

export async function fetchIngredientSlugsWithRecipes(): Promise<string[]> {
    const ingredients = await prisma.ingredient.findMany({
        where: { recipes: { some: { recipe: PUBLISHED_RECIPE_FILTER } } },
        select: { slug: true },
    });
    return ingredients.map((i) => i.slug);
}
