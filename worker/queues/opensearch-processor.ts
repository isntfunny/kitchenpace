import { Job } from 'bullmq';

import {
    buildRecipeEmbeddingText,
    EMBEDDING_MODEL,
    generateEmbedding,
    generateEmbeddings,
    type RecipeEmbeddingInput,
} from '@app/lib/embeddings/embedding-service';
import {
    ensureIndices,
    opensearchClient,
    OPENSEARCH_INDEX,
    OPENSEARCH_INGREDIENTS_INDEX,
    OPENSEARCH_TAGS_INDEX,
    OPENSEARCH_EMBEDDINGS_INDEX,
} from '@shared/opensearch/client';

import { getRedis } from './connection';
import { prisma } from './prisma';
import {
    BackfillEmbeddingsJob,
    QueueName,
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
    caloriesPerServing: number | null;
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
    calories?: number;
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
    categories: Array<{ name: string; slug: string }>;
    ingredientUnits: Array<{ unit: { shortName: string } }>;
    aliases: string[];
    createdAt?: Date;
};

type IngredientDocument = {
    id: string;
    name: string;
    slug: string;
    pluralName: string | null;
    categories: string[];
    units: string[];
    aliases: string[];
    keywords: string[];
};

function transformIngredientToDocument(ingredient: IngredientWithDetails): IngredientDocument {
    const keywords = Array.from(
        new Set(
            [
                ingredient.name,
                ingredient.slug,
                ...ingredient.ingredientUnits.map((iu) => iu.unit.shortName),
                ...ingredient.categories.map((c) => c.name),
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
        categories: ingredient.categories.map((c) => c.name),
        units: ingredient.ingredientUnits.map((iu) => iu.unit.shortName),
        aliases: ingredient.aliases ?? [],
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
        calories: recipe.caloriesPerServing ?? undefined,
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

/** Scroll through an entire index and collect all document IDs. */
async function getAllIndexIds(index: string): Promise<Set<string>> {
    const ids = new Set<string>();
    const scrollTimeout = '30s';

    const initial = await opensearchClient.search({
        index,
        scroll: scrollTimeout,
        size: 5000,
        body: { query: { match_all: {} }, _source: false },
    });

    type ScrollHit = { _id: string };
    type ScrollBody = {
        _scroll_id?: string;
        hits?: { hits?: ScrollHit[] };
    };

    let body = initial.body as ScrollBody;
    let scrollId = body._scroll_id;

    for (const hit of body.hits?.hits ?? []) {
        ids.add(hit._id);
    }

    while (scrollId) {
        const next = await opensearchClient.scroll({
            scroll_id: scrollId,
            scroll: scrollTimeout,
        });
        body = next.body as ScrollBody;
        scrollId = body._scroll_id;

        const hits = body.hits?.hits ?? [];
        if (hits.length === 0) break;

        for (const hit of hits) {
            ids.add(hit._id);
        }
    }

    if (scrollId) {
        try {
            await opensearchClient.clearScroll({ scroll_id: scrollId });
        } catch {
            // best-effort cleanup
        }
    }

    return ids;
}

/** Bulk-delete a set of IDs from an index. */
async function bulkDeleteIds(index: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const operations: BulkOperation[] = [];
    for (const id of ids) {
        operations.push({ delete: { _index: index, _id: id } });
    }

    // Delete ops are single-line (no body), so chunk by BULK_DOCS_PER_CHUNK directly
    for (let i = 0; i < operations.length; i += BULK_DOCS_PER_CHUNK) {
        const chunk = operations.slice(i, i + BULK_DOCS_PER_CHUNK);

        const response = await opensearchClient.bulk({ body: chunk });
        const body = response.body as {
            errors?: boolean;
            items?: Array<Record<string, { error?: { reason?: string; type?: string } }>>;
        };

        if (body.errors) {
            const errors = (body.items ?? [])
                .map((item) => {
                    const entry = item.delete;
                    if (entry?.error?.type === 'not_found') return null;
                    return entry?.error?.reason ?? entry?.error?.type;
                })
                .filter(Boolean);
            if (errors.length > 0) {
                throw new Error(`OpenSearch bulk delete failed: ${errors.join('; ')}`);
            }
        }
    }
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
                    caloriesPerServing: true,
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

        // ── Cleanup: remove documents that no longer exist as PUBLISHED in DB ──
        const indexedIds = await getAllIndexIds(OPENSEARCH_INDEX);
        if (indexedIds.size > 0) {
            const dbIds = new Set(
                (
                    await prisma.recipe.findMany({
                        where: { status: 'PUBLISHED' },
                        select: { id: true },
                    })
                ).map((r) => r.id),
            );

            const staleIds = [...indexedIds].filter((id) => !dbIds.has(id));
            if (staleIds.length > 0) {
                await bulkDeleteIds(OPENSEARCH_INDEX, staleIds);
                console.log(`[OpenSearch] Removed ${staleIds.length} stale recipes from index`);
            }
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
                    categories: { select: { name: true, slug: true } },
                    ingredientUnits: { select: { unit: { select: { shortName: true } } } },
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

        // ── Cleanup: remove ingredients that no longer exist in DB ──
        const indexedIds = await getAllIndexIds(OPENSEARCH_INGREDIENTS_INDEX);
        if (indexedIds.size > 0) {
            const dbIds = new Set(
                (
                    await prisma.ingredient.findMany({
                        select: { id: true },
                    })
                ).map((i) => i.id),
            );

            const staleIds = [...indexedIds].filter((id) => !dbIds.has(id));
            if (staleIds.length > 0) {
                await bulkDeleteIds(OPENSEARCH_INGREDIENTS_INDEX, staleIds);
                console.log(`[OpenSearch] Removed ${staleIds.length} stale ingredients from index`);
            }
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
                caloriesPerServing: true,
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
            await Promise.all([
                safeDelete(OPENSEARCH_INDEX, recipeId),
                safeDelete(OPENSEARCH_EMBEDDINGS_INDEX, recipeId),
            ]);
            return { success: true, action: 'deleted' };
        }

        if (recipe.status !== 'PUBLISHED' || !recipe.publishedAt) {
            console.log(`[OpenSearch] Removing unpublished recipe from index: ${recipeId}`);
            await Promise.all([
                safeDelete(OPENSEARCH_INDEX, recipeId),
                safeDelete(OPENSEARCH_EMBEDDINGS_INDEX, recipeId),
            ]);
            return { success: true, action: 'deleted' };
        }

        const doc = transformToDocument(recipe);

        await opensearchClient.index({
            index: OPENSEARCH_INDEX,
            id: recipe.id,
            body: doc,
            refresh: 'wait_for',
        });

        // Generate and index embedding (best-effort — don't fail the sync)
        try {
            await indexRecipeEmbedding(recipe);
        } catch (embeddingError) {
            console.warn(`[OpenSearch] Embedding generation failed for ${recipeId}`, {
                error:
                    embeddingError instanceof Error
                        ? embeddingError.message
                        : String(embeddingError),
            });
        }

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

        // ── Cleanup: remove tags that no longer exist in DB ──
        const indexedIds = await getAllIndexIds(OPENSEARCH_TAGS_INDEX);
        if (indexedIds.size > 0) {
            const dbIds = new Set(
                (
                    await prisma.tag.findMany({
                        select: { id: true },
                    })
                ).map((t) => t.id),
            );

            const staleIds = [...indexedIds].filter((id) => !dbIds.has(id));
            if (staleIds.length > 0) {
                await bulkDeleteIds(OPENSEARCH_TAGS_INDEX, staleIds);
                console.log(`[OpenSearch] Removed ${staleIds.length} stale tags from index`);
            }
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

// ── Helpers ───────────────────────────────────────────────────────────

/** Delete a document from an index, ignoring 404 errors. */
async function safeDelete(index: string, id: string): Promise<void> {
    try {
        await opensearchClient.delete({ index, id, refresh: 'wait_for' });
    } catch (err: unknown) {
        const statusCode = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
        if (statusCode !== 404) throw err;
    }
}

// ── Embedding helpers ────────────────────────────────────────────────

function recipeToEmbeddingInput(
    recipe: Pick<
        RecipeWithRelations,
        'title' | 'description' | 'recipeIngredients' | 'tags' | 'categories' | 'difficulty'
    >,
): RecipeEmbeddingInput {
    return {
        title: recipe.title,
        description: recipe.description ?? '',
        ingredients: recipe.recipeIngredients
            .map((ri) => ri.ingredient?.name)
            .filter((n): n is string => Boolean(n)),
        tags: recipe.tags.map((t) => t.tag?.name).filter((n): n is string => Boolean(n)),
        category: recipe.categories[0]?.category?.name ?? undefined,
        difficulty: recipe.difficulty,
    };
}

/** Generate and index embedding for a single recipe. */
async function indexRecipeEmbedding(recipe: RecipeWithRelations): Promise<void> {
    const input = recipeToEmbeddingInput(recipe);
    const text = buildRecipeEmbeddingText(input);
    const embedding = await generateEmbedding(text);

    await Promise.all([
        opensearchClient.index({
            index: OPENSEARCH_EMBEDDINGS_INDEX,
            id: recipe.id,
            body: { id: recipe.id, embedding },
        }),
        prisma.recipeEmbedding.upsert({
            where: { recipeId: recipe.id },
            create: { recipeId: recipe.id, embedding, model: EMBEDDING_MODEL },
            update: { embedding, model: EMBEDDING_MODEL },
        }),
    ]);
}

// ── Bulk embedding backfill ──────────────────────────────────────────

export async function processBackfillEmbeddings(
    job: Job<BackfillEmbeddingsJob>,
): Promise<{ embedded: number; restored: number; generated: number }> {
    const batchSize = job.data.batchSize ?? 50;
    console.log(`[OpenSearch] Processing backfill-embeddings job ${job.id}`, { batchSize });

    let totalRestored = 0;
    let totalGenerated = 0;
    let cursor: string | undefined;

    // Load existing embeddings from PostgreSQL (source of truth)
    const existingRows = await prisma.recipeEmbedding.findMany({
        where: { model: EMBEDDING_MODEL },
        select: { recipeId: true, embedding: true },
    });
    const existingMap = new Map(existingRows.map((r) => [r.recipeId, r.embedding as number[]]));

    while (true) {
        const recipes = await prisma.recipe.findMany({
            where: {
                status: 'PUBLISHED',
                ...(cursor ? { id: { gt: cursor } } : {}),
            },
            select: {
                id: true,
                title: true,
                description: true,
                difficulty: true,
                categories: { include: { category: true } },
                tags: { include: { tag: true } },
                recipeIngredients: { include: { ingredient: true } },
            },
            orderBy: { id: 'asc' },
            take: batchSize,
        });

        if (recipes.length === 0) break;

        // Split: recipes with cached embeddings vs. ones that need OpenAI
        const hasEmbedding = recipes.filter((r) => existingMap.has(r.id));
        const needsEmbedding = recipes.filter((r) => !existingMap.has(r.id));

        // Restore cached embeddings from PostgreSQL → OpenSearch (no API call)
        if (hasEmbedding.length > 0) {
            const operations: BulkOperation[] = [];
            for (const r of hasEmbedding) {
                operations.push({
                    index: { _index: OPENSEARCH_EMBEDDINGS_INDEX, _id: r.id },
                });
                operations.push({ id: r.id, embedding: existingMap.get(r.id)! });
            }
            await runBulkOperations(operations);
            totalRestored += hasEmbedding.length;
        }

        // Generate new embeddings via OpenAI for recipes without cache
        if (needsEmbedding.length > 0) {
            const texts = needsEmbedding.map((r) =>
                buildRecipeEmbeddingText(recipeToEmbeddingInput(r)),
            );
            const embeddings = await generateEmbeddings(texts);

            // Bulk index into OpenSearch
            const operations: BulkOperation[] = [];
            for (let i = 0; i < needsEmbedding.length; i++) {
                operations.push({
                    index: { _index: OPENSEARCH_EMBEDDINGS_INDEX, _id: needsEmbedding[i].id },
                });
                operations.push({ id: needsEmbedding[i].id, embedding: embeddings[i] });
            }
            await runBulkOperations(operations);

            // Persist to PostgreSQL
            await prisma.$transaction(
                needsEmbedding.map((r, i) =>
                    prisma.recipeEmbedding.upsert({
                        where: { recipeId: r.id },
                        create: {
                            recipeId: r.id,
                            embedding: embeddings[i],
                            model: EMBEDDING_MODEL,
                        },
                        update: { embedding: embeddings[i], model: EMBEDDING_MODEL },
                    }),
                ),
            );

            totalGenerated += needsEmbedding.length;
        }

        cursor = recipes[recipes.length - 1].id;

        console.log(
            `[OpenSearch] Backfill batch: ${hasEmbedding.length} restored from cache, ${needsEmbedding.length} generated (total: ${totalRestored + totalGenerated})`,
        );

        if (recipes.length < batchSize) break;
    }

    console.log(
        `[OpenSearch] Backfill complete: ${totalRestored} restored from PostgreSQL, ${totalGenerated} generated via OpenAI`,
    );
    return {
        embedded: totalRestored + totalGenerated,
        restored: totalRestored,
        generated: totalGenerated,
    };
}

// ── Reindex ──────────────────────────────────────────────────────────────

export interface ReindexJob {
    dropAndRecreate?: boolean;
}

const STANDARD_INDICES = [
    OPENSEARCH_INDEX,
    OPENSEARCH_INGREDIENTS_INDEX,
    OPENSEARCH_TAGS_INDEX,
    OPENSEARCH_EMBEDDINGS_INDEX,
];

export async function processReindex(job: Job<ReindexJob>): Promise<{ status: string }> {
    const { dropAndRecreate = false } = job.data;
    const redis = getRedis();

    console.log(`[OpenSearch] Reindex started (dropAndRecreate=${dropAndRecreate})`);

    if (dropAndRecreate) {
        for (const index of STANDARD_INDICES) {
            const { body: exists } = await opensearchClient.indices.exists({ index });
            if (exists) {
                await opensearchClient.indices.delete({ index });
                console.log(`[OpenSearch] Dropped index "${index}"`);
            }
        }
    }

    // Create missing indices or update mappings on existing ones
    await ensureIndices();

    // Clear watermarks → next sync jobs do a full sync
    await redis.del(WATERMARK_KEY_RECIPES);
    await redis.del(WATERMARK_KEY_INGREDIENTS);
    await redis.del(WATERMARK_KEY_TAGS);
    console.log('[OpenSearch] Watermarks cleared');

    // Dispatch sync jobs on the same queue
    const { Queue } = await import('bullmq');
    const queue = new Queue(QueueName.OPENSEARCH, { connection: getRedis() as any });
    await queue.add('sync-recipes', { batchSize: 150 });
    await queue.add('sync-ingredients', { batchSize: 500 });
    await queue.add('sync-tags', { batchSize: 500 });
    await queue.add('backfill-embeddings', { batchSize: 50 });
    await queue.close();
    console.log(
        '[OpenSearch] Queued sync-recipes, sync-ingredients, sync-tags, backfill-embeddings',
    );

    return { status: dropAndRecreate ? 'dropped-and-recreated' : 'mappings-updated' };
}
