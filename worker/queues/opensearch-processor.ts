import { Job } from 'bullmq';

import {
    opensearchClient,
    OPENSEARCH_INDEX,
    OPENSEARCH_INGREDIENTS_INDEX,
    ensureIndices,
} from '@shared/opensearch/client';

import { prisma } from './prisma';
import { SyncIngredientsJob, SyncOpenSearchJob, SyncRecipeToOpenSearchJob } from './types';

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
    imageKey: string | null;
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
    imageKey?: string;
    publishedAt?: string;
    status: string;
    keywords: string[];
};

type IngredientWithDetails = {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    units: string[];
};

type IngredientDocument = {
    id: string;
    name: string;
    slug: string;
    category?: string;
    units: string[];
    keywords: string[];
};

function transformIngredientToDocument(ingredient: IngredientWithDetails): IngredientDocument {
    const keywords = Array.from(
        new Set(
            [ingredient.name, ingredient.slug, ...(ingredient.units ?? [])]
                .filter((entry): entry is string => Boolean(entry))
                .map((value) => value.toLowerCase()),
        ),
    );

    return {
        id: ingredient.id,
        name: ingredient.name,
        slug: ingredient.slug,
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
    for (let i = 0; i < operations.length; i += BULK_CHUNK_SIZE) {
        const chunk = operations.slice(i, i + BULK_CHUNK_SIZE);

        const response = await opensearchClient.bulk({
            refresh: 'wait_for',
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

export async function processSyncOpenSearch(
    job: Job<SyncOpenSearchJob>,
): Promise<{ synced: number }> {
    const batchSize = job.data.batchSize ?? 150;

    console.log(`[OpenSearch] Processing sync-opensearch job ${job.id}`, { batchSize });

    try {
        await ensureIndices();
        const recipes = await prisma.recipe.findMany({
            where: { status: 'PUBLISHED' },
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
                imageKey: true,
                publishedAt: true,
                updatedAt: true,
                categories: { include: { category: true } },
                tags: { include: { tag: true } },
                recipeIngredients: { include: { ingredient: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: batchSize,
        });

        console.log(`[OpenSearch] Fetched ${recipes.length} recipes from database`);

        if (recipes.length === 0) {
            console.warn('[OpenSearch] No recipes to sync');
            return { synced: 0 };
        }

        const operations = buildBulkOperations(recipes);
        await runBulkOperations(operations);

        console.log(`[OpenSearch] Synced ${recipes.length} recipes to index ${OPENSEARCH_INDEX}`);

        return { synced: recipes.length };
    } catch (error) {
        console.error(`[OpenSearch] sync-opensearch job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function processSyncIngredients(
    job: Job<SyncIngredientsJob>,
): Promise<{ synced: number }> {
    const batchSize = job.data.batchSize ?? 500;

    console.log(`[OpenSearch] Processing sync-ingredients job ${job.id}`, { batchSize });

    try {
        await ensureIndices();
        const ingredients = await prisma.ingredient.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                category: true,
                units: true,
            },
            orderBy: { createdAt: 'desc' },
            take: batchSize,
        });

        console.log(`[OpenSearch] Fetched ${ingredients.length} ingredients from database`);

        if (ingredients.length === 0) {
            console.warn('[OpenSearch] No ingredients to sync');
            return { synced: 0 };
        }

        const operations = buildIngredientBulkOperations(ingredients);
        await runBulkOperations(operations);

        console.log(
            `[OpenSearch] Synced ${ingredients.length} ingredients to index ${OPENSEARCH_INGREDIENTS_INDEX}`,
        );

        return { synced: ingredients.length };
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
                imageKey: true,
                publishedAt: true,
                updatedAt: true,
                categories: { include: { category: true } },
                tags: { include: { tag: true } },
                recipeIngredients: { include: { ingredient: true } },
            },
        });

        if (!recipe) {
            console.warn(`[OpenSearch] Recipe not found: ${recipeId}`);
            return { success: false, reason: 'not_found' };
        }

        if (recipe.status !== 'PUBLISHED' || !recipe.publishedAt) {
            console.log(`[OpenSearch] Removing unpublished recipe from index: ${recipeId}`);
            await opensearchClient.delete({
                index: OPENSEARCH_INDEX,
                id: recipe.id,
                refresh: 'wait_for',
            });
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
