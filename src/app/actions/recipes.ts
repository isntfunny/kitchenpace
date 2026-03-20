'use server';

import type { FlowEdgeInput, FlowNodeInput } from '@app/components/recipe/recipeFormTypes';
import { getServerAuthSession } from '@app/lib/auth';
import { cosineSimilarity } from '@app/lib/embeddings/embedding-service';
import { PALETTE } from '@app/lib/palette';
import {
    toRecipeCardData,
    type RecipeCardData,
    type RecipeWithCategory,
} from '@app/lib/recipe-card';
import {
    EMBEDDING_DIMENSIONS,
    opensearchClient,
    OPENSEARCH_EMBEDDINGS_INDEX,
    OPENSEARCH_INDEX,
} from '@shared/opensearch/client';
import { prisma } from '@shared/prisma';

import { fetchTrophyBadge } from './trophies';

// Re-export for backward compatibility
export { toRecipeCardData, type RecipeCardData, type RecipeWithCategory };

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
    categoryColor?: string;
    rating: number;
    prepTime: number;
    cookTime: number;
    totalTime: number;
    calories?: number | null;
    proteinPerServing?: number | null;
    fatPerServing?: number | null;
    carbsPerServing?: number | null;
    nutritionCompleteness?: number | null;
    servings: number;
    difficulty: 'Einfach' | 'Mittel' | 'Schwer';
    ingredients: Array<{
        name: string;
        pluralName?: string | null;
        amount: number;
        rawAmount: string;
        unit: string;
        notes: string | null;
        energyKcal?: number | null;
        protein?: number | null;
        fat?: number | null;
        carbs?: number | null;
        ingredientUnitGrams?: number | null;
        unitGramsDefault?: number | null;
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
        avatar: string | null;
        bio: string | null;
        recipeCount: number;
        followerCount: number;
        trophyTier?: string | null;
    } | null;
    favoriteCount: number;
    ratingCount: number;
    cookCount: number;
    publishedAt?: string | null;
    updatedAt?: string;
    sourceUrl?: string | null;
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
                include: {
                    unit: true,
                    ingredient: {
                        include: {
                            ingredientUnits: {
                                include: { unit: true },
                            },
                        },
                    },
                },
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

    const [favoriteCount, viewerData, stepImages, authorTrophyBadge] = await Promise.all([
        prisma.favorite.count({ where: { recipeId: recipe.id } }),
        viewerPromise,
        prisma.recipeStepImage.findMany({ where: { recipeId: recipe.id } }),
        recipe.authorId ? fetchTrophyBadge(recipe.authorId) : null,
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
        categoryColor: recipe.categories[0]?.category?.color
            ? ((PALETTE[recipe.categories[0].category.color as keyof typeof PALETTE] as string) ??
              undefined)
            : undefined,
        rating: recipe.rating ?? 0,
        prepTime: recipe.prepTime ?? 0,
        cookTime: recipe.cookTime ?? 0,
        totalTime: recipe.totalTime ?? 0,
        calories: recipe.caloriesPerServing ?? null,
        proteinPerServing: recipe.proteinPerServing ?? null,
        fatPerServing: recipe.fatPerServing ?? null,
        carbsPerServing: recipe.carbsPerServing ?? null,
        nutritionCompleteness: recipe.nutritionCompleteness ?? null,
        servings: recipe.servings ?? 4,
        difficulty: difficultyMap[recipe.difficulty] || 'Mittel',
        ingredients: recipe.recipeIngredients.map((ri: any) => {
            const matchedUnit = ri.ingredient.ingredientUnits?.find(
                (iu: any) => iu.unitId === ri.unitId,
            );

            return {
                name: ri.ingredient.name,
                pluralName: ri.ingredient.pluralName ?? null,
                amount: parseFloat(ri.amount) || 0,
                rawAmount: ri.amount,
                unit: ri.unit.shortName,
                notes: ri.notes,
                energyKcal: ri.ingredient.energyKcal ?? null,
                protein: ri.ingredient.protein ?? null,
                fat: ri.ingredient.fat ?? null,
                carbs: ri.ingredient.carbs ?? null,
                ingredientUnitGrams: matchedUnit?.grams ?? null,
                unitGramsDefault: ri.unit.gramsDefault ?? null,
            };
        }),
        flow: {
            nodes: (() => {
                const photoKeyByStepId = new Map(stepImages.map((si) => [si.stepId, si.photoKey]));
                return ((recipe.flowNodes as any[]) || []).map((n: any) => {
                    const photoKey = photoKeyByStepId.get(n.id);
                    return photoKey ? { ...n, photoKey } : n;
                });
            })(),
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
                  avatar: recipe.author.profile?.photoKey ?? null,
                  bio: recipe.author.profile?.bio || null,
                  recipeCount: recipe.author.profile?.recipeCount ?? 0,
                  followerCount: recipe.author.profile?.followerCount ?? 0,
                  trophyTier: authorTrophyBadge?.tier ?? null,
              }
            : null,
        favoriteCount,
        ratingCount: recipe.ratingCount ?? 0,
        cookCount: recipe.cookCount ?? 0,
        imageKey: recipe.imageKey ?? null,
        publishedAt: recipe.publishedAt?.toISOString() ?? null,
        updatedAt: recipe.updatedAt.toISOString(),
        sourceUrl: recipe.sourceUrl ?? null,
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
    pluralName: string | null;
    amount: string;
    unit: string;
    availableUnits: string[];
    notes: string;
    isOptional: boolean;
}

export interface EditRecipeData {
    id: string;
    title: string;
    description: string;
    imageKey?: string;
    servings: number;
    prepTime: number;
    cookTime: number;
    calories?: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    status: 'DRAFT' | 'PUBLISHED';
    categoryIds: string[];
    tagIds: string[];
    ingredients: EditRecipeIngredient[];
    flowNodes: FlowNodeInput[];
    flowEdges: FlowEdgeInput[];
    authorId: string;
}

// ── Similar recipes (OpenSearch k-NN + "more like this" fallback) ────────────

const SIMILAR_MIN_SCORE = 0.7;
const SIMILAR_OVER_REQUEST = 3;

export async function fetchSimilarRecipes(recipeId: string, limit = 8): Promise<RecipeCardData[]> {
    const cap = Math.min(limit, 20);

    // Get current user for personalized reranking (optional — anonymous users get pure similarity)
    let userId: string | undefined;
    try {
        const session = await getServerAuthSession();
        userId = session?.user?.id;
    } catch {
        // Not logged in — proceed without personalization
    }

    try {
        let results: RecipeCardData[] | null = null;
        try {
            results = await similarByEmbedding(recipeId, cap, userId);
        } catch (err) {
            console.warn('[Similar] k-NN failed, falling back to text similarity', {
                recipeId,
                error: err instanceof Error ? err.message : String(err),
            });
        }

        if (results) return results;
        return await similarByText(recipeId, cap);
    } catch (err) {
        console.error('[Similar] Request failed', {
            recipeId,
            error: err instanceof Error ? err.message : String(err),
        });
        return [];
    }
}

type OsHit = { _id: string; _score: number };
type OsHitsResponse = { hits?: { hits?: OsHit[] } };

async function similarByEmbedding(
    recipeId: string,
    limit: number,
    userId?: string,
): Promise<RecipeCardData[] | null> {
    let embedding: number[];
    try {
        const doc = await opensearchClient.get({
            index: OPENSEARCH_EMBEDDINGS_INDEX,
            id: recipeId,
            _source: ['embedding'],
        });
        embedding = (doc.body._source as { embedding: number[] }).embedding;
    } catch {
        return null;
    }

    const k = Math.min(limit * SIMILAR_OVER_REQUEST + 1, 100);
    const response = await opensearchClient.search({
        index: OPENSEARCH_EMBEDDINGS_INDEX,
        body: { size: k, query: { knn: { embedding: { vector: embedding, k } } } },
    });

    let hits = ((response.body as OsHitsResponse).hits?.hits ?? [])
        .filter((h) => h._id !== recipeId && h._score >= SIMILAR_MIN_SCORE)
        .slice(0, limit * SIMILAR_OVER_REQUEST);

    if (hits.length === 0) return [];

    // Light taste-based reranking: recipe similarity dominates (85%), taste nudges order (15%)
    if (userId && hits.length > 1) {
        hits = await rerankByTaste(hits, userId);
    }

    const details = await fetchSimilarDetails(hits.map((h) => ({ id: h._id, score: h._score })));
    return details.slice(0, limit);
}

const TASTE_RECIPE_BLEND = 0.7;
const TASTE_USER_BLEND = 0.3;

async function rerankByTaste(hits: OsHit[], userId: string): Promise<OsHit[]> {
    try {
        const profile = await prisma.profile.findUnique({
            where: { userId },
            select: { tasteEmbedding: true },
        });

        const tasteVec = profile?.tasteEmbedding as number[] | undefined;
        if (!tasteVec || tasteVec.length !== EMBEDDING_DIMENSIONS) return hits;

        // Fetch candidate recipe embeddings from PostgreSQL
        const candidateEmbeddings = await prisma.recipeEmbedding.findMany({
            where: { recipeId: { in: hits.map((h) => h._id) } },
            select: { recipeId: true, embedding: true },
        });
        const embMap = new Map(
            candidateEmbeddings.map((e) => [e.recipeId, e.embedding as number[]]),
        );

        const reranked = hits.map((h) => {
            const candEmb = embMap.get(h._id);
            const tasteSim = candEmb ? cosineSimilarity(tasteVec, candEmb) : 0;
            return { ...h, _score: TASTE_RECIPE_BLEND * h._score + TASTE_USER_BLEND * tasteSim };
        });

        reranked.sort((a, b) => b._score - a._score);
        return reranked;
    } catch (err) {
        console.warn('[Similar] Taste reranking failed, using pure similarity', {
            userId,
            error: err instanceof Error ? err.message : String(err),
        });
        return hits;
    }
}

async function similarByText(recipeId: string, limit: number): Promise<RecipeCardData[]> {
    const response = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: {
            size: limit,
            query: {
                bool: {
                    must: [
                        {
                            more_like_this: {
                                fields: ['title', 'description', 'ingredients', 'tags', 'keywords'],
                                like: [{ _index: OPENSEARCH_INDEX, _id: recipeId }],
                                min_term_freq: 1,
                                max_query_terms: 15,
                                min_doc_freq: 1,
                            },
                        },
                    ],
                    filter: [{ term: { status: 'PUBLISHED' } }],
                    must_not: [{ ids: { values: [recipeId] } }],
                },
            },
        },
    });

    const hits = (response.body as OsHitsResponse).hits?.hits ?? [];
    if (hits.length === 0) return [];
    return fetchSimilarDetails(hits.map((h) => ({ id: h._id, score: h._score })));
}

type SimilarRecipeDoc = {
    id: string;
    slug: string;
    title: string;
    category?: string;
    rating?: number;
    totalTime?: number;
    imageKey?: string;
    description?: string;
    difficulty?: string;
    status?: string;
};

async function fetchSimilarDetails(
    items: Array<{ id: string; score: number }>,
): Promise<RecipeCardData[]> {
    if (items.length === 0) return [];

    const response = await opensearchClient.mget({
        index: OPENSEARCH_INDEX,
        body: { ids: items.map((i) => i.id) },
    });

    type MgetDoc = { _id: string; found: boolean; _source?: SimilarRecipeDoc };
    const docs = (response.body.docs ?? []) as MgetDoc[];
    const scoreMap = new Map(items.map((i) => [i.id, i.score]));

    const difficultyLabel = (d?: string) =>
        d === 'EASY' ? 'Einfach' : d === 'HARD' ? 'Schwer' : d === 'MEDIUM' ? 'Mittel' : undefined;

    return docs
        .filter((d) => d.found && d._source?.status === 'PUBLISHED')
        .map((d) => {
            const src = d._source!;
            const totalTime = Number(src.totalTime ?? 0);
            return {
                id: src.id,
                slug: src.slug,
                title: src.title,
                category: src.category ?? 'Hauptgericht',
                rating: Number(src.rating ?? 0),
                time: totalTime > 0 ? `${totalTime} Min.` : '—',
                image: src.imageKey
                    ? `/api/thumbnail?type=recipe&id=${encodeURIComponent(src.id)}`
                    : null,
                imageKey: src.imageKey ?? null,
                description: src.description ?? '',
                difficulty: difficultyLabel(src.difficulty),
            };
        })
        .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));
}

export async function fetchRecipeForEdit(
    recipeId: string,
    authorId: string,
    isUserAdmin: boolean = false,
): Promise<EditRecipeData | null> {
    const [recipe, stepImages] = await Promise.all([
        prisma.recipe.findFirst({
            where: isUserAdmin ? { id: recipeId } : { id: recipeId, authorId },
            include: {
                categories: true,
                recipeIngredients: {
                    include: {
                        unit: true,
                        ingredient: {
                            include: { ingredientUnits: { include: { unit: true } } },
                        },
                    },
                    orderBy: { position: 'asc' },
                },
                tags: true,
            },
        }),
        prisma.recipeStepImage.findMany({ where: { recipeId } }),
    ]);

    if (!recipe) return null;

    const photoKeyByStepId = new Map(stepImages.map((si) => [si.stepId, si.photoKey]));

    const rawNodes = (recipe.flowNodes as FlowNodeInput[] | null) ?? [];
    const flowNodes = rawNodes.map((n) => {
        const photoKey = photoKeyByStepId.get(n.id);
        return photoKey ? { ...n, photoKey } : n;
    });

    return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description ?? '',
        imageKey: recipe.imageKey ?? undefined,
        servings: recipe.servings,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        calories: recipe.caloriesPerServing ?? undefined,
        difficulty: recipe.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
        status: (recipe.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT') as 'DRAFT' | 'PUBLISHED',
        categoryIds: recipe.categories.map((c) => c.categoryId),
        tagIds: recipe.tags.map((t) => t.tagId),
        ingredients: recipe.recipeIngredients.map((ri: any) => ({
            id: ri.ingredientId,
            name: ri.ingredient.name,
            pluralName: ri.ingredient.pluralName,
            amount: ri.amount,
            unit: ri.unit.shortName,
            availableUnits: ri.ingredient.ingredientUnits?.map((iu: any) => iu.unit.shortName) ?? [
                'g',
            ],
            notes: ri.notes ?? '',
            isOptional: ri.isOptional,
        })),
        flowNodes,
        flowEdges: (recipe.flowEdges as FlowEdgeInput[] | null) ?? [],
        authorId: recipe.authorId,
    };
}
