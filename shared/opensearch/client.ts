import { Client } from '@opensearch-project/opensearch';

const nodeUrl = process.env.OPENSEARCH_URL ?? 'http://localhost:9200';
const recipesIndex = process.env.OPENSEARCH_INDEX ?? 'recipes';
const ingredientsIndex = process.env.OPENSEARCH_INGREDIENTS_INDEX ?? 'ingredients';
const tagsIndex = process.env.OPENSEARCH_TAGS_INDEX ?? 'tags';

export const opensearchClient = new Client({ node: nodeUrl });
export const OPENSEARCH_INDEX = recipesIndex;
export const OPENSEARCH_INGREDIENTS_INDEX = ingredientsIndex;
export const OPENSEARCH_TAGS_INDEX = tagsIndex;

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
        pluralName: { type: 'keyword' },
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

/**
 * Ensure OpenSearch indices exist with correct mappings.
 * Safe to call repeatedly — skips creation if the index already exists.
 */
export async function ensureIndices(): Promise<void> {
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
}
