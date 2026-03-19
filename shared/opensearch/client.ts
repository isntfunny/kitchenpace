import { Client } from '@opensearch-project/opensearch';

const nodeUrl = process.env.OPENSEARCH_URL ?? 'http://localhost:9200';
const recipesIndex = process.env.OPENSEARCH_INDEX ?? 'recipes';
const ingredientsIndex = process.env.OPENSEARCH_INGREDIENTS_INDEX ?? 'ingredients';
const tagsIndex = process.env.OPENSEARCH_TAGS_INDEX ?? 'tags';
const embeddingsIndex = process.env.OPENSEARCH_EMBEDDINGS_INDEX ?? 'recipe-embeddings';

export const opensearchClient = new Client({ node: nodeUrl });
export const OPENSEARCH_INDEX = recipesIndex;
export const OPENSEARCH_INGREDIENTS_INDEX = ingredientsIndex;
export const OPENSEARCH_TAGS_INDEX = tagsIndex;
export const OPENSEARCH_EMBEDDINGS_INDEX = embeddingsIndex;

/**
 * Build OpenSearch query for tag/ingredient suggest indices.
 * Combines prefix, fuzzy, and wildcard for typo tolerance + substring matching.
 */
export function buildSuggestQuery(query: string): Record<string, unknown> {
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

/**
 * Get recipe counts for matched names from a keyword field on the recipes index.
 */
export async function getRecipeCounts(
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

/**
 * Build OpenSearch query clauses for recipe text search.
 * Combines fuzzy full-text, prefix, and substring matching.
 * Returns an array of `should` clauses — wrap in a bool query with minimum_should_match: 1.
 */
export function buildRecipeTextQuery(query: string): Record<string, unknown>[] {
    return [
        {
            multi_match: {
                query,
                fields: ['title^3', 'description', 'keywords', 'ingredients^2'],
                fuzziness: 'AUTO',
                prefix_length: 1,
            },
        },
        {
            match_phrase_prefix: {
                title: { query, boost: 5 },
            },
        },
        {
            wildcard: {
                'title.keyword': {
                    value: `*${query}*`,
                    case_insensitive: true,
                    boost: 2,
                },
            },
        },
    ];
}

const RECIPES_MAPPINGS = {
    properties: {
        id: { type: 'keyword' },
        slug: { type: 'keyword' },
        title: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        description: { type: 'text' },
        category: { type: 'keyword' },
        categorySlug: { type: 'keyword' },
        tags: { type: 'keyword' },
        ingredients: { type: 'keyword' },
        difficulty: { type: 'keyword' },
        status: { type: 'keyword' },
        totalTime: { type: 'integer' },
        prepTime: { type: 'integer' },
        cookTime: { type: 'integer' },
        rating: { type: 'float' },
        cookCount: { type: 'integer' },
        stepCount: { type: 'integer' },
        imageKey: { type: 'keyword' },
        publishedAt: { type: 'date' },
        keywords: { type: 'text' },
    },
};

const INGREDIENTS_MAPPINGS = {
    properties: {
        id: { type: 'keyword' },
        name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        slug: { type: 'keyword' },
        pluralName: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        aliases: { type: 'text' },
        category: { type: 'keyword' },
        units: { type: 'keyword' },
        keywords: { type: 'text' },
    },
};

const TAGS_MAPPINGS = {
    properties: {
        id: { type: 'keyword' },
        name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        slug: { type: 'keyword' },
        keywords: { type: 'text' },
    },
};

/** Shared constant — must match the OpenAI text-embedding-3-large output size. */
export const EMBEDDING_DIMENSIONS = 3072;

const EMBEDDINGS_MAPPINGS = {
    properties: {
        id: { type: 'keyword' },
        embedding: {
            type: 'knn_vector',
            dimension: EMBEDDING_DIMENSIONS,
            method: {
                name: 'hnsw',
                space_type: 'cosinesimil',
                engine: 'lucene',
            },
        },
    },
};

/**
 * Ensure OpenSearch indices exist with correct mappings.
 * Creates missing indices and updates mappings on existing ones
 * (put_mapping only adds new fields, never modifies existing ones).
 * Safe to call repeatedly.
 */
export async function ensureIndices(): Promise<void> {
    // Standard indices (no special settings)
    for (const [index, mappings] of [
        [OPENSEARCH_INDEX, RECIPES_MAPPINGS],
        [OPENSEARCH_INGREDIENTS_INDEX, INGREDIENTS_MAPPINGS],
        [OPENSEARCH_TAGS_INDEX, TAGS_MAPPINGS],
    ] as const) {
        const { body: exists } = await opensearchClient.indices.exists({ index });
        if (!exists) {
            await opensearchClient.indices.create({
                index,
                body: { mappings } as Record<string, unknown>,
            });
            console.log(`[OpenSearch] Created index "${index}" with explicit mappings`);
        } else {
            // Only add fields that don't exist yet — putMapping can't change existing fields
            const { body: current } = await opensearchClient.indices.getMapping({ index });
            const existingProps = Object.keys(
                (current[index]?.mappings?.properties as Record<string, unknown>) ?? {},
            );
            const desiredProps = (mappings as { properties: Record<string, unknown> }).properties;
            const newProps: Record<string, unknown> = {};
            for (const [field, def] of Object.entries(desiredProps)) {
                if (!existingProps.includes(field)) {
                    newProps[field] = def;
                }
            }
            if (Object.keys(newProps).length > 0) {
                await opensearchClient.indices.putMapping({
                    index,
                    body: { properties: newProps } as Record<string, unknown>,
                });
                console.log(
                    `[OpenSearch] Added new fields to "${index}": ${Object.keys(newProps).join(', ')}`,
                );
            }
        }
    }

    // Embeddings index — requires k-NN plugin enabled at index level
    {
        const { body: exists } = await opensearchClient.indices.exists({
            index: OPENSEARCH_EMBEDDINGS_INDEX,
        });
        if (!exists) {
            await opensearchClient.indices.create({
                index: OPENSEARCH_EMBEDDINGS_INDEX,
                body: {
                    settings: { 'index.knn': true },
                    mappings: EMBEDDINGS_MAPPINGS,
                } as Record<string, unknown>,
            });
            console.log(
                `[OpenSearch] Created k-NN index "${OPENSEARCH_EMBEDDINGS_INDEX}" with explicit mappings`,
            );
        }
    }
}
