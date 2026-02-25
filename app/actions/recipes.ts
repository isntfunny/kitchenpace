'use server';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80';
const DEFAULT_AUTHOR_AVATAR =
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80';

export interface RecipeCardData {
    id: string;
    slug: string;
    title: string;
    category: string;
    rating: number;
    time: string;
    image: string;
    imageKey?: string | null;
    description?: string;
}

type RecipeWithCategory = Prisma.RecipeGetPayload<{
    include: { categories: { include: { category: true } } };
}>;

function toRecipeCardData(recipe: RecipeWithCategory): RecipeCardData {
    const totalTime = recipe.totalTime ?? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

    return {
        id: recipe.id,
        slug: recipe.slug,
        title: recipe.title,
        category: recipe.categories[0]?.category?.name || 'Hauptgericht',
        rating: recipe.rating ?? 0,
        time: `${totalTime ?? 0} Min.`,
        image: recipe.imageUrl || DEFAULT_IMAGE,
        description: recipe.description ?? '',
    };
}

export async function fetchNewestRecipes(take = 8): Promise<RecipeCardData[]> {
    const recipes = await prisma.recipe.findMany({
        where: { publishedAt: { not: null } },
        include: { categories: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
        take,
    });

    return recipes.map(toRecipeCardData);
}

export async function fetchTopRatedRecipes(take = 8): Promise<RecipeCardData[]> {
    const recipes = await prisma.recipe.findMany({
        where: { publishedAt: { not: null } },
        include: { categories: { include: { category: true } } },
        orderBy: [{ rating: 'desc' }, { viewCount: 'desc' }],
        take,
    });

    return recipes.map(toRecipeCardData);
}

export async function fetchFeaturedRecipe(): Promise<RecipeCardData | null> {
    const recipe = await prisma.recipe.findFirst({
        where: { publishedAt: { not: null }, rating: { gte: 4 } },
        include: { categories: { include: { category: true } } },
        orderBy: { viewCount: 'desc' },
    });

    if (!recipe) {
        return null;
    }

    return toRecipeCardData(recipe);
}

const timeFilters: Record<string, { lte: number }> = {
    frueh: { lte: 20 },
    mittag: { lte: 30 },
    abend: { lte: 45 },
    brunch: { lte: 30 },
    fingerfood: { lte: 25 },
};

export async function fetchRecipesByTime(mealTime: string, take = 6): Promise<RecipeCardData[]> {
    const filter = timeFilters[mealTime] || { lte: 30 };

    const recipes = await prisma.recipe.findMany({
        where: {
            publishedAt: { not: null },
            totalTime: filter,
        },
        include: { categories: { include: { category: true } } },
        orderBy: { rating: 'desc' },
        take,
    });

    return recipes.map(toRecipeCardData);
}

export interface RecipeDetailData {
    id: string;
    slug: string;
    title: string;
    description: string;
    image: string;
    imageKey?: string | null;
    category: string;
    rating: number;
    prepTime: number;
    cookTime: number;
    totalTime: number;
    servings: number;
    difficulty: 'Einfach' | 'Mittel' | 'Schwer';
    ingredients: Array<{
        name: string;
        amount: number;
        unit: string;
        notes: string | null;
    }>;
    flow: {
        nodes: Array<{
            id: string;
            type: string;
            label: string;
            description?: string;
            duration?: number;
            position: { x: number; y: number };
        }>;
        edges: Array<{
            id: string;
            source: string;
            target: string;
        }>;
    };
    tags: string[];
    authorId: string;
    author: {
        id: string;
        name: string;
        avatar: string;
        bio: string | null;
        recipeCount: number;
        followerCount: number;
    } | null;
    favoriteCount: number;
    ratingCount: number;
    cookCount: number;
    viewer?: {
        id: string;
        isFavorite: boolean;
        rating: number | null;
        isFollowingAuthor: boolean;
        canFollow: boolean;
        isAuthor: boolean;
        hasCooked: boolean;
    };
}

export async function fetchRecipeBySlug(
    slugOrId: string,
    viewerId?: string,
): Promise<RecipeDetailData | null> {
    const recipe = await prisma.recipe.findFirst({
        where: {
            OR: [{ slug: slugOrId }, { id: slugOrId }],
            publishedAt: { not: null },
        },
        include: {
            category: true,
            author: {
                include: { profile: true },
            },
            recipeIngredients: {
                include: { ingredient: true },
                orderBy: { position: 'asc' },
            },
            tags: {
                include: { tag: true },
            },
        },
    });

    if (!recipe) {
        return null;
    }

    const viewerPromise = viewerId
        ? Promise.all([
              prisma.favorite.findUnique({
                  where: {
                      recipeId_userId: { recipeId: recipe.id, userId: viewerId },
                  },
              }),
              prisma.userRating.findUnique({
                  where: {
                      recipeId_userId: { recipeId: recipe.id, userId: viewerId },
                  },
              }),
              recipe.authorId && recipe.authorId !== viewerId
                  ? prisma.follow.findUnique({
                        where: {
                            followerId_followingId: {
                                followerId: viewerId,
                                followingId: recipe.authorId,
                            },
                        },
                    })
                  : Promise.resolve(null),
              viewerId
                  ? prisma.userCookHistory.findFirst({
                        where: { recipeId: recipe.id, userId: viewerId },
                    })
                  : Promise.resolve(null),
          ])
        : null;

    const [favoriteCount, viewerData] = await Promise.all([
        prisma.favorite.count({ where: { recipeId: recipe.id } }),
        viewerPromise,
    ]);

    const [favorite, rating, follow, cookHistory] = viewerData ?? [];

    const difficultyMap: Record<string, 'Einfach' | 'Mittel' | 'Schwer'> = {
        EASY: 'Einfach',
        MEDIUM: 'Mittel',
        HARD: 'Schwer',
    };

    return {
        id: recipe.id,
        slug: recipe.slug,
        title: recipe.title,
        description: recipe.description || '',
        image: recipe.imageUrl || DEFAULT_IMAGE,
        category: recipe.category?.name || 'Hauptgericht',
        rating: recipe.rating ?? 0,
        prepTime: recipe.prepTime ?? 0,
        cookTime: recipe.cookTime ?? 0,
        totalTime: recipe.totalTime ?? 0,
        servings: recipe.servings ?? 4,
        difficulty: difficultyMap[recipe.difficulty] || 'Mittel',
        ingredients: recipe.recipeIngredients.map((ri: any) => ({
            name: ri.ingredient.name,
            amount: parseFloat(ri.amount) || 0,
            unit: ri.unit,
            notes: ri.notes,
        })),
        flow: {
            nodes: (recipe.flowNodes as any[]) || [],
            edges: (recipe.flowEdges as any[]) || [],
        },
        tags: recipe.tags.map((rt: any) => rt.tag.name),
        authorId: recipe.authorId,
        author: recipe.author
            ? {
                  id: recipe.author.id,
                  name: recipe.author.name || 'Unbekannt',
                  avatar: recipe.author.profile?.photoUrl || DEFAULT_AUTHOR_AVATAR,
                  bio: recipe.author.profile?.bio || null,
                  recipeCount: recipe.author.profile?.recipeCount ?? 0,
                  followerCount: recipe.author.profile?.followerCount ?? 0,
              }
            : null,
        favoriteCount,
        ratingCount: recipe.ratingCount ?? 0,
        cookCount: recipe.cookCount ?? 0,
        imageKey: recipe.imageKey ?? null,
        viewer: viewerId
            ? {
                  id: viewerId,
                  isFavorite: Boolean(favorite),
                  rating: rating?.rating ?? null,
                  isFollowingAuthor: Boolean(follow),
                  canFollow: recipe.authorId !== viewerId,
                  isAuthor: recipe.authorId === viewerId,
                  hasCooked: Boolean(cookHistory),
              }
            : undefined,
    };
}
