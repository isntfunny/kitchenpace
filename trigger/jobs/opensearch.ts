import { logger, schedules, task } from '@trigger.dev/sdk';

import { opensearchClient, OPENSEARCH_INDEX } from '@/lib/opensearch/client';
import { prisma } from '@/lib/prisma';

export const syncOpenSearchScheduled = schedules.task({
    id: 'opensearch-sync-scheduled',
    cron: '*/15 * * * *',
    maxDuration: 300,
    run: async (payload, { ctx }) => {
        logger.log('Starting scheduled opensearch sync', { runId: ctx.run.id });

        try {
            const recipes = await prisma.recipe.findMany({
                where: { status: 'PUBLISHED' },
                include: {
                    categories: { include: { category: true } },
                    tags: { include: { tag: true } },
                    recipeIngredients: { include: { ingredient: true } },
                },
                orderBy: { updatedAt: 'desc' },
                take: 150,
            });

            if (recipes.length === 0) {
                logger.log('No recipes to sync');
                return { synced: 0 };
            }

            const operations: Record<string, unknown>[] = [];

            for (const recipe of recipes) {
                const doc = transformToDocument(recipe);
                operations.push({ index: { _index: OPENSEARCH_INDEX, _id: recipe.id } });
                operations.push(doc);
            }

            await opensearchClient.bulk({
                refresh: 'wait_for',
                body: operations,
            });

            logger.log('Synced recipes to opensearch', { count: recipes.length });

            return { synced: recipes.length };
        } catch (error) {
            logger.error('Opensearch sync failed', {
                error: error instanceof Error ? error.message : error,
            });
            throw error;
        }
    },
});

export const syncOpenSearch = task({
    id: 'opensearch-sync',
    maxDuration: 300,
    run: async (payload: { batchSize?: number }, { ctx }) => {
        const batchSize = payload.batchSize ?? 150;

        logger.log('Starting opensearch sync', { batchSize, runId: ctx.run.id });

        try {
            const recipes = await prisma.recipe.findMany({
                where: { status: 'PUBLISHED' },
                include: {
                    categories: { include: { category: true } },
                    tags: { include: { tag: true } },
                    recipeIngredients: { include: { ingredient: true } },
                },
                orderBy: { updatedAt: 'desc' },
                take: batchSize,
            });

            if (recipes.length === 0) {
                logger.log('No recipes to sync');
                return { synced: 0 };
            }

            const operations: Record<string, unknown>[] = [];

            for (const recipe of recipes) {
                const doc = transformToDocument(recipe);
                operations.push({ index: { _index: OPENSEARCH_INDEX, _id: recipe.id } });
                operations.push(doc);
            }

            await opensearchClient.bulk({
                refresh: 'wait_for',
                body: operations,
            });

            logger.log('Synced recipes to opensearch', { count: recipes.length });

            return { synced: recipes.length };
        } catch (error) {
            logger.error('Opensearch sync failed', {
                error: error instanceof Error ? error.message : error,
            });
            throw error;
        }
    },
});

export const syncRecipeToOpenSearch = task({
    id: 'sync-recipe-to-opensearch',
    maxDuration: 60,
    run: async (payload: { recipeId: string }, { ctx }) => {
        if (!payload.recipeId) {
            logger.error('recipeId is required', { payload });
            return { success: false, reason: 'missing_recipeId' };
        }

        logger.log('Syncing single recipe to opensearch', {
            recipeId: payload.recipeId,
            runId: ctx.run.id,
        });

        try {
            const recipe = await prisma.recipe.findUnique({
                where: { id: payload.recipeId },
                include: {
                    categories: { include: { category: true } },
                    tags: { include: { tag: true } },
                    recipeIngredients: { include: { ingredient: true } },
                },
            });

            if (!recipe) {
                logger.warn('Recipe not found', { recipeId: payload.recipeId });
                return { success: false, reason: 'not_found' };
            }

            if (recipe.status !== 'PUBLISHED' || !recipe.publishedAt) {
                await opensearchClient.delete({
                    index: OPENSEARCH_INDEX,
                    id: recipe.id,
                    refresh: 'wait_for',
                });
                logger.log('Removed recipe from opensearch', { recipeId: payload.recipeId });
                return { success: true, action: 'deleted' };
            }

            await opensearchClient.index({
                index: OPENSEARCH_INDEX,
                id: recipe.id,
                body: transformToDocument(recipe),
                refresh: 'wait_for',
            });

            logger.log('Synced recipe to opensearch', { recipeId: payload.recipeId });

            return { success: true, action: 'indexed' };
        } catch (error) {
            logger.error('Failed to sync recipe to opensearch', {
                recipeId: payload.recipeId,
                error: error instanceof Error ? error.message : error,
            });
            throw error;
        }
    },
});

type RecipeWithRelations = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    difficulty: string;
    status: string;
    totalTime: number | null;
    prepTime: number | null;
    cookTime: number | null;
    rating: number | null;
    cookCount: number | null;
    imageUrl: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
    tags: Array<{ tag: { name: string } | null }>;
    recipeIngredients: Array<{ ingredient: { name: string } | null }>;
    categories: Array<{ category: { name: string; slug: string } | null }>;
};

type RecipeDocument = {
    id: string;
    slug: string;
    title: string;
    description: string;
    category?: string;
    categorySlug?: string;
    tags: string[];
    ingredients: string[];
    difficulty: string;
    totalTime: number;
    prepTime: number;
    cookTime: number;
    rating: number;
    cookCount: number;
    imageUrl?: string;
    publishedAt?: string;
    status: string;
    keywords: string[];
};

function transformToDocument(recipe: RecipeWithRelations): RecipeDocument {
    const tags = recipe.tags
        .map((entry) => entry.tag?.name)
        .filter((name): name is string => Boolean(name));

    const ingredients = recipe.recipeIngredients
        .map((entry) => entry.ingredient?.name)
        .filter((name): name is string => Boolean(name));

    const category = recipe.categories[0]?.category;

    const keywords = [
        recipe.title,
        recipe.description,
        category?.name,
        category?.slug,
        ...tags,
        ...ingredients,
    ]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());

    return {
        id: recipe.id,
        slug: recipe.slug,
        title: recipe.title,
        description: recipe.description ?? '',
        category: category?.name ?? undefined,
        categorySlug: category?.slug ?? undefined,
        tags,
        ingredients,
        difficulty: recipe.difficulty,
        totalTime: recipe.totalTime ?? 0,
        prepTime: recipe.prepTime ?? 0,
        cookTime: recipe.cookTime ?? 0,
        rating: recipe.rating ?? 0,
        cookCount: recipe.cookCount ?? 0,
        imageUrl: recipe.imageUrl ?? undefined,
        publishedAt: recipe.publishedAt?.toISOString(),
        status: recipe.status,
        keywords,
    };
}
