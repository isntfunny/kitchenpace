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
 * Safe to call repeatedly — skips creation if the index already exists.
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
