import { NextResponse } from 'next/server';

import { bulkDeleteRecipes } from '@app/components/recipe/createActions';
import { getServerAuthSession } from '@app/lib/auth';

export async function POST(request: Request) {
    const session = await getServerAuthSession('api/recipes/bulk-delete');

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    try {
        const { recipeIds } = await request.json();

        if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
            return NextResponse.json({ error: 'Keine Rezept-IDs angegeben' }, { status: 400 });
        }

        const result = await bulkDeleteRecipes(recipeIds, session.user.id);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error('Bulk delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
