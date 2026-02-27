import { NextResponse } from 'next/server';

import { bulkUpdateRecipeStatus } from '@/components/recipe/createActions';
import { getServerAuthSession } from '@/lib/auth';

export async function POST(request: Request) {
    const session = await getServerAuthSession('api/recipes/bulk-status');

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    try {
        const { recipeIds, status } = await request.json();

        if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
            return NextResponse.json({ error: 'Keine Rezept-IDs angegeben' }, { status: 400 });
        }

        if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
            return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });
        }

        const result = await bulkUpdateRecipeStatus(recipeIds, status, session.user.id);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            updatedCount: result.updatedCount,
        });
    } catch (error) {
        console.error('Bulk status update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
