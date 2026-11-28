/**
 * Shared import pipeline — AI analysis + DB save.
 * Accepts a PrismaClient as parameter so it works from both
 * Next.js server actions and the CLI.
 */

import { randomUUID } from 'node:crypto';

import type { Prisma, PrismaClient } from '@prisma/client';

import { createIngredient, findOrCreateUnit } from '@app/components/recipe/ingredientActions';
import { applyFlowPositions } from '@app/lib/flow-layout';
import { assertResolvedMentions } from '@app/lib/ingredients/recipe-mentions';
import { generateUniqueSlug } from '@app/lib/slug';
import { AI_TEXT_MODEL } from '@shared/ai-models';
import { pickListedTags, TAG_NAMES_SORTED } from '@shared/tags/tag-list';

import { bindImportedFlow } from './import-flow-binding';
import { describeParseError, importRecipeFromMarkdown } from './openai-client';
import { type AnalyzedRecipe, transformImportedRecipe } from './transform';

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

/** Finds or creates a catalogue ingredient by name (default: createIngredient). */
export type ResolveIngredient = (name: string) => Promise<{ id: string }>;

/**
 * Finds or creates the catalogue ingredients and units, binds the AI's
 * mentions to the new RecipeIngredient ids and checks that every mention
 * resolves. Runs before the recipe write (ingredient creation uses its own
 * connection and enqueues the enrichment, KUC-94/114).
 */
export async function prepareImportedRecipe(
    data: AnalyzedRecipe,
    resolveIngredient: ResolveIngredient = createIngredient,
): Promise<PreparedImport> {
    if (!data.title?.trim()) {
        throw new Error('Bitte gib einen Rezepttitel ein.');
    }
    if (!data.ingredients?.length) {
        throw new Error('Das Rezept muss mindestens eine Zutat haben.');
    }

    // Find or create ingredients + resolve units
    const rows: PreparedImport['ingredientRows'] = [];
    for (const [index, ing] of data.ingredients.entries()) {
        const [ingredient, unitId] = await Promise.all([
            resolveIngredient(ing.name),
            findOrCreateUnit(ing.unit),
        ]);
        rows.push({
            id: randomUUID(),
            sourceId: ing.id,
            ingredientId: ingredient.id,
            unitId,
            amount: ing.amount,
            notes: ing.notes ?? null,
            isOptional: ing.isOptional,
            position: index,
        });
    }

    // Pure id mapping: the AI's display text ("Zwiebeln") and partial amounts stay.
    const resolvedFlow = bindImportedFlow(data, new Map(rows.map((row) => [row.sourceId, row.id])));
    assertResolvedMentions(resolvedFlow.issues);

    return {
        ingredientRows: rows,
        flowNodes: applyFlowPositions(resolvedFlow.nodes, data.flowEdges) as unknown as object,
        flowEdges: data.flowEdges as unknown as object,
    };
}

/** Category ids for the AI's category slugs, in their order; unknown slugs are dropped. */
async function resolveCategoryIds(db: Db, categorySlugs: string[]): Promise<string[]> {
    if (!categorySlugs.length) return [];
    const categories = await db.category.findMany({
        where: { slug: { in: categorySlugs } },
        select: { id: true, slug: true },
    });
    const slugToId = new Map(categories.map((c) => [c.slug, c.id]));
    return [...new Set(categorySlugs.map((slug) => slugToId.get(slug)).filter((id) => id != null))];
}

/** Tag ids for the AI's tags: only tags from the fixed list (KUC-116), created if missing. */
export async function resolveListedTagIds(db: Db, tagNames: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const listed of pickListedTags(tagNames)) {
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
        ids.push(tag.id);
    }
    return [...new Set(ids)];
}

async function linkCategoryIds(db: Db, recipeId: string, categoryIds: string[]) {
    if (!categoryIds.length) return;
    await db.recipeCategory.createMany({
        data: categoryIds.map((categoryId, position) => ({ recipeId, categoryId, position })),
        skipDuplicates: true,
    });
}

async function linkTagIds(db: Db, recipeId: string, tagIds: string[]) {
    if (!tagIds.length) return;
    await db.recipeTag.createMany({
        data: tagIds.map((tagId) => ({ recipeId, tagId })),
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

/** Interactive transactions of the bulk paths: room for big recipes on a busy pool. */
export const BULK_TRANSACTION_OPTIONS = { timeout: 60_000, maxWait: 10_000 } as const;

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

    // Images of external sources are never taken over (rights): an imported recipe has no image.
    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await db.recipe.findUnique({ where: { slug: s } });
        return !!existing;
    });

    const recipe = await db.recipe.create({
        data: {
            ...importedRecipeFields(data),
            slug,
            status: options?.publish ? 'PUBLISHED' : 'DRAFT',
            publishedAt: options?.publish ? new Date() : null,
            sourceUrl: data.sourceUrl ?? null,
            authorId,
            flowNodes: prepared.flowNodes,
            flowEdges: prepared.flowEdges,
            recipeIngredients: { create: prepared.ingredientRows },
        },
    });

    await linkCategoryIds(db, recipe.id, await resolveCategoryIds(db, data.categoryIds ?? []));
    await linkTagIds(db, recipe.id, await resolveListedTagIds(db, data.tags ?? []));

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
 * Ingredients, units, categories and tags are resolved first (new catalogue
 * entries stay even if the write fails); the recipe itself is replaced in one
 * short transaction. `onCommitted` runs right after that transaction, before
 * anything slow, so a caller can record the write even if the process is
 * stopped afterwards. A fetched image is moved to approved/ only then;
 * nutrition is recalculated last. Problems after the commit become warnings.
 */
export async function replaceImportedRecipe(
    db: PrismaClient,
    recipeId: string,
    data: AnalyzedRecipe,
    options?: {
        /** Recalculates nutrition after the write (default: updateRecipeNutrition) */
        updateNutrition?: (recipeId: string, servings: number) => Promise<unknown>;
        /** Catalogue lookup/creation, e.g. cached over a whole run (default: createIngredient) */
        resolveIngredient?: ResolveIngredient;
        /** Runs right after the transaction committed (e.g. a progress log line), with what was written */
        onCommitted?: (written: {
            title: string;
            ingredientCount: number;
            flowEdges: unknown;
        }) => void | Promise<void>;
    },
): Promise<{ id: string; warnings: string[] }> {
    await db.recipe.findUniqueOrThrow({ where: { id: recipeId }, select: { id: true } });
    const prepared = await prepareImportedRecipe(data, options?.resolveIngredient);
    const categoryIds = await resolveCategoryIds(db, data.categoryIds ?? []);
    const tagIds = await resolveListedTagIds(db, data.tags ?? []);

    const fields = importedRecipeFields(data);
    await db.$transaction(async (tx) => {
        await tx.recipeIngredient.deleteMany({ where: { recipeId } });
        await tx.recipeTag.deleteMany({ where: { recipeId } });
        await tx.recipeCategory.deleteMany({ where: { recipeId } });
        await tx.recipe.update({
            where: { id: recipeId },
            data: { ...fields, flowNodes: prepared.flowNodes, flowEdges: prepared.flowEdges },
        });
        await tx.recipeIngredient.createMany({
            data: prepared.ingredientRows.map((row) => ({ ...row, recipeId })),
        });
        await linkCategoryIds(tx, recipeId, categoryIds);
        await linkTagIds(tx, recipeId, tagIds);
    }, BULK_TRANSACTION_OPTIONS);
    await options?.onCommitted?.({
        title: fields.title,
        ingredientCount: prepared.ingredientRows.length,
        flowEdges: prepared.flowEdges,
    });

    // The recipe is written at this point; later problems are reported, not thrown
    const warnings: string[] = [];
    const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

    const updateNutrition =
        options?.updateNutrition ??
        (async (id: string, servings: number) => {
            const { updateRecipeNutrition } =
                await import('@app/lib/nutrition/update-recipe-nutrition');
            return updateRecipeNutrition(id, servings);
        });
    try {
        await updateNutrition(recipeId, fields.servings);
    } catch (error) {
        warnings.push(`Nährwerte nicht neu berechnet: ${reason(error)}`);
    }

    return { id: recipeId, warnings };
}
