import { NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';
import { parseRecipeFilterParams } from '@app/lib/recipeFilters';
import { queryRecipes } from '@app/lib/recipeSearch';
import { parseRecipeSearchContext } from '@app/lib/recipeSearchQuery';
import { createLogger } from '@shared/logger';

const log = createLogger('filter');

export async function GET(request: NextRequest) {
    log.debug('Filter request received', { url: request.url });

    try {
        const session = await getServerAuthSession('api/recipes/filter');
        const params = new URL(request.url).searchParams;
        const filters = parseRecipeFilterParams(params);
        // Hidden base filter of the week selection dialog (KUC-126)
        const context = parseRecipeSearchContext(params);
        const result = await queryRecipes(filters, session?.user?.id, context);
        return NextResponse.json(result);
    } catch (error) {
        log.error('Filter request failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Fehler beim Laden der Rezepte' }, { status: 500 });
    }
}
