import { NextResponse } from 'next/server';

import { updateRecipeStatus } from '@app/components/recipe/createActions';
import { getServerAuthSession } from '@app/lib/auth';

export async function POST(request: Request) {
    const session = await getServerAuthSession('api/recipes/publish');

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    try {
        const { recipeId } = await request.json();

        if (!recipeId) {
            return NextResponse.json({ error: 'Rezept-ID erforderlich' }, { status: 400 });
        }

        const result = await updateRecipeStatus(recipeId, 'PUBLISHED', session.user.id);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Publish error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
