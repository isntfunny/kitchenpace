/**
 * Shared import pipeline — AI analysis + DB save.
 * Accepts a PrismaClient as parameter so it works from both
 * Next.js server actions and the CLI.
 */

import type { PrismaClient } from '@prisma/client';

import { createIngredient, findOrCreateUnit } from '@app/components/recipe/ingredientActions';
import { generateUniqueSlug } from '@app/lib/slug';

import { importRecipeFromMarkdown } from './openai-client';
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

async function logImportRun(db: PrismaClient, data: ImportRunData): Promise<void> {
    let userId = data.userId;

    // Falls keine userId, versuche System-User zu finden
    if (!userId) {
        const systemUser = await db.user.findFirst({
            where: { role: 'ADMIN' },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
        });
        if (systemUser) {
            userId = systemUser.id;
        } else {
            // Fallback: erste User nehmen die es gibt
            const anyUser = await db.user.findFirst({
                orderBy: { createdAt: 'asc' },
                select: { id: true },
            });
            if (anyUser) {
                userId = anyUser.id;
            } else {
                console.warn('[logImportRun] Kein User gefunden, ImportRun wird nicht geloggt');
                return;
            }
        }
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

    // Fetch context data in parallel — gives the AI existing tags & ingredient names
    const [allTags, topIngredients] = await Promise.all([
        db.tag.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
        db.ingredient.findMany({
            select: { name: true },
            orderBy: { recipes: { _count: 'desc' } },
            take: 100,
        }),
    ]);

    const result = await importRecipeFromMarkdown(markdown, sourceUrl, {
        model: 'gpt-5.4',
        temperature: 0.1,
        context: {
            availableTags: allTags.map((t) => t.name),
            topIngredients: topIngredients.map((i) => i.name),
        },
    });

    if (!result.success) {
        console.error('AI analysis failed:', result.error);
        await logImportRun(db, {
            userId,
            sourceUrl,
            markdownLength: markdown.length,
            status: 'FAILED',
            errorType: result.error.type,
            errorMessage: result.error.message,
        });
        throw new Error(`KI-Analyse fehlgeschlagen: ${result.error.message}`);
    }

    // Log the successful AI run (fire-and-forget — don't block the response)
    const { metadata } = result;
    logImportRun(db, {
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
    };
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
    db: PrismaClient,
    data: AnalyzedRecipe,
    authorId: string,
    options?: { publish?: boolean },
): Promise<{ id: string; slug: string }> {
    if (!data.title?.trim()) {
        throw new Error('Bitte gib einen Rezepttitel ein.');
    }
    if (!data.ingredients?.length) {
        throw new Error('Das Rezept muss mindestens eine Zutat haben.');
    }

    // Find or create ingredients + resolve units
    const syncedIngredients: ((typeof data.ingredients)[number] & {
        ingredientId: string;
        unitId: string;
    })[] = [];
    for (const ing of data.ingredients) {
        const [ingredient, unitId] = await Promise.all([
            createIngredient(ing.name),
            findOrCreateUnit(ing.unit),
        ]);
        syncedIngredients.push({ ...ing, ingredientId: ingredient.id, unitId });
    }

    // Deduplicate by ingredientId — AI can generate the same ingredient multiple times
    const seenIngredientIds = new Set<string>();
    const uniqueIngredients = syncedIngredients.filter((ing) => {
        if (!ing.ingredientId || seenIngredientIds.has(ing.ingredientId)) return false;
        seenIngredientIds.add(ing.ingredientId);
        return true;
    });

    // Download and upload external image to S3 (if provided)
    let imageKey: string | undefined;
    if (data.imageUrl) {
        const imgResult = await uploadImageFromUrl(data.imageUrl);
        if (imgResult.success) {
            imageKey = imgResult.key;
        } else {
            console.warn('[saveImportedRecipe] Image upload failed:', imgResult.error);
        }
    }

    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await db.recipe.findUnique({ where: { slug: s } });
        return !!existing;
    });

    const recipe = await db.recipe.create({
        data: {
            title: data.title,
            slug,
            description: data.description || '',
            imageKey: imageKey ?? null,
            servings: data.servings ?? 4,
            prepTime: data.prepTime ?? 0,
            cookTime: data.cookTime ?? 0,
            totalTime: (data.prepTime ?? 0) + (data.cookTime ?? 0),
            difficulty: data.difficulty ?? 'MEDIUM',
            status: options?.publish ? 'PUBLISHED' : 'DRAFT',
            publishedAt: options?.publish ? new Date() : null,
            sourceUrl: data.sourceUrl ?? null,
            authorId,
            flowNodes: data.flowNodes as unknown as object,
            flowEdges: data.flowEdges as unknown as object,
            recipeIngredients: {
                create: uniqueIngredients.map((ing, index) => ({
                    ingredientId: ing.ingredientId,
                    unitId: ing.unitId,
                    amount: ing.amount,
                    notes: ing.notes ?? null,
                    isOptional: ing.isOptional,
                    position: index,
                })),
            },
        },
    });

    if (data.categoryIds?.length) {
        const categories = await db.category.findMany({
            where: { id: { in: data.categoryIds } },
            select: { id: true },
        });
        const validEntries = categories.map((c, index) => ({
            recipeId: recipe.id,
            categoryId: c.id,
            position: index,
        }));
        if (validEntries.length) {
            await db.recipeCategory.createMany({ data: validEntries });
        }
    }

    // Find or create tags
    if (data.tags?.length) {
        const uniqueTagNames = [...new Set(data.tags)];
        const tags: { id: string }[] = [];
        for (const name of uniqueTagNames) {
            const tagSlug = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            const existing = await db.tag.findFirst({
                where: { OR: [{ slug: tagSlug }, { name: { equals: name, mode: 'insensitive' } }] },
            });
            const tag = existing ?? (await db.tag.create({ data: { name, slug: tagSlug } }));
            tags.push(tag);
        }

        await db.recipeTag.createMany({
            data: tags.map((tag) => ({ recipeId: recipe.id, tagId: tag.id })),
            skipDuplicates: true,
        });
    }

    return { id: recipe.id, slug: recipe.slug };
}
