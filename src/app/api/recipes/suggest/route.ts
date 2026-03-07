import { NextRequest, NextResponse } from 'next/server';

import { opensearchClient, OPENSEARCH_INDEX, OPENSEARCH_INGREDIENTS_INDEX } from '@shared/opensearch/client';

type SuggestResult = { name: string; count: number };

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const field = searchParams.get('field'); // 'tags' | 'ingredients'

    if (!query || query.length < 2 || !field) {
        return NextResponse.json({ results: [] });
    }

    try {
        if (field === 'ingredients') {
            // Search the dedicated ingredients index for name matches
            const { body } = await opensearchClient.search({
                index: OPENSEARCH_INGREDIENTS_INDEX,
                body: {
                    query: {
                        bool: {
                            should: [
                                { prefix: { 'name.keyword': { value: query, boost: 3 } } },
                                { match: { name: { query, fuzziness: 'AUTO', prefix_length: 1 } } },
                                { match: { keywords: { query, fuzziness: 'AUTO' } } },
                            ],
                            minimum_should_match: 1,
                        },
                    },
                    size: 20,
                    _source: ['name'],
                },
            });

            const names = (body.hits?.hits ?? [])
                .map((hit: { _source?: { name?: string } }) => hit._source?.name)
                .filter((name: string | undefined): name is string => Boolean(name));

            // Get counts from recipe index for these ingredient names
            const results: SuggestResult[] = names.map((name: string) => ({ name, count: 0 }));

            if (names.length > 0) {
                const { body: countBody } = await opensearchClient.search({
                    index: OPENSEARCH_INDEX,
                    body: {
                        query: { term: { status: 'PUBLISHED' } },
                        size: 0,
                        aggs: {
                            filtered: {
                                terms: {
                                    field: 'ingredients',
                                    include: names,
                                    size: names.length,
                                },
                            },
                        },
                    },
                });

                const filteredAgg = countBody.aggregations?.filtered as
                    | { buckets?: Array<{ key: string; doc_count: number }> }
                    | undefined;
                const buckets = filteredAgg?.buckets ?? [];
                const countMap = new Map(buckets.map((b) => [b.key, b.doc_count]));
                for (const result of results) {
                    result.count = countMap.get(result.name) ?? 0;
                }
            }

            return NextResponse.json({ results });
        }

        if (field === 'tags') {
            // Tags are stored as keywords on the recipes index — use aggregation with include regex
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const { body } = await opensearchClient.search({
                index: OPENSEARCH_INDEX,
                body: {
                    query: { term: { status: 'PUBLISHED' } },
                    size: 0,
                    aggs: {
                        tags: {
                            terms: {
                                field: 'tags',
                                size: 30,
                                include: `.*${escapedQuery}.*`,
                            },
                        },
                    },
                },
            });

            const tagsAgg = body.aggregations?.tags as
                | { buckets?: Array<{ key: string; doc_count: number }> }
                | undefined;
            const buckets = tagsAgg?.buckets ?? [];

            const results: SuggestResult[] = buckets.map((b) => ({
                name: b.key,
                count: b.doc_count,
            }));

            return NextResponse.json({ results });
        }

        return NextResponse.json({ results: [] });
    } catch {
        return NextResponse.json({ results: [] }, { status: 500 });
    }
}
