import { NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';
import { importRecipeFromMarkdown } from '@app/lib/importer/openai-client';
import { prisma } from '@shared/prisma';

/**
 * POST /api/ai/analyze-recipe
 *
 * Analyzes recipe text using OpenAI and returns structured data
 * for the Flow Editor AI conversion dialog.
 *
 * Response shape matches AIAnalysisResult in ai-text-analysis.ts.
 */
export async function POST(request: NextRequest) {
    const session = await getServerAuthSession('api/ai/analyze-recipe');
    const userId = session?.user?.id ?? null;

    try {
        const body = await request.json();
        const { text } = body;

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        if (text.length > 10_000) {
            return NextResponse.json(
                { error: 'Text too long (max 10000 characters)' },
                { status: 400 },
            );
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

        const result = await importRecipeFromMarkdown(text, 'text-input', {
            model: 'gpt-5.4',
            temperature: 0.1,
            context: {
                availableTags: allTags.map((t) => t.name),
                topIngredients: topIngredients.map((i) => i.name),
            },
        });

        if (!result.success) {
            if (userId) {
                prisma.importRun.create({
                    data: {
                        userId,
                        sourceType: 'text',
                        markdownLength: text.length,
                        status: 'FAILED',
                        errorType: result.error.type,
                        errorMessage: result.error.message,
                    },
                }).catch((err: unknown) => console.error('ImportRun log failed:', err));
            }
            return NextResponse.json(
                { error: result.error.message, errorType: result.error.type },
                { status: 422 },
            );
        }

        // Log successful AI run (fire-and-forget)
        if (userId) {
            const { metadata } = result;
            prisma.importRun.create({
                data: {
                    userId,
                    sourceType: 'text',
                    markdownLength: text.length,
                    status: 'SUCCESS',
                    model: metadata.model,
                    inputTokens: metadata.inputTokens,
                    cachedInputTokens: metadata.cachedInputTokens,
                    outputTokens: metadata.outputTokens,
                    estimatedCostUsd: metadata.estimatedCostUsd,
                    rawApiResponse: metadata.rawApiResponse as object,
                },
            }).catch((err: unknown) => console.error('ImportRun log failed:', err));
        }

        const difficultyMap: Record<string, 'EASY' | 'MEDIUM' | 'HARD'> = {
            Einfach: 'EASY',
            Mittel: 'MEDIUM',
            Schwer: 'HARD',
        };

        const data = {
            title: result.data.title,
            description: result.data.description,
            servings: result.data.servings,
            prepTime: result.data.prepTime,
            cookTime: result.data.cookTime,
            difficulty: difficultyMap[result.data.difficulty] ?? 'MEDIUM',
            tags: result.data.tags,
            ingredients: result.data.ingredients.map((ing) => ({
                name: ing.name,
                amount: ing.amount != null ? String(ing.amount) : '',
                unit: ing.unit ?? 'Stück',
                isOptional: false,
            })),
            // No position set — Dagre handles layout in FlowEditor
            flowNodes: result.data.flowNodes.map((node) => ({
                id: node.id,
                type: node.type,
                label: node.label,
                description: node.description,
                duration: node.duration ?? undefined,
                ingredientIds: node.ingredientIds,
            })),
            flowEdges: result.data.flowEdges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
            })),
        };

        return NextResponse.json({ data });
    } catch (error) {
        console.error('AI analysis error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
