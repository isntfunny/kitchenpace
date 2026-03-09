import { NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';
import { generateLaneGrid } from '@app/lib/importer/lane-grid-ai';

/**
 * POST /api/ai/analyze-lane-grid
 *
 * Analyzes recipe text and returns a LaneGrid structure
 * for the LaneWizard component.
 */
export async function POST(request: NextRequest) {
    const session = await getServerAuthSession('api/ai/analyze-lane-grid');
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { text } = await request.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        if (text.length > 10_000) {
            return NextResponse.json({ error: 'Text too long (max 10000 chars)' }, { status: 400 });
        }

        const result = await generateLaneGrid(text);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 422 });
        }

        return NextResponse.json({
            laneGrid: result.data.laneGrid,
            title: result.data.title,
            ingredients: result.data.ingredients,
        });
    } catch (error) {
        console.error('Lane grid AI error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
