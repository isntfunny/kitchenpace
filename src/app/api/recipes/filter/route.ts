import { NextRequest, NextResponse } from 'next/server';

import { parseRecipeFilterParams } from '@app/lib/recipeFilters';
import { queryRecipes } from '@app/lib/recipeSearch';
import { createLogger } from '@shared/logger';

const log = createLogger('filter');

export async function GET(request: NextRequest) {
    log.debug('Filter request received', { url: request.url });

    try {
        const filters = parseRecipeFilterParams(new URL(request.url).searchParams);
        const result = await queryRecipes(filters);
        return NextResponse.json(result);
    } catch (error) {
        log.error('Filter request failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Fehler beim Laden der Rezepte' }, { status: 500 });
    }
}
