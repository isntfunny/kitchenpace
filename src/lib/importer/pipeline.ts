/**
 * Shared import pipeline — AI analysis + DB save.
 * Accepts a PrismaClient as parameter so it works from both
 * Next.js server actions and the CLI.
 */

import { randomUUID } from 'node:crypto';

import type { Prisma, PrismaClient } from '@prisma/client';

import { createIngredient, findOrCreateUnit } from '@app/components/recipe/ingredientActions';
import { applyFlowPositions } from '@app/lib/flow-layout';
import {
    assertResolvedMentions,
    repairIngredientMentions,
} from '@app/lib/ingredients/recipe-mentions';
import { approvedKey } from '@app/lib/s3/keys';
import { moveObject } from '@app/lib/s3/operations';
import { generateUniqueSlug } from '@app/lib/slug';
import { AI_TEXT_MODEL } from '@shared/ai-models';
import { pickListedTags, TAG_NAMES_SORTED } from '@shared/tags/tag-list';

import { bindMentions } from './import-mentions';
import { describeParseError, importRecipeFromMarkdown } from './openai-client';
import { type AnalyzedRecipe, transformImportedRecipe } from './transform';
import { uploadImageFromUrl } from './upload-image-from-url';

// ─────────────────────────────────────────────────────────────────────────────
// analyzeWithAI
// ─────────────────────────────────────────────────────────────────────────────

interface ImportRunData {
    userId?: string;
    sourceUrl?: string;
    markdownLength?: number;
    status: 'SUCCESS' | 'FAILED';
    errorType?: string;
    errorMessage?: string;
    recipeId?: string;
    model?: string;
    inputTokens?: number | null;
    cachedInputTokens?: number | null;
    outputTokens?: number | null;
    estimatedCostUsd?: number | null;
    rawApiResponse?: unknown;
}

/**
 * Import context for the prompt: the whole fixed tag list (alphabetical, KUC-116)
 * and the known ingredients. Both orders are stable for prompt caching.
 */
export async function fetchImportContext(db: PrismaClient) {
    // Sorted by createdAt so new entries append at the end — maximises prompt cache hits.
    const allIngredients = await db.ingredient.findMany({
        select: { name: true },
        orderBy: { createdAt: 'asc' },
    });
    return {
        availableTags: [...TAG_NAMES_SORTED],
        topIngredients: allIngredients.map((i) => i.name),
    };
}

export async function logImportRun(db: PrismaClient, data: ImportRunData): Promise<void> {
    const userId =
        data.userId ??
        (
            await db.user.findFirst({
                where: { role: 'ADMIN' },
                orderBy: { createdAt: 'asc' },
                select: { id: true },
            })
        )?.id;

    if (!userId) {
        console.warn('[logImportRun] Kein User gefunden, ImportRun wird nicht geloggt');
        return;
    }

    await db.importRun.create({
        data: {
            userId,
            sourceUrl: data.sourceUrl || null,
            sourceType: data.sourceUrl ? 'url' : 'text',
            markdownLength: data.markdownLength ?? null,
            status: data.status,
            errorType: data.errorType ?? null,
            errorMessage: data.errorMessage ?? null,
            recipeId: data.recipeId ?? null,
            model: data.model ?? null,
            inputTokens: data.inputTokens ?? null,
            cachedInputTokens: data.cachedInputTokens ?? null,
            outputTokens: data.outputTokens ?? null,
            estimatedCostUsd: data.estimatedCostUsd ?? null,
            rawApiResponse: data.rawApiResponse ? (data.rawApiResponse as object) : undefined,
        },
    });
}

/**
 * Sends scraped markdown to OpenAI and returns an AnalyzedRecipe.
 *
 * @param db      - PrismaClient instance
 * @param markdown - Scraped markdown content
 * @param sourceUrl - Origin URL (empty string for pasted text)
 * @param userId  - Optional user ID. If not provided, logs to system/admin user
 */
export async function analyzeWithAI(
    db: PrismaClient,
    markdown: string,
    sourceUrl = '',
    userId?: string,
    scrapedImageUrl?: string,
): Promise<AnalyzedRecipe> {
    if (!markdown.trim()) {
        throw new Error('Kein Inhalt zum Analysieren vorhanden.');
    }

    if (!process.env.OPENAI_API_KEY) {
        const error = new Error('OpenAI API Key nicht konfiguriert. Import nicht möglich.');
        await logImportRun(db, {
            userId,
            sourceUrl,
            markdownLength: markdown.length,
            status: 'FAILED',
            errorMessage: error.message,
        });
        throw error;
    }

    const context = await fetchImportContext(db);

    const result = await importRecipeFromMarkdown(markdown, sourceUrl, {
        model: AI_TEXT_MODEL,
        context,
    });

    if (!result.success) {
        console.error('AI analysis failed:', result.error);
        const errorMessage = describeParseError(result.error);
        await logImportRun(db, {
            userId,
            sourceUrl,
            markdownLength: markdown.length,
            status: 'FAILED',
            errorType: result.error.type,
            errorMessage,
            model: result.metadata?.model,
            inputTokens: result.metadata?.inputTokens,
            cachedInputTokens: result.metadata?.cachedInputTokens,
            outputTokens: result.metadata?.outputTokens,
            estimatedCostUsd: result.metadata?.estimatedCostUsd,
            rawApiResponse: result.metadata?.rawApiResponse,
        });
        throw new Error(`KI-Analyse fehlgeschlagen: ${errorMessage}`);
    }

    const { metadata } = result;
    await logImportRun(db, {
        userId,
        sourceUrl,
        markdownLength: markdown.length,
        status: 'SUCCESS',
        model: metadata.model,
        inputTokens: metadata.inputTokens,
        cachedInputTokens: metadata.cachedInputTokens,
        outputTokens: metadata.outputTokens,
        estimatedCostUsd: metadata.estimatedCostUsd,
        rawApiResponse: metadata.rawApiResponse,
    }).catch((err) => console.error('ImportRun log failed:', err));

    const recipe = transformImportedRecipe(result.data);
    return {
        ...recipe,
        sourceUrl: sourceUrl || undefined,
        imageUrl: recipe.imageUrl || scrapedImageUrl || undefined,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared save steps (new import and full refresh of an existing recipe)
// ─────────────────────────────────────────────────────────────────────────────

type Db = PrismaClient | Prisma.TransactionClient;

export interface PreparedImport {
    /** RecipeIngredient rows to create, in list order (ids are fresh) */
    ingredientRows: {
        id: string;
        sourceId: string;
        ingredientId: string;
        unitId: string;
        amount: string;
        notes: string | null;
        isOptional: boolean;
        position: number;
    }[];
    flowNodes: object;
    flowEdges: object;
}

/**
 * Finds or creates the catalogue ingredients and units, binds the AI's
 * mentions to the new RecipeIngredient ids and checks that every mention
 * resolves. Runs before the recipe write (ingredient creation uses its own
 * connection and enqueues the enrichment, KUC-94/114).
 */
export async function prepareImportedRecipe(data: AnalyzedRecipe): Promise<PreparedImport> {
    if (!data.title?.trim()) {
        throw new Error('Bitte gib einen Rezepttitel ein.');
    }
    if (!data.ingredients?.length) {
        throw new Error('Das Rezept muss mindestens eine Zutat haben.');
    }

    // Find or create ingredients + resolve units
    const syncedIngredients: ((typeof data.ingredients)[number] & {
        referenceId: string;
        ingredientId: string;
        unitId: string;
    })[] = [];
    for (const ing of data.ingredients) {
        const [ingredient, unitId] = await Promise.all([
            createIngredient(ing.name),
            findOrCreateUnit(ing.unit),
        ]);
        syncedIngredients.push({
            ...ing,
            referenceId: randomUUID(),
            ingredientId: ingredient.id,
            unitId,
        });
    }

    const sourceIds = new Map(syncedIngredients.map((ing) => [ing.id, ing.referenceId]));
    if (sourceIds.size !== syncedIngredients.length) throw new Error('Doppelte Import-Zutaten-ID');
    // Pure id mapping: the AI's display text ("Zwiebeln") and partial amounts stay.
    // Unknown ids are kept so the repair check below reports them.
    const mapped = bindMentions(
        data.flowNodes.map((node) => ({ ...node, description: node.description ?? '' })),
        sourceIds,
        { unknown: 'keep' },
    );
    // Ingredients picked for a step in the review keep their place in ingredientIds.
    const mappedNodes = mapped.nodes.map((node, index) => ({
        ...node,
        ingredientIds: [
            ...new Set([
                ...node.ingredientIds,
                ...(data.flowNodes[index].ingredientIds ?? []).map((id) => sourceIds.get(id) ?? id),
            ]),
        ],
    }));
    const resolvedFlow = repairIngredientMentions(
        mappedNodes,
        syncedIngredients.map((ing) => ({
            ...ing,
            id: ing.referenceId,
            sourceId: ing.id,
        })),
        new Map(),
        { allowNameFallback: false },
    );
    assertResolvedMentions(resolvedFlow.issues);

    return {
        ingredientRows: syncedIngredients.map((ing, index) => ({
            id: ing.referenceId,
            sourceId: ing.id,
            ingredientId: ing.ingredientId,
            unitId: ing.unitId,
            amount: ing.amount,
            notes: ing.notes ?? null,
            isOptional: ing.isOptional,
            position: index,
        })),
        flowNodes: applyFlowPositions(resolvedFlow.nodes, data.flowEdges) as unknown as object,
        flowEdges: data.flowEdges as unknown as object,
    };
}

/** Downloads the external image into uploads/; `undefined` when there is none or it fails. */
async function uploadImportImage(imageUrl: string | undefined): Promise<string | undefined> {
    if (!imageUrl) return undefined;
    const imgResult = await uploadImageFromUrl(imageUrl);
    if (imgResult.success) return imgResult.key;
    console.warn('[import] Image upload failed:', imgResult.error);
    return undefined;
}

/** Moves an uploaded import image to approved/; returns the new key, or `null` on failure. */
async function approveImportImage(imageKey: string, recipeId: string): Promise<string | null> {
    const ext = imageKey.split('.').pop() ?? 'jpg';
    const destKey = approvedKey('recipe', recipeId, ext);
    try {
        await moveObject(imageKey, destKey);
        return destKey;
    } catch (err: unknown) {
        console.warn('[import] Failed to move image to approved/', err);
        return null;
    }
}

/** Links the AI's categories (slugs) to the recipe; unknown slugs are dropped. */
export async function linkImportedCategories(db: Db, recipeId: string, categorySlugs: string[]) {
    if (!categorySlugs.length) return;
    const categories = await db.category.findMany({
        where: { slug: { in: categorySlugs } },
        select: { id: true, slug: true },
    });
    const slugToId = new Map(categories.map((c) => [c.slug, c.id]));
    const validEntries = categorySlugs
        .map((slug, index) => ({ id: slugToId.get(slug), index }))
        .filter((e): e is { id: string; index: number } => e.id != null)
        .map(({ id, index }) => ({ recipeId, categoryId: id, position: index }));
    if (validEntries.length) {
        await db.recipeCategory.createMany({ data: validEntries, skipDuplicates: true });
    }
}

/** Links the AI's tags; only tags from the fixed list (KUC-116), never new free tags. */
export async function linkImportedTags(db: Db, recipeId: string, tagNames: string[]) {
    const listedTags = pickListedTags(tagNames);
    if (!listedTags.length) return;
    const tags: { id: string }[] = [];
    for (const listed of listedTags) {
        // Name match too: before the cleanup some tags have a non-standard slug
        const existing = await db.tag.findFirst({
            where: {
                OR: [{ slug: listed.slug }, { name: { equals: listed.name, mode: 'insensitive' } }],
            },
            select: { id: true },
        });
        const tag =
            existing ??
            (await db.tag.create({
                data: { name: listed.name, slug: listed.slug },
                select: { id: true },
            }));
        tags.push(tag);
    }

    await db.recipeTag.createMany({
        data: tags.map((tag) => ({ recipeId, tagId: tag.id })),
        skipDuplicates: true,
    });
}

/** Recipe columns the import sets from the source (shared by create and replace). */
function importedRecipeFields(data: AnalyzedRecipe) {
    return {
        title: data.title,
        description: data.description || '',
        servings: data.servings ?? 4,
        prepTime: data.prepTime ?? 0,
        cookTime: data.cookTime ?? 0,
        totalTime: (data.prepTime ?? 0) + (data.cookTime ?? 0),
        difficulty: data.difficulty ?? 'MEDIUM',
    } as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// saveImportedRecipe
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists an AnalyzedRecipe to the database as a DRAFT.
 *
 * @param db       - PrismaClient instance
 * @param data     - The analyzed recipe to save
 * @param authorId - The user ID to set as author
 */
export async function saveImportedRecipe(
    db: Db,
    data: AnalyzedRecipe,
    authorId: string,
    options?: { publish?: boolean },
): Promise<{ id: string; slug: string }> {
    const prepared = await prepareImportedRecipe(data);

    // Download and upload external image to S3 (if provided)
    const imageKey = await uploadImportImage(data.imageUrl);

    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await db.recipe.findUnique({ where: { slug: s } });
        return !!existing;
    });

    const recipe = await db.recipe.create({
        data: {
            ...importedRecipeFields(data),
            slug,
            imageKey: imageKey ?? null,
            status: options?.publish ? 'PUBLISHED' : 'DRAFT',
            publishedAt: options?.publish ? new Date() : null,
            sourceUrl: data.sourceUrl ?? null,
            authorId,
            flowNodes: prepared.flowNodes,
            flowEdges: prepared.flowEdges,
            recipeIngredients: { create: prepared.ingredientRows },
        },
    });

    // Move image from uploads/ to approved/ — imported recipes skip moderation
    if (imageKey) {
        const destKey = await approveImportImage(imageKey, recipe.id);
        if (destKey)
            await db.recipe.update({
                where: { id: recipe.id },
                data: { imageKey: destKey, moderationStatus: 'AUTO_APPROVED' },
            });
    }

    await linkImportedCategories(db, recipe.id, data.categoryIds ?? []);
    await linkImportedTags(db, recipe.id, data.tags ?? []);

    return { id: recipe.id, slug: recipe.slug };
}

// ─────────────────────────────────────────────────────────────────────────────
// replaceImportedRecipe (full refresh, KUC-115)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Overwrites an existing recipe with a fresh import of its source, as if it
 * were imported today: title, description, servings, times, difficulty, flow,
 * ingredient rows, categories and tags. Kept: id, slug, author, status,
 * publishedAt, moderation, createdAt, sourceUrl, the image (only a missing
 * image is fetched from the source) and everything users added (ratings,
 * comments, favourites, cook counts and photos, collections, views).
 *
 * Ingredients and units are resolved first (new catalogue entries stay even
 * if the write fails); the recipe itself is replaced in one transaction.
 * Nutrition is recalculated afterwards from the new ingredient rows.
 */
export async function replaceImportedRecipe(
    db: PrismaClient,
    recipeId: string,
    data: AnalyzedRecipe,
    options?: {
        /** Recalculates nutrition after the write (default: updateRecipeNutrition) */
        updateNutrition?: (recipeId: string, servings: number) => Promise<unknown>;
    },
): Promise<{ id: string; imageAdded: boolean; warnings: string[] }> {
    const current = await db.recipe.findUniqueOrThrow({
        where: { id: recipeId },
        select: { id: true, imageKey: true },
    });
    const prepared = await prepareImportedRecipe(data);

    let imageKey: string | null = null;
    if (!current.imageKey) {
        const uploaded = await uploadImportImage(data.imageUrl);
        if (uploaded) imageKey = await approveImportImage(uploaded, recipeId);
    }

    const fields = importedRecipeFields(data);
    await db.$transaction(async (tx) => {
        await tx.recipeIngredient.deleteMany({ where: { recipeId } });
        await tx.recipeTag.deleteMany({ where: { recipeId } });
        await tx.recipeCategory.deleteMany({ where: { recipeId } });
        await tx.recipe.update({
            where: { id: recipeId },
            data: {
                ...fields,
                ...(imageKey ? { imageKey } : {}),
                flowNodes: prepared.flowNodes,
                flowEdges: prepared.flowEdges,
                recipeIngredients: { create: prepared.ingredientRows },
            },
        });
        await linkImportedCategories(tx, recipeId, data.categoryIds ?? []);
        await linkImportedTags(tx, recipeId, data.tags ?? []);
    });

    const updateNutrition =
        options?.updateNutrition ??
        (async (id: string, servings: number) => {
            const { updateRecipeNutrition } =
                await import('@app/lib/nutrition/update-recipe-nutrition');
            return updateRecipeNutrition(id, servings);
        });
    // The recipe is written at this point; a failed recalculation is reported, not thrown
    const warnings: string[] = [];
    try {
        await updateNutrition(recipeId, fields.servings);
    } catch (error) {
        warnings.push(
            `Nährwerte nicht neu berechnet: ${error instanceof Error ? error.message : String(error)}`,
        );
    }

    return { id: recipeId, imageAdded: imageKey !== null, warnings };
}
