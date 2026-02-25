// We avoid importing generated enum types here to keep this script lightweight.

import { createLogger } from '@/lib/logger';
import { opensearchClient, OPENSEARCH_INDEX } from '@/lib/opensearch/client';
import { prisma } from '@/lib/prisma';

const log = createLogger('opensearch-sync');
const BATCH_SIZE = Number(process.env.OPENSEARCH_BATCH_SIZE ?? 150);
const POLL_INTERVAL = Number(process.env.OPENSEARCH_SYNC_INTERVAL ?? 20_000);
const runOnce = process.argv.includes('--once');
let running = true;

process.on('SIGINT', () => {
    running = false;
    log.info('received SIGINT, stopping sync');
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
    category: { name: string; slug: string } | null;
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureIndex = async () => {
    const { body: exists } = await opensearchClient.indices.exists({ index: OPENSEARCH_INDEX });
    if (exists) {
        return;
    }

    await opensearchClient.indices.create({
        index: OPENSEARCH_INDEX,
        body: {
            mappings: {
                dynamic: 'strict',
                properties: {
                    id: { type: 'keyword' },
                    slug: { type: 'keyword' },
                    title: { type: 'text', analyzer: 'standard' },
                    description: { type: 'text', analyzer: 'standard' },
                    category: { type: 'keyword' },
                    categorySlug: { type: 'keyword' },
                    tags: { type: 'keyword' },
                    ingredients: { type: 'keyword' },
                    difficulty: { type: 'keyword' },
                    status: { type: 'keyword' },
                    totalTime: { type: 'integer' },
                    prepTime: { type: 'integer' },
                    cookTime: { type: 'integer' },
                    rating: { type: 'float' },
                    cookCount: { type: 'integer' },
                    publishedAt: { type: 'date' },
                    imageUrl: { type: 'keyword' },
                    keywords: { type: 'text', analyzer: 'standard' },
                },
            },
        },
    });

    log.info('created opensearch index', { index: OPENSEARCH_INDEX });
};

const toDocument = (recipe: RecipeWithRelations): RecipeDocument => {
    const tags = recipe.tags
        .map((entry) => entry.tag?.name)
        .filter((name): name is string => Boolean(name));

    const ingredients = recipe.recipeIngredients
        .map((entry) => entry.ingredient?.name)
        .filter((name): name is string => Boolean(name));

    const keywords = [
        recipe.title,
        recipe.description,
        recipe.category?.name,
        recipe.category?.slug,
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
        category: recipe.category?.name ?? undefined,
        categorySlug: recipe.category?.slug ?? undefined,
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
};

const logBulkErrors = (
    items: Array<{
        index?: { _id?: string; error?: unknown };
        delete?: { _id?: string; error?: unknown };
    }>,
) => {
    const errors = items
        .map((entry) => entry.index ?? entry.delete)
        .filter((item): item is { _id?: string; error: unknown } => Boolean(item?.error))
        .map((item) => ({ id: item._id, error: item.error }));

    if (errors.length > 0) {
        log.warn('opensearch bulk contained errors', { errors });
    }
};

const syncBatch = async (recipes: RecipeWithRelations[]) => {
    if (recipes.length === 0) return;
    const operations: Record<string, unknown>[] = [];

    for (const recipe of recipes) {
        const shouldIndex = recipe.status === 'PUBLISHED' && recipe.publishedAt;

        if (shouldIndex) {
            operations.push({ index: { _index: OPENSEARCH_INDEX, _id: recipe.id } });
            operations.push(toDocument(recipe));
            continue;
        }

        operations.push({ delete: { _index: OPENSEARCH_INDEX, _id: recipe.id } });
    }

    if (operations.length === 0) return;

    const response = await opensearchClient.bulk({
        refresh: 'wait_for',
        body: operations,
    });

    const bulkResponse = response.body as
        | {
              items?: Array<{
                  index?: { _id?: string; error?: unknown };
                  delete?: { _id?: string; error?: unknown };
              }>;
          }
        | undefined;
    logBulkErrors(bulkResponse?.items ?? []);
    log.info('synced batch to opensearch', { count: recipes.length });
};

const fetchNextBatch = async (cursor: {
    updatedAt: Date;
    id: string;
}): Promise<RecipeWithRelations[]> => {
    const conditions: Array<Record<string, unknown>> = [{ updatedAt: { gt: cursor.updatedAt } }];

    if (cursor.id) {
        conditions.push({ updatedAt: cursor.updatedAt, id: { gt: cursor.id } });
    }

    return prisma.recipe.findMany({
        where: { OR: conditions },
        include: {
            category: true,
            tags: { include: { tag: true } },
            recipeIngredients: { include: { ingredient: true } },
        },
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        take: Math.max(1, isNaN(BATCH_SIZE) ? 150 : BATCH_SIZE),
    });
};

const runSync = async () => {
    await ensureIndex();
    const limit = Math.max(1, isNaN(BATCH_SIZE) ? 150 : BATCH_SIZE);
    const wait = Math.max(5_000, isNaN(POLL_INTERVAL) ? 20_000 : POLL_INTERVAL);
    let cursor = { updatedAt: new Date(0), id: '' };

    while (running) {
        try {
            const batch = await fetchNextBatch(cursor);
            if (batch.length === 0) {
                if (runOnce) {
                    log.info('no updates left, exiting sync loop');
                    break;
                }
                await sleep(wait);
                continue;
            }

            await syncBatch(batch);
            const lastRecipe = batch[batch.length - 1];
            cursor = { updatedAt: lastRecipe.updatedAt, id: lastRecipe.id };
            if (batch.length < limit) {
                if (runOnce) {
                    log.info('completed ingestion in once mode');
                    break;
                }
                await sleep(wait);
            }
        } catch (error) {
            log.error('opensearch sync failed', {
                error: error instanceof Error ? error.message : error,
            });
            if (runOnce) {
                throw error;
            }
            await sleep(wait);
        }
    }
};

const main = async () => {
    log.info('starting opensearch sync', {
        index: OPENSEARCH_INDEX,
        batchSize: BATCH_SIZE,
        pollInterval: POLL_INTERVAL,
        mode: runOnce ? 'once' : 'watch',
    });
    await runSync();
    await prisma.$disconnect();
    log.info('opensearch sync stopped');
};

main().catch((error) => {
    log.error('opensearch sync terminated unexpectedly', {
        error: error instanceof Error ? error.message : error,
    });
    prisma.$disconnect().finally(() => {
        process.exit(1);
    });
});
