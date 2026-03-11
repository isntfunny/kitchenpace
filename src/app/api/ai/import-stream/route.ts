import { NextRequest } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';
import { streamRecipeFromMarkdown } from '@app/lib/importer/openai-client';
import { transformImportedRecipe } from '@app/lib/importer/transform';
import { prisma } from '@shared/prisma';

// Allow streaming responses up to 5 minutes
export const maxDuration = 300;

export async function POST(request: NextRequest) {
    const session = await getServerAuthSession('api/ai/import-stream');
    const userId = session?.user?.id ?? null;

    let body: { markdown?: string; sourceUrl?: string };
    try {
        body = await request.json();
    } catch {
        return new Response('{"error":"Invalid JSON"}', { status: 400 });
    }

    const { markdown, sourceUrl = '' } = body;

    if (!markdown || typeof markdown !== 'string' || !markdown.trim()) {
        return new Response(
            `data: ${JSON.stringify({ type: 'error', message: 'markdown ist erforderlich' })}\n\n`,
            { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
        );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                // Fetch DB context — gives the AI existing tags & ingredient names
                const [allTags, topIngredients] = await Promise.all([
                    prisma.tag.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
                    prisma.ingredient.findMany({
                        select: { name: true },
                        orderBy: { recipes: { _count: 'desc' } },
                        take: 100,
                    }),
                ]);

                send({ type: 'start', model: 'gpt-5.4' });

                const result = await streamRecipeFromMarkdown(
                    markdown,
                    sourceUrl,
                    {
                        model: 'gpt-5.4',
                        temperature: 0.1,
                        context: {
                            availableTags: allTags.map((t) => t.name),
                            topIngredients: topIngredients.map((i) => i.name),
                        },
                    },
                    (text) => send({ type: 'delta', text }),
                );

                if (!result.success) {
                    if (userId) {
                        prisma.importRun
                            .create({
                                data: {
                                    userId,
                                    sourceUrl: sourceUrl || null,
                                    sourceType: sourceUrl ? 'url' : 'text',
                                    markdownLength: markdown.length,
                                    status: 'FAILED',
                                    errorType: result.error.type,
                                    errorMessage: result.error.message,
                                },
                            })
                            .catch((err: unknown) => console.error('ImportRun log failed:', err));
                    }
                    send({
                        type: 'error',
                        message: result.error.message,
                        errorType: result.error.type,
                    });
                    return;
                }

                const { metadata } = result;

                send({
                    type: 'usage',
                    inputTokens: metadata.inputTokens,
                    cachedInputTokens: metadata.cachedInputTokens,
                    outputTokens: metadata.outputTokens,
                    estimatedCostUsd: metadata.estimatedCostUsd,
                });

                if (userId) {
                    prisma.importRun
                        .create({
                            data: {
                                userId,
                                sourceUrl: sourceUrl || null,
                                sourceType: sourceUrl ? 'url' : 'text',
                                markdownLength: markdown.length,
                                status: 'SUCCESS',
                                model: metadata.model,
                                inputTokens: metadata.inputTokens,
                                cachedInputTokens: metadata.cachedInputTokens,
                                outputTokens: metadata.outputTokens,
                                estimatedCostUsd: metadata.estimatedCostUsd,
                                rawApiResponse: metadata.rawApiResponse as object,
                            },
                        })
                        .catch((err: unknown) => console.error('ImportRun log failed:', err));
                }

                send({ type: 'done', data: transformImportedRecipe(result.data) });
            } catch (err) {
                send({
                    type: 'error',
                    message: err instanceof Error ? err.message : 'Interner Serverfehler',
                });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}
