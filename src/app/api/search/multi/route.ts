import { NextRequest, NextResponse } from 'next/server';

import {
    opensearchClient,
    OPENSEARCH_INDEX,
    OPENSEARCH_INGREDIENTS_INDEX,
    OPENSEARCH_TAGS_INDEX,
} from '@shared/opensearch/client';
import { prisma } from '@shared/prisma';

type RecipeHit = {
    id: string;
    slug: string;
    title: string;
    category: string;
    totalTime: number;
    rating: number;
    imageKey: string | null;
    description: string;
};

type SuggestItem = { name: string; count: number };

type UserHit = {
    id: string;
    slug: string;
    nickname: string;
    photoKey: string | null;
    recipeCount: number;
};

type MultiSearchResponse = {
    recipes: RecipeHit[];
    ingredients: SuggestItem[];
    tags: SuggestItem[];
    users: UserHit[];
};

export async function GET(request: NextRequest) {
    const query = new URL(request.url).searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
        return NextResponse.json({ recipes: [], ingredients: [], tags: [] });
    }

    try {
        // Query 1: Recipe search
        const recipesPromise = opensearchClient.search({
            index: OPENSEARCH_INDEX,
            body: {
                query: {
                    bool: {
                        must: [
                            {
                                multi_match: {
                                    query,
                                    fields: ['title^3', 'description', 'keywords', 'ingredients^2'],
                                    fuzziness: 'AUTO',
                                    prefix_length: 1,
                                },
                            },
                        ],
                        filter: [{ term: { status: 'PUBLISHED' } }],
                    },
                },
                sort: [{ rating: 'desc' }, { publishedAt: 'desc' }],
                size: 5,
            },
        });

        // Query 2: Tag search (dedicated tags index)
        // Combines prefix, fuzzy, and wildcard for typo tolerance + substring matching
        const tagsPromise = opensearchClient.search({
            index: OPENSEARCH_TAGS_INDEX,
            body: {
                query: {
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
                },
                size: 10,
                _source: ['name'],
            },
        });

        // Query 3: Ingredient search (dedicated ingredients index)
        // Combines prefix, fuzzy, and wildcard for typo tolerance + substring matching
        const ingredientsPromise = opensearchClient.search({
            index: OPENSEARCH_INGREDIENTS_INDEX,
            body: {
                query: {
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
                },
                size: 10,
                _source: ['name'],
            },
        });

        // Query 4: User search (Prisma)
        const usersPromise = prisma.profile.findMany({
            where: {
                OR: [
                    { nickname: { contains: query, mode: 'insensitive' } },
                    { user: { name: { contains: query, mode: 'insensitive' } } },
                ],
            },
            take: 4,
            select: {
                slug: true,
                nickname: true,
                photoKey: true,
                recipeCount: true,
                userId: true,
            },
        });

        const [recipesResult, tagsResult, ingredientsResult, usersResult] = await Promise.all([
            recipesPromise,
            tagsPromise,
            ingredientsPromise,
            usersPromise,
        ]);

        // Parse recipe hits
        const hits = (recipesResult.body.hits?.hits ?? []) as Array<{
            _source?: Record<string, unknown>;
        }>;
        const recipes: RecipeHit[] = hits
            .map((hit) => hit._source)
            .filter(Boolean)
            .map((doc) => ({
                id: doc!.id as string,
                slug: doc!.slug as string,
                title: (doc!.title as string) || 'Unbekanntes Rezept',
                category: (doc!.category as string) || 'Hauptgericht',
                totalTime: Number(doc!.totalTime ?? 0),
                rating: Number(doc!.rating ?? 0),
                imageKey: (doc!.imageKey as string) ?? null,
                description: (doc!.description as string) || '',
            }));

        // Parse tag names from tags index
        const tagNames = (tagsResult.body.hits?.hits ?? [])
            .map((hit: { _source?: { name?: string } }) => hit._source?.name)
            .filter((name: string | undefined): name is string => Boolean(name));

        // Get recipe counts for matched tags
        let tags: SuggestItem[] = [];
        if (tagNames.length > 0) {
            const { body: tagCountBody } = await opensearchClient.search({
                index: OPENSEARCH_INDEX,
                body: {
                    query: { term: { status: 'PUBLISHED' } },
                    size: 0,
                    aggs: {
                        filtered: {
                            terms: {
                                field: 'tags',
                                include: tagNames,
                                size: tagNames.length,
                            },
                        },
                    },
                },
            });

            const tagAgg = tagCountBody.aggregations?.filtered as
                | { buckets?: Array<{ key: string; doc_count: number }> }
                | undefined;
            const tagCountMap = new Map((tagAgg?.buckets ?? []).map((b) => [b.key, b.doc_count]));
            tags = tagNames
                .map((name) => ({ name, count: tagCountMap.get(name) ?? 0 }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
        }

        // Parse ingredient names from ingredients index
        const ingredientNames = (ingredientsResult.body.hits?.hits ?? [])
            .map((hit: { _source?: { name?: string } }) => hit._source?.name)
            .filter((name: string | undefined): name is string => Boolean(name));

        // Get recipe counts for matched ingredients
        let ingredients: SuggestItem[] = [];
        if (ingredientNames.length > 0) {
            const { body: countBody } = await opensearchClient.search({
                index: OPENSEARCH_INDEX,
                body: {
                    query: { term: { status: 'PUBLISHED' } },
                    size: 0,
                    aggs: {
                        filtered: {
                            terms: {
                                field: 'ingredients',
                                include: ingredientNames,
                                size: ingredientNames.length,
                            },
                        },
                    },
                },
            });

            const filteredAgg = countBody.aggregations?.filtered as
                | { buckets?: Array<{ key: string; doc_count: number }> }
                | undefined;
            const countMap = new Map((filteredAgg?.buckets ?? []).map((b) => [b.key, b.doc_count]));
            ingredients = ingredientNames
                .map((name) => ({ name, count: countMap.get(name) ?? 0 }))
                .filter((item) => item.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
        }

        const users: UserHit[] = usersResult.map((p) => ({
            id: p.userId,
            slug: p.slug,
            nickname: p.nickname,
            photoKey: p.photoKey,
            recipeCount: p.recipeCount,
        }));

        const response: MultiSearchResponse = { recipes, ingredients, tags, users };
        return NextResponse.json(response);
    } catch {
        return NextResponse.json(
            { recipes: [], ingredients: [], tags: [], users: [] },
            { status: 500 },
        );
    }
}
