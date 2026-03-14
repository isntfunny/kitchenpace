import { Job } from 'bullmq';

import {
    opensearchClient,
    OPENSEARCH_INDEX,
    OPENSEARCH_INGREDIENTS_INDEX,
    OPENSEARCH_TAGS_INDEX,
} from '@shared/opensearch/client';

import { getRedis } from './connection';
import { prisma } from './prisma';
import {
    SyncIngredientsJob,
    SyncRecipesJob,
    SyncRecipeToOpenSearchJob,
    SyncTagsJob,
} from './types';

const WATERMARK_KEY_RECIPES = 'opensearch:watermark:recipes';
const WATERMARK_KEY_INGREDIENTS = 'opensearch:watermark:ingredients';
const WATERMARK_KEY_TAGS = 'opensearch:watermark:tags';

/** Max documents per bulk request (each document = 2 bulk entries: action + body) */
const BULK_DOCS_PER_CHUNK = 1000;

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
    imageKey: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
    flowNodes: unknown;
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
    stepCount: number;
    imageKey?: string;
    publishedAt?: string;
    status: string;
    keywords: string[];
};

type IngredientWithDetails = {
    id: string;
    name: string;
    slug: string;
    pluralName: string | null;
    category: string | null;
    units: string[];
    aliases: string[];
    createdAt?: Date;
};

type IngredientDocument = {
    id: string;
    name: string;
    slug: string;
    pluralName: string | null;
    category?: string;
    units: string[];
    keywords: string[];
};

function transformIngredientToDocument(ingredient: IngredientWithDetails): IngredientDocument {
    const keywords = Array.from(
        new Set(
            [
                ingredient.name,
                ingredient.slug,
                ...(ingredient.units ?? []),
                ...(ingredient.aliases ?? []),
                ...(ingredient.pluralName ? [ingredient.pluralName] : []),
            ]
                .filter((entry): entry is string => Boolean(entry))
                .map((value) => value.toLowerCase()),
        ),
    );

    return {
        id: ingredient.id,
        name: ingredient.name,
        slug: ingredient.slug,
        pluralName: ingredient.pluralName,
        category: ingredient.category ?? undefined,
        units: ingredient.units ?? [],
        keywords,
    };
}

function buildIngredientBulkOperations(ingredients: IngredientWithDetails[]): BulkOperation[] {
    const operations: BulkOperation[] = [];
    for (const ingredient of ingredients) {
        operations.push({ index: { _index: OPENSEARCH_INGREDIENTS_INDEX, _id: ingredient.id } });
        operations.push(transformIngredientToDocument(ingredient));
    }
    return operations;
}

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
        stepCount: Array.isArray(recipe.flowNodes) ? recipe.flowNodes.length : 0,
        imageKey: recipe.imageKey ?? undefined,
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

async function runBulkOperations(operations: BulkOperation[]): Promise<void> {
    const chunkSize = BULK_DOCS_PER_CHUNK * 2;
    for (let i = 0; i < operations.length; i += chunkSize) {
        const chunk = operations.slice(i, i + chunkSize);

        const response = await opensearchClient.bulk({
            body: chunk,
        });

        const body = response.body as {
            errors?: boolean;
            items?: Array<Record<string, { error?: { reason?: string; type?: string } }>>;
        };
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

export async function processSyncRecipes(job: Job<SyncRecipesJob>): Promise<{ synced: number }> {
    const pageSize = job.data.batchSize ?? 150;

    console.log(`[OpenSearch] Processing sync-recipes job ${job.id}`, { pageSize });

    try {
        const redis = getRedis();
        const watermarkRaw = await redis.get(WATERMARK_KEY_RECIPES);
        const watermark = watermarkRaw ? new Date(watermarkRaw) : undefined;

        if (watermark) {
            console.log(`[OpenSearch] Incremental sync from watermark: ${watermark.toISOString()}`);
        } else {
            console.log('[OpenSearch] Full sync (no watermark found)');
        }

        let totalSynced = 0;
        let cursor: string | undefined;
        let latestUpdatedAt: Date | undefined;

        // Page through all recipes updated since the watermark
        while (true) {
            const recipes = await prisma.recipe.findMany({
                where: {
                    status: 'PUBLISHED',
                    ...(watermark ? { updatedAt: { gt: watermark } } : {}),
                    ...(cursor ? { id: { gt: cursor } } : {}),
                },
                select: {
                    id: true,
                    slug: true,
                    title: true,
                    description: true,
                    difficulty: true,
                    status: true,
                    totalTime: true,
                    prepTime: true,
                    cookTime: true,
                    rating: true,
                    cookCount: true,
                    flowNodes: true,
                    imageKey: true,
                    publishedAt: true,
                    updatedAt: true,
                    categories: { include: { category: true } },
                    tags: { include: { tag: true } },
                    recipeIngredients: { include: { ingredient: true } },
                },
                orderBy: { id: 'asc' },
                take: pageSize,
            });

            if (recipes.length === 0) break;

            const operations = buildBulkOperations(recipes);
            await runBulkOperations(operations);

            totalSynced += recipes.length;
            cursor = recipes[recipes.length - 1].id;

            for (const recipe of recipes) {
                if (!latestUpdatedAt || recipe.updatedAt > latestUpdatedAt) {
                    latestUpdatedAt = recipe.updatedAt;
                }
            }

            console.log(
                `[OpenSearch] Synced batch of ${recipes.length} recipes (total: ${totalSynced})`,
            );

            if (recipes.length < pageSize) break;
        }

        // Advance the watermark
        if (latestUpdatedAt) {
            await redis.set(WATERMARK_KEY_RECIPES, latestUpdatedAt.toISOString());
            console.log(`[OpenSearch] Updated watermark to ${latestUpdatedAt.toISOString()}`);
        }

        console.log(`[OpenSearch] Synced ${totalSynced} recipes to index ${OPENSEARCH_INDEX}`);

        return { synced: totalSynced };
    } catch (error) {
        console.error(`[OpenSearch] sync-recipes job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function processSyncIngredients(
    job: Job<SyncIngredientsJob>,
): Promise<{ synced: number }> {
    const pageSize = job.data.batchSize ?? 500;

    console.log(`[OpenSearch] Processing sync-ingredients job ${job.id}`, { pageSize });

    try {
        const redis = getRedis();
        const watermarkRaw = await redis.get(WATERMARK_KEY_INGREDIENTS);
        const watermark = watermarkRaw ? new Date(watermarkRaw) : undefined;

        if (watermark) {
            console.log(
                `[OpenSearch] Incremental ingredients sync from: ${watermark.toISOString()}`,
            );
        } else {
            console.log('[OpenSearch] Full ingredients sync (no watermark found)');
        }

        let totalSynced = 0;
        let cursor: string | undefined;
        let latestCreatedAt: Date | undefined;

        while (true) {
            const ingredients = await prisma.ingredient.findMany({
                where: {
                    ...(watermark ? { createdAt: { gt: watermark } } : {}),
                    ...(cursor ? { id: { gt: cursor } } : {}),
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    pluralName: true,
                    category: true,
                    units: true,
                    aliases: true,
                    createdAt: true,
                },
                orderBy: { id: 'asc' },
                take: pageSize,
            });

            if (ingredients.length === 0) break;

            const operations = buildIngredientBulkOperations(ingredients);
            await runBulkOperations(operations);

            totalSynced += ingredients.length;
            cursor = ingredients[ingredients.length - 1].id;

            for (const ingredient of ingredients) {
                if (!latestCreatedAt || ingredient.createdAt > latestCreatedAt) {
                    latestCreatedAt = ingredient.createdAt;
                }
            }

            console.log(
                `[OpenSearch] Synced batch of ${ingredients.length} ingredients (total: ${totalSynced})`,
            );

            if (ingredients.length < pageSize) break;
        }

        if (latestCreatedAt) {
            await redis.set(WATERMARK_KEY_INGREDIENTS, latestCreatedAt.toISOString());
            console.log(
                `[OpenSearch] Updated ingredients watermark to ${latestCreatedAt.toISOString()}`,
            );
        }

        console.log(
            `[OpenSearch] Synced ${totalSynced} ingredients to index ${OPENSEARCH_INGREDIENTS_INDEX}`,
        );

        return { synced: totalSynced };
    } catch (error) {
        console.error(`[OpenSearch] sync-ingredients job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function processSyncRecipeToOpenSearch(
    job: Job<SyncRecipeToOpenSearchJob>,
): Promise<{ success: boolean; action?: string; reason?: string }> {
    const { recipeId } = job.data;

    console.log(`[OpenSearch] Processing sync-recipe job ${job.id}`, { recipeId });

    if (!recipeId) {
        return { success: false, reason: 'missing_recipeId' };
    }

    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                difficulty: true,
                status: true,
                totalTime: true,
                prepTime: true,
                cookTime: true,
                rating: true,
                cookCount: true,
                flowNodes: true,
                imageKey: true,
                publishedAt: true,
                updatedAt: true,
                categories: { include: { category: true } },
                tags: { include: { tag: true } },
                recipeIngredients: { include: { ingredient: true } },
            },
        });

        if (!recipe) {
            console.log(`[OpenSearch] Recipe not found in DB, removing from index: ${recipeId}`);
            try {
                await opensearchClient.delete({
                    index: OPENSEARCH_INDEX,
                    id: recipeId,
                    refresh: 'wait_for',
                });
            } catch (deleteError: unknown) {
                const statusCode = (deleteError as { meta?: { statusCode?: number } })?.meta
                    ?.statusCode;
                if (statusCode !== 404) throw deleteError;
            }
            return { success: true, action: 'deleted' };
        }

        if (recipe.status !== 'PUBLISHED' || !recipe.publishedAt) {
            console.log(`[OpenSearch] Removing unpublished recipe from index: ${recipeId}`);
            try {
                await opensearchClient.delete({
                    index: OPENSEARCH_INDEX,
                    id: recipe.id,
                    refresh: 'wait_for',
                });
            } catch (deleteError: unknown) {
                const statusCode = (deleteError as { meta?: { statusCode?: number } })?.meta
                    ?.statusCode;
                if (statusCode === 404) {
                    console.log(`[OpenSearch] Recipe not in index (already absent): ${recipeId}`);
                } else {
                    throw deleteError;
                }
            }
            return { success: true, action: 'deleted' };
        }

        const doc = transformToDocument(recipe);

        await opensearchClient.index({
            index: OPENSEARCH_INDEX,
            id: recipe.id,
            body: doc,
            refresh: 'wait_for',
        });

        console.log(`[OpenSearch] Indexed recipe: ${recipeId}`, { title: recipe.title });

        return { success: true, action: 'indexed' };
    } catch (error) {
        console.error(`[OpenSearch] sync-recipe job ${job.id} failed`, {
            recipeId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// ── Tag sync ──────────────────────────────────────────────────────────

type TagWithDetails = {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
};

type TagDocument = {
    id: string;
    name: string;
    slug: string;
    keywords: string[];
};

function transformTagToDocument(tag: TagWithDetails): TagDocument {
    const keywords = Array.from(
        new Set(
            [tag.name, tag.slug]
                .filter((entry): entry is string => Boolean(entry))
                .map((value) => value.toLowerCase()),
        ),
    );

    return {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        keywords,
    };
}

function buildTagBulkOperations(tags: TagWithDetails[]): BulkOperation[] {
    const operations: BulkOperation[] = [];
    for (const tag of tags) {
        operations.push({ index: { _index: OPENSEARCH_TAGS_INDEX, _id: tag.id } });
        operations.push(transformTagToDocument(tag));
    }
    return operations;
}

export async function processSyncTags(job: Job<SyncTagsJob>): Promise<{ synced: number }> {
    const pageSize = job.data.batchSize ?? 500;

    console.log(`[OpenSearch] Processing sync-tags job ${job.id}`, { pageSize });

    try {
        const redis = getRedis();
        const watermarkRaw = await redis.get(WATERMARK_KEY_TAGS);
        const watermark = watermarkRaw ? new Date(watermarkRaw) : undefined;

        if (watermark) {
            console.log(`[OpenSearch] Incremental tags sync from: ${watermark.toISOString()}`);
        } else {
            console.log('[OpenSearch] Full tags sync (no watermark found)');
        }

        let totalSynced = 0;
        let cursor: string | undefined;
        let latestCreatedAt: Date | undefined;

        while (true) {
            const tags = await prisma.tag.findMany({
                where: {
                    ...(watermark ? { createdAt: { gt: watermark } } : {}),
                    ...(cursor ? { id: { gt: cursor } } : {}),
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    createdAt: true,
                },
                orderBy: { id: 'asc' },
                take: pageSize,
            });

            if (tags.length === 0) break;

            const operations = buildTagBulkOperations(tags);
            await runBulkOperations(operations);

            totalSynced += tags.length;
            cursor = tags[tags.length - 1].id;

            for (const tag of tags) {
                if (!latestCreatedAt || tag.createdAt > latestCreatedAt) {
                    latestCreatedAt = tag.createdAt;
                }
            }

            console.log(`[OpenSearch] Synced batch of ${tags.length} tags (total: ${totalSynced})`);

            if (tags.length < pageSize) break;
        }

        if (latestCreatedAt) {
            await redis.set(WATERMARK_KEY_TAGS, latestCreatedAt.toISOString());
            console.log(`[OpenSearch] Updated tags watermark to ${latestCreatedAt.toISOString()}`);
        }

        console.log(`[OpenSearch] Synced ${totalSynced} tags to index ${OPENSEARCH_TAGS_INDEX}`);

        return { synced: totalSynced };
    } catch (error) {
        console.error(`[OpenSearch] sync-tags job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
