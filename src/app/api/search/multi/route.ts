import { NextRequest, NextResponse } from 'next/server';

import {
    buildRecipeTextQuery,
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
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim();
    const typesParam = url.searchParams.get('types'); // comma-separated: "recipes,tags,ingredients,users"
    const requestedTypes = typesParam ? new Set(typesParam.split(',').map((t) => t.trim())) : null; // null = all types

    if (!query || query.length < 2) {
        return NextResponse.json({ recipes: [], ingredients: [], tags: [], users: [] });
    }

    const wantsAll = !requestedTypes;
    const wantsRecipes = wantsAll || requestedTypes.has('recipes');
    const wantsTags = wantsAll || requestedTypes.has('tags');
    const wantsIngredients = wantsAll || requestedTypes.has('ingredients');
    const wantsUsers = wantsAll || requestedTypes.has('users');

    try {
        // Query 1: Recipe search
        const recipesPromise = wantsRecipes
            ? opensearchClient.search({
                  index: OPENSEARCH_INDEX,
                  body: {
                      query: {
                          bool: {
                              should: buildRecipeTextQuery(query),
                              minimum_should_match: 1,
                              filter: [{ term: { status: 'PUBLISHED' } }],
                          },
                      },
                      sort: [{ rating: 'desc' }, { publishedAt: 'desc' }],
                      size: 5,
                  },
              })
            : null;

        // Query 2: Tag search (dedicated tags index)
        // Combines prefix, fuzzy, and wildcard for typo tolerance + substring matching
        const tagsPromise = wantsTags
            ? opensearchClient.search({
                  index: OPENSEARCH_TAGS_INDEX,
                  body: {
                      query: {
                          bool: {
                              should: [
                                  { prefix: { 'name.keyword': { value: query, boost: 3 } } },
                                  {
                                      match: {
                                          name: { query, fuzziness: 'AUTO', prefix_length: 1 },
                                      },
                                  },
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
              })
            : null;

        // Query 3: Ingredient search (dedicated ingredients index)
        // Combines prefix, fuzzy, and wildcard for typo tolerance + substring matching
        const ingredientsPromise = wantsIngredients
            ? opensearchClient.search({
                  index: OPENSEARCH_INGREDIENTS_INDEX,
                  body: {
                      query: {
                          bool: {
                              should: [
                                  { prefix: { 'name.keyword': { value: query, boost: 3 } } },
                                  {
                                      match: {
                                          name: { query, fuzziness: 'AUTO', prefix_length: 1 },
                                      },
                                  },
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
                      _source: ['name', 'pluralName'],
                  },
              })
            : null;

        // Query 4: User search (Prisma)
        const usersPromise = wantsUsers
            ? prisma.profile.findMany({
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
              })
            : null;

        const [recipesResult, tagsResult, ingredientsResult, usersResult] = await Promise.all([
            recipesPromise,
            tagsPromise,
            ingredientsPromise,
            usersPromise,
        ]);

        // Parse recipe hits
        let recipes: RecipeHit[] = [];
        if (recipesResult) {
            const hits = (recipesResult.body.hits?.hits ?? []) as Array<{
                _source?: Record<string, unknown>;
            }>;
            recipes = hits
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
        }

        // Parse tag names from tags index
        let tags: SuggestItem[] = [];
        if (tagsResult) {
            const tagNames = (tagsResult.body.hits?.hits ?? [])
                .map((hit: { _source?: { name?: string } }) => hit._source?.name)
                .filter((name: string | undefined): name is string => Boolean(name));

            // Get recipe counts for matched tags
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
                const tagCountMap = new Map(
                    (tagAgg?.buckets ?? []).map((b) => [b.key, b.doc_count]),
                );
                tags = tagNames
                    .map((name) => ({ name, count: tagCountMap.get(name) ?? 0 }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);
            }
        }

        // Parse ingredient names from ingredients index, dedup plural-only entries
        let ingredients: SuggestItem[] = [];
        if (ingredientsResult) {
            const ingredientHits = (ingredientsResult.body.hits?.hits ?? []) as Array<{
                _source?: { name?: string; pluralName?: string | null };
            }>;
            const allIngredientDocs = ingredientHits
                .map((hit) => ({
                    name: hit._source?.name,
                    pluralName: hit._source?.pluralName ?? null,
                }))
                .filter((doc): doc is { name: string; pluralName: string | null } =>
                    Boolean(doc.name),
                );
            const ingredientPluralSet = new Set(
                allIngredientDocs
                    .map((d) => d.pluralName?.toLowerCase())
                    .filter((v): v is string => Boolean(v)),
            );
            const ingredientNames = allIngredientDocs
                .filter((d) => !ingredientPluralSet.has(d.name.toLowerCase()))
                .map((d) => d.name);

            // Get recipe counts for matched ingredients
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
                const countMap = new Map(
                    (filteredAgg?.buckets ?? []).map((b) => [b.key, b.doc_count]),
                );
                ingredients = ingredientNames
                    .map((name) => ({ name, count: countMap.get(name) ?? 0 }))
                    .filter((item) => item.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);
            }
        }

        const users: UserHit[] = (usersResult ?? []).map((p) => ({
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
