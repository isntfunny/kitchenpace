import { logger, schedules, task } from '@trigger.dev/sdk';

import { opensearchClient, OPENSEARCH_INDEX } from '@/lib/opensearch/client';
import { prisma } from '@/lib/prisma';

export const syncOpenSearchScheduled = schedules.task({
    id: 'opensearch-sync-scheduled',
    cron: '*/15 * * * *',
    maxDuration: 300,
    run: async (_, { ctx }) => {
        logger.info('🔄 Starting scheduled opensearch sync', {
            runId: ctx.run.id,
            cron: '*/15 * * * *',
        });

        try {
            logger.debug('Fetching published recipes from database');
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

            logger.info('📊 Fetched recipes from database', {
                count: recipes.length,
                runId: ctx.run.id,
            });

            if (recipes.length === 0) {
                logger.warn('⚠️ No recipes to sync - empty result set');
                return { synced: 0 };
            }

            const operations = buildBulkOperations(recipes);
            await runBulkOperations({ operations, runId: ctx.run.id });

            logger.info('✅ Synced recipes to opensearch', {
                count: recipes.length,
                index: OPENSEARCH_INDEX,
                runId: ctx.run.id,
            });

            return { synced: recipes.length };
        } catch (error) {
            logger.error('❌ Opensearch sync failed', {
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                runId: ctx.run.id,
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

        logger.info('🔄 Starting opensearch sync', {
            batchSize,
            runId: ctx.run.id,
        });

        try {
            logger.debug('Fetching published recipes from database', { batchSize });
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

            logger.info('📊 Fetched recipes from database', {
                count: recipes.length,
                runId: ctx.run.id,
            });

            if (recipes.length === 0) {
                logger.warn('⚠️ No recipes to sync - empty result set');
                return { synced: 0 };
            }

            const operations = buildBulkOperations(recipes);
            await runBulkOperations({ operations, runId: ctx.run.id });

            logger.info('✅ Synced recipes to opensearch', {
                count: recipes.length,
                index: OPENSEARCH_INDEX,
                runId: ctx.run.id,
            });

            return { synced: recipes.length };
        } catch (error) {
            logger.error('❌ Opensearch sync failed', {
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                runId: ctx.run.id,
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
            logger.error('❌ recipeId is required', { payload });
            return { success: false, reason: 'missing_recipeId' };
        }

        logger.info('🔄 Syncing single recipe to opensearch', {
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
                logger.warn('⚠️ Recipe not found', {
                    recipeId: payload.recipeId,
                    runId: ctx.run.id,
                });
                return { success: false, reason: 'not_found' };
            }

            logger.debug('Recipe fetched', {
                recipeId: payload.recipeId,
                status: recipe.status,
                publishedAt: recipe.publishedAt,
            });

            if (recipe.status !== 'PUBLISHED' || !recipe.publishedAt) {
                logger.info('🗑️ Removing unpublished recipe from opensearch', {
                    recipeId: payload.recipeId,
                    status: recipe.status,
                    publishedAt: recipe.publishedAt,
                });
                await opensearchClient.delete({
                    index: OPENSEARCH_INDEX,
                    id: recipe.id,
                    refresh: 'wait_for',
                });
                return { success: true, action: 'deleted' };
            }

            const doc = transformToDocument(recipe);
            logger.debug('Indexing recipe to opensearch', {
                recipeId: payload.recipeId,
                index: OPENSEARCH_INDEX,
            });

            await opensearchClient.index({
                index: OPENSEARCH_INDEX,
                id: recipe.id,
                body: doc,
                refresh: 'wait_for',
            });

            logger.info('✅ Synced recipe to opensearch', {
                recipeId: payload.recipeId,
                title: recipe.title,
                runId: ctx.run.id,
            });

            return { success: true, action: 'indexed' };
        } catch (error) {
            logger.error('❌ Failed to sync recipe to opensearch', {
                recipeId: payload.recipeId,
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                runId: ctx.run.id,
            });
            throw error;
        }
    },
});

const BULK_CHUNK_SIZE = 2000;

type BulkOperation = Record<string, unknown>;

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
    const tags = normalizeStringArray(recipe.tags.map((entry) => entry.tag?.name));
    const ingredients = normalizeStringArray(
        recipe.recipeIngredients.map((entry) => entry.ingredient?.name),
    );

    const category = recipe.categories[0]?.category;

    const keywords = Array.from(
        new Set(
            [
                recipe.title,
                recipe.description,
                category?.name,
                category?.slug,
                ...tags,
                ...ingredients,
            ]
                .filter((value): value is string => Boolean(value))
                .map((value) => value.toLowerCase()),
        ),
    );

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

function normalizeStringArray(values: Array<string | undefined | null>) {
    return Array.from(
        new Set(
            values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)),
        ),
    );
}

function buildBulkOperations(recipes: RecipeWithRelations[]): BulkOperation[] {
    const operations: BulkOperation[] = [];
    for (const recipe of recipes) {
        operations.push({ index: { _index: OPENSEARCH_INDEX, _id: recipe.id } });
        operations.push(transformToDocument(recipe));
    }
    return operations;
}

async function runBulkOperations({
    operations,
    runId,
}: {
    operations: BulkOperation[];
    runId: string;
}) {
    for (let i = 0; i < operations.length; i += BULK_CHUNK_SIZE) {
        const chunk = operations.slice(i, i + BULK_CHUNK_SIZE);
        logger.debug('Sending bulk chunk to opensearch', {
            chunkSize: chunk.length,
            chunkIndex: Math.floor(i / BULK_CHUNK_SIZE) + 1,
            runId,
        });

        const response = await opensearchClient.bulk({
            refresh: 'wait_for',
            body: chunk,
        });

        const body = response.body as { errors?: boolean; items?: Array<Record<string, any>> };
        if (body.errors) {
            const errors = (body.items ?? [])
                .map((item) => {
                    const entry = item.index ?? item.update ?? item.delete;
                    return entry?.error?.reason ?? entry?.error?.type;
                })
                .filter(Boolean);
            if (errors.length > 0) {
                throw new Error(`OpenSearch bulk chunk failed: ${errors.join('; ')}`);
            }
        }
    }
}
