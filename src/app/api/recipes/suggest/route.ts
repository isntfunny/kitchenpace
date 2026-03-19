import { NextRequest, NextResponse } from 'next/server';

import {
    buildSuggestQuery,
    getRecipeCounts,
    opensearchClient,
    OPENSEARCH_INGREDIENTS_INDEX,
    OPENSEARCH_TAGS_INDEX,
} from '@shared/opensearch/client';

type SuggestResult = { name: string; count: number };

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const field = searchParams.get('field'); // 'tags' | 'ingredients'

    if (!query || query.length < 2 || !field) {
        return NextResponse.json({ results: [] });
    }

    try {
        if (field === 'ingredients' || field === 'tags') {
            const index =
                field === 'ingredients' ? OPENSEARCH_INGREDIENTS_INDEX : OPENSEARCH_TAGS_INDEX;

            const { body } = await opensearchClient.search({
                index,
                body: {
                    query: buildSuggestQuery(query),
                    size: 20,
                    _source: ['name'],
                },
            });

            const names = (body.hits?.hits ?? [])
                .map((hit: { _source?: { name?: string } }) => hit._source?.name)
                .filter((name: string | undefined): name is string => Boolean(name));

            const countMap = await getRecipeCounts(names, field);

            const results: SuggestResult[] = names
                .map((name: string) => ({ name, count: countMap.get(name) ?? 0 }))
                .sort((a, b) => b.count - a.count);

            return NextResponse.json({ results });
        }

        return NextResponse.json({ results: [] });
    } catch {
        return NextResponse.json({ results: [] }, { status: 500 });
    }
}
