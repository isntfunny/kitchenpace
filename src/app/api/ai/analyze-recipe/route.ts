import { NextRequest, NextResponse } from 'next/server';

import { analyzeWithAI } from '@app/app/recipe/create/import/actions';
import { getServerAuthSession } from '@app/lib/auth';

/**
 * POST /api/ai/analyze-recipe
 *
 * Analyzes recipe text using OpenAI and returns structured data
 * for the Flow Editor AI conversion dialog.
 *
 * Delegates to analyzeWithAI (same code path as the full importer)
 * so resolveIngredientMentions and ImportRun logging are included.
 */
export async function POST(request: NextRequest) {
    const session = await getServerAuthSession('api/ai/analyze-recipe');
    const userId = session?.user?.id ?? undefined;

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

        const result = await analyzeWithAI(text, '', userId);

        const data = {
            title: result.title,
            description: result.description,
            categorySlug: result.categoryIds[0] ?? 'hauptgericht',
            tags: result.tags,
            servings: result.servings,
            prepTime: result.prepTime,
            cookTime: result.cookTime,
            difficulty: result.difficulty,
            ingredients: result.ingredients,
            flowNodes: result.flowNodes,
            flowEdges: result.flowEdges,
        };

        return NextResponse.json({ data });
    } catch (error) {
        console.error('AI analysis error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
