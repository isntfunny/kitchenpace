import { NextRequest, NextResponse } from 'next/server';

import {
    opensearchClient,
    OPENSEARCH_INDEX,
    OPENSEARCH_INGREDIENTS_INDEX,
    OPENSEARCH_TAGS_INDEX,
} from '@shared/opensearch/client';

type SuggestResult = { name: string; count: number };

/** Shared query shape for both tags and ingredients indices */
function buildSuggestQuery(query: string) {
    return {
        bool: {
            should: [
                { prefix: { 'name.keyword': { value: query, boost: 3 } } },
                { match: { name: { query, fuzziness: 'AUTO', prefix_length: 1 } } },
                { match: { keywords: { query, fuzziness: 'AUTO' } } },
                {
                    wildcard: {
                        'name.keyword': {
                            value: `*${query}*`,
                            case_insensitive: true,
                        },
                    },
                },
            ],
            minimum_should_match: 1,
        },
    };
}

/** Get recipe counts for matched names from a keyword field on the recipes index */
async function getRecipeCounts(
    names: string[],
    field: 'tags' | 'ingredients',
): Promise<Map<string, number>> {
    if (names.length === 0) return new Map();

    const { body } = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: {
            query: { term: { status: 'PUBLISHED' } },
            size: 0,
            aggs: {
                filtered: {
                    terms: { field, include: names, size: names.length },
                },
            },
        },
    });

    const agg = body.aggregations?.filtered as
        | { buckets?: Array<{ key: string; doc_count: number }> }
        | undefined;
    return new Map((agg?.buckets ?? []).map((b) => [b.key, b.doc_count]));
}

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
