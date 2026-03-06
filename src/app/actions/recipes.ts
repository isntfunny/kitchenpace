'use server';

import type { Prisma } from '@prisma/client';

import type { FlowEdgeInput, FlowNodeInput } from '@app/components/recipe/createActions';
import { prisma } from '@shared/prisma';

const DEFAULT_AUTHOR_AVATAR =
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80';

export interface RecipeCardData {
    id: string;
    slug: string;
    title: string;
    category: string;
    categorySlug?: string;
    rating: number;
    time: string;
    image: string | null;
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
        categorySlug: recipe.categories[0]?.category?.slug ?? undefined,
        rating: recipe.rating ?? 0,
        time: `${totalTime ?? 0} Min.`,
        image: recipe.imageKey
            ? `/api/thumbnail?type=recipe&id=${encodeURIComponent(recipe.id)}`
            : null,
        imageKey: recipe.imageKey ?? null,
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
    const featuredSetting = await prisma.siteSettings.findUnique({
        where: { key: 'featuredRecipe' },
    });

    if (featuredSetting?.value) {
        const recipeId = (featuredSetting.value as { recipeId: string }).recipeId;
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            include: { categories: { include: { category: true } } },
        });

        if (recipe && recipe.publishedAt) {
            return toRecipeCardData(recipe);
        }
    }

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
    image: string | null;
    imageKey?: string | null;
    category: string;
    categorySlug?: string;
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
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    authorId: string;
    author: {
        id: string;
        slug: string;
        name: string;
        avatar: string;
        bio: string | null;
        recipeCount: number;
        followerCount: number;
    } | null;
    favoriteCount: number;
    ratingCount: number;
    cookCount: number;
    moderationStatus?: string;
    moderationNote?: string | null;
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
    includeUnpublished?: boolean,
): Promise<RecipeDetailData | null> {
    const recipe = await prisma.recipe.findFirst({
        where: {
            OR: [{ slug: slugOrId }, { id: slugOrId }],
            ...(includeUnpublished ? {} : { publishedAt: { not: null } }),
        },
        include: {
            categories: { include: { category: true }, orderBy: { position: 'asc' } },
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
        image: `/api/thumbnail?type=recipe&id=${encodeURIComponent(recipe.id)}`,
        category: recipe.categories[0]?.category?.name || 'Hauptgericht',
        categorySlug: recipe.categories[0]?.category?.slug ?? undefined,
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
        status: recipe.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
        authorId: recipe.authorId,
        author: recipe.author
            ? {
                  id: recipe.author.id,
                  slug: recipe.author.profile?.slug ?? recipe.author.id,
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
        moderationStatus: recipe.moderationStatus ?? undefined,
        moderationNote: recipe.moderationNote ?? undefined,
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

export interface EditRecipeIngredient {
    id: string;
    name: string;
    amount: string;
    unit: string;
    notes: string;
    isOptional: boolean;
}

export interface EditRecipeData {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    servings: number;
    prepTime: number;
    cookTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    status: 'DRAFT' | 'PUBLISHED';
    categoryIds: string[];
    tagIds: string[];
    ingredients: EditRecipeIngredient[];
    flowNodes: FlowNodeInput[];
    flowEdges: FlowEdgeInput[];
    authorId: string;
}

export async function fetchRecipeForEdit(
    recipeId: string,
    authorId: string,
    isUserAdmin: boolean = false,
): Promise<EditRecipeData | null> {
    const recipe = await prisma.recipe.findFirst({
        where: isUserAdmin ? { id: recipeId } : { id: recipeId, authorId },
        include: {
            categories: true,
            recipeIngredients: {
                include: { ingredient: true },
                orderBy: { position: 'asc' },
            },
            tags: true,
        },
    });

    if (!recipe) return null;

    return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description ?? '',
        imageUrl: recipe.imageKey ?? undefined,
        servings: recipe.servings,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
        status: (recipe.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT') as 'DRAFT' | 'PUBLISHED',
        categoryIds: recipe.categories.map((c) => c.categoryId),
        tagIds: recipe.tags.map((t) => t.tagId),
        ingredients: recipe.recipeIngredients.map((ri) => ({
            id: ri.ingredientId,
            name: ri.ingredient.name,
            amount: ri.amount,
            unit: ri.unit,
            notes: ri.notes ?? '',
            isOptional: ri.isOptional,
        })),
        flowNodes: (recipe.flowNodes as FlowNodeInput[] | null) ?? [],
        flowEdges: (recipe.flowEdges as FlowEdgeInput[] | null) ?? [],
        authorId: recipe.authorId,
    };
}
