'use server';

/**
 * Server Actions für den Rezept-Import Workflow
 *
 * Workflow:
 * 1. URL → Scrapling Container (HTTP direkt) → Markdown
 * 2. Markdown → OpenAI (importRecipeFromMarkdown) → ImportedRecipe
 * 3. Transform → AnalyzedRecipe + in DB speichern
 */

import { importRecipeFromMarkdown } from '@app/lib/importer/openai-client';
import type { ImportedRecipe } from '@app/lib/importer/openai-recipe-schema';
import { generateUniqueSlug } from '@app/lib/slug';
import { prisma } from '@shared/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ScrapedContent {
    url: string;
    markdown: string;
    title?: string;
    description?: string;
    imageUrl?: string;
}

export interface AnalyzedRecipe {
    title: string;
    description: string;
    imageUrl?: string;
    servings?: number;
    prepTime?: number;
    cookTime?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    categoryIds: string[];
    /** Tag names from the AI — existing tags will be matched, new ones created */
    tags: string[];
    ingredients: {
        name: string;
        amount: string;
        unit: string;
        notes?: string;
        isOptional: boolean;
    }[];
    flowNodes: FlowNodeInput[];
    flowEdges: FlowEdgeInput[];
}

export interface FlowNodeInput {
    id: string;
    type: string;
    label: string;
    description: string;
    duration?: number;
    ingredientIds?: string[];
    photoKey?: string;
    photoUrl?: string;
    // NOTE: No position — Dagre handles layout
}

export interface FlowEdgeInput {
    id: string;
    source: string;
    target: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const SCRAPLER_BASE_URL = process.env.SCRAPLER_URL || 'http://localhost:64001';
const SCRAPLER_TIMEOUT_MS = 120_000;

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: URL scrapen
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ruft den Scrapling-Dienst direkt auf und gibt Markdown zurück.
 * Server Action → kein Next.js API Route Umweg nötig.
 */
export async function scrapeRecipe(url: string): Promise<ScrapedContent> {
    try {
        new URL(url);
    } catch {
        throw new Error('Ungültige URL. Bitte gib eine vollständige URL ein.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCRAPLER_TIMEOUT_MS);

    try {
        const response = await fetch(`${SCRAPLER_BASE_URL}/api/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                mode: 'stealthy-fetch',
                timeout: 90,
                wait_for_network_idle: true,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const body = await response.text();
            console.error('Scraping failed:', response.status, body);

            if (response.status === 404) {
                throw new Error('Rezept nicht gefunden. Bitte URL prüfen.');
            }
            if (response.status === 429) {
                throw new Error('Zu viele Anfragen. Bitte später erneut versuchen.');
            }
            throw new Error(
                `Scraping fehlgeschlagen (${response.status}). Bitte eine andere URL versuchen.`,
            );
        }

        const data = await response.json();

        return {
            url,
            markdown: data.markdown || '',
            title: data.title,
            description: data.description,
            imageUrl: data.image_url,
        };
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error('Zeitüberschreitung beim Laden der Seite. Bitte erneut versuchen.');
            }
            throw error;
        }

        throw new Error('Scraping fehlgeschlagen. Bitte URL prüfen und erneut versuchen.');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Markdown analysieren (OpenAI)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sendet gescrapptes Markdown an OpenAI (via importRecipeFromMarkdown) und
 * transformiert das Ergebnis in das AnalyzedRecipe-Format.
 *
 * @param markdown - Scraped markdown content
 * @param sourceUrl - Origin URL (empty string for pasted text)
 * @param userId - When provided an ImportRun audit record is created
 */
export async function analyzeWithAI(
    markdown: string,
    sourceUrl = '',
    userId?: string,
): Promise<AnalyzedRecipe> {
    if (!markdown.trim()) {
        throw new Error('Kein Inhalt zum Analysieren vorhanden.');
    }

    if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not set — using fallback parser');
        if (userId) {
            await logImportRun({
                userId,
                sourceUrl,
                markdownLength: markdown.length,
                status: 'FALLBACK',
                errorMessage: 'OPENAI_API_KEY not configured',
            });
        }
        return parseRecipeMarkdownFallback(markdown);
    }

    // Fetch context data in parallel — gives the AI existing tags & ingredient names
    const [allTags, topIngredients] = await Promise.all([
        prisma.tag.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
        prisma.ingredient.findMany({
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
        if (userId) {
            await logImportRun({
                userId,
                sourceUrl,
                markdownLength: markdown.length,
                status: 'FAILED',
                errorType: result.error.type,
                errorMessage: result.error.message,
            });
        }
        // Soft fallback on validation errors so the user can still edit
        return parseRecipeMarkdownFallback(markdown);
    }

    // Log the successful AI run (fire-and-forget — don't block the response)
    if (userId) {
        const { metadata } = result;
        logImportRun({
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
    }

    return transformImportedRecipe(result.data);
}

// ─────────────────────────────────────────────────────────────────────────────
// ImportRun logging
// ─────────────────────────────────────────────────────────────────────────────

interface ImportRunData {
    userId: string;
    sourceUrl?: string;
    markdownLength?: number;
    status: 'SUCCESS' | 'FALLBACK' | 'FAILED';
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

async function logImportRun(data: ImportRunData): Promise<void> {
    await prisma.importRun.create({
        data: {
            userId: data.userId,
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
            rawApiResponse: data.rawApiResponse
                ? (data.rawApiResponse as object)
                : undefined,
        },
    });
}

/**
 * Wandelt das OpenAI-validierte ImportedRecipe in unser AnalyzedRecipe-Format um.
 */
function transformImportedRecipe(data: ImportedRecipe): AnalyzedRecipe {
    const difficultyMap: Record<string, 'EASY' | 'MEDIUM' | 'HARD'> = {
        Einfach: 'EASY',
        Mittel: 'MEDIUM',
        Schwer: 'HARD',
    };

    return {
        title: data.title,
        description: data.description,
        servings: data.servings,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        difficulty: difficultyMap[data.difficulty] ?? 'MEDIUM',
        categoryIds: [categoryToSlug(data.category)],
        tags: data.tags,
        ingredients: data.ingredients.map((ing) => ({
            name: ing.name,
            amount: ing.amount != null ? String(ing.amount) : '',
            unit: ing.unit ?? 'Stück',
            isOptional: false,
        })),
        flowNodes: data.flowNodes.map((node) => ({
            id: node.id,
            type: node.type,
            label: node.label,
            description: node.description,
            duration: node.duration ?? undefined,
            ingredientIds: node.ingredientIds,
        })),
        flowEdges: data.flowEdges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
        })),
    };
}

/** Maps AI category name → DB slug */
function categoryToSlug(category: string): string {
    const map: Record<string, string> = {
        Hauptgericht: 'hauptgericht',
        Beilage: 'beilage',
        Backen: 'backen',
        Dessert: 'dessert',
        Frühstück: 'fruehstueck',
        Getränk: 'getraenk',
        Vorspeise: 'vorspeise',
        Salat: 'salat',
    };
    return map[category] ?? 'hauptgericht';
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Parser (wenn keine KI verfügbar)
// ─────────────────────────────────────────────────────────────────────────────

function parseRecipeMarkdownFallback(markdown: string): AnalyzedRecipe {
    const lines = markdown.split('\n').filter((l) => l.trim());

    const titleLine = lines.find((l) => l.startsWith('#'));
    const title = titleLine ? titleLine.replace(/^#+\s*/, '').trim() : 'Unbenanntes Rezept';

    // Description: non-list text after title before first list/heading
    const descLines: string[] = [];
    let pastTitle = false;
    for (const line of lines) {
        if (line.startsWith('#')) {
            if (!pastTitle) { pastTitle = true; continue; }
            break;
        }
        if (pastTitle && !line.startsWith('-') && !line.startsWith('*') && !/^\d+\./.test(line)) {
            descLines.push(line.trim());
        }
    }
    const description = descLines.slice(0, 2).join(' ');

    // Ingredients: bullet list items
    const ingredients = lines
        .filter((l) => /^[-*]\s/.test(l))
        .slice(0, 15)
        .map((line) => {
            const text = line.replace(/^[-*]\s*/, '').trim();
            const match = text.match(/^([\d,./ ]+)\s*([a-zA-ZäöüÄÖÜß]+)?\s*/);
            return {
                name: text.replace(/^[\d,./ ]+[a-zA-ZäöüÄÖÜß]*\s*/, '').trim() || text,
                amount: match?.[1]?.trim() ?? '',
                unit: match?.[2]?.trim() ?? 'Stück',
                isOptional: text.toLowerCase().includes('optional'),
            };
        });

    // Flow nodes: numbered steps
    const stepLines = lines.filter((l) => /^\d+\./.test(l)).slice(0, 10);

    const flowNodes: FlowNodeInput[] = [
        { id: 'start', type: 'start', label: "Los geht's!", description: 'Beginne mit der Zubereitung' },
        ...stepLines.map((line, idx) => ({
            id: `step-${idx + 1}`,
            type: idx === stepLines.length - 1 ? 'anrichten' : 'kochen',
            label: line.replace(/^\d+\.\s*/, '').slice(0, 50),
            description: line.replace(/^\d+\.\s*/, ''),
        })),
        { id: 'servieren', type: 'servieren', label: 'Servieren', description: 'Guten Appetit!' },
    ];

    const allIds = flowNodes.map((n) => n.id);
    const flowEdges: FlowEdgeInput[] = allIds.slice(0, -1).map((id, idx) => ({
        id: `edge-${idx}`,
        source: id,
        target: allIds[idx + 1],
    }));

    return {
        title,
        description,
        servings: 4,
        difficulty: 'MEDIUM',
        categoryIds: ['hauptgericht'],
        tags: [],
        ingredients,
        flowNodes,
        flowEdges,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Rezept speichern
// ─────────────────────────────────────────────────────────────────────────────

export async function saveImportedRecipe(
    data: AnalyzedRecipe,
    authorId: string,
): Promise<{ id: string; slug: string }> {
    if (!data.title?.trim()) {
        throw new Error('Bitte gib einen Rezepttitel ein.');
    }
    if (!data.ingredients?.length) {
        throw new Error('Das Rezept muss mindestens eine Zutat haben.');
    }

    // Find or create ingredients in parallel
    const syncedIngredients = await Promise.all(
        data.ingredients.map(async (ing) => {
            const normalizedName = ing.name.toLowerCase().trim();
            const existing = await prisma.ingredient.findFirst({
                where: {
                    OR: [
                        { name: { equals: normalizedName, mode: 'insensitive' } },
                        { slug: { equals: normalizedName.replace(/\s+/g, '-'), mode: 'insensitive' } },
                    ],
                },
            });

            if (existing) return { ...ing, ingredientId: existing.id };

            const created = await prisma.ingredient.create({
                data: {
                    name: ing.name,
                    slug: ing.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    units: ing.unit ? [ing.unit] : [],
                },
            });

            return { ...ing, ingredientId: created.id };
        }),
    );

    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await prisma.recipe.findUnique({ where: { slug: s } });
        return !!existing;
    });

    const recipe = await prisma.recipe.create({
        data: {
            title: data.title,
            slug,
            description: data.description || '',
            imageKey: data.imageUrl,
            servings: data.servings ?? 4,
            prepTime: data.prepTime ?? 0,
            cookTime: data.cookTime ?? 0,
            totalTime: (data.prepTime ?? 0) + (data.cookTime ?? 0),
            difficulty: data.difficulty ?? 'MEDIUM',
            status: 'DRAFT',
            authorId,
            flowNodes: data.flowNodes as unknown as object,
            flowEdges: data.flowEdges as unknown as object,
            recipeIngredients: {
                create: syncedIngredients.map((ing, index) => ({
                    ingredientId: ing.ingredientId,
                    amount: ing.amount,
                    unit: ing.unit,
                    notes: ing.notes ?? null,
                    isOptional: ing.isOptional,
                    position: index,
                })),
            },
        },
    });

    if (data.categoryIds?.length) {
        await prisma.recipeCategory.createMany({
            data: data.categoryIds.map((categoryId, index) => ({
                recipeId: recipe.id,
                categoryId,
                position: index,
            })),
        });
    }

    // Upsert tags (create if new, reuse if existing) then link to recipe
    if (data.tags?.length) {
        const tags = await Promise.all(
            data.tags.map((name) =>
                prisma.tag.upsert({
                    where: { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
                    create: {
                        name,
                        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    },
                    update: {},
                }),
            ),
        );

        await prisma.recipeTag.createMany({
            data: tags.map((tag) => ({ recipeId: recipe.id, tagId: tag.id })),
            skipDuplicates: true,
        });
    }

    return { id: recipe.id, slug: recipe.slug };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

/** Prüft ob der Scrapling-Dienst erreichbar ist. */
export async function checkScraplerHealth(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${SCRAPLER_BASE_URL}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}
