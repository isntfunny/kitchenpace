import { similarity } from 'ml-distance';
import OpenAI from 'openai';

// ── Config ──────────────────────────────────────────────────────────────────
export const EMBEDDING_MODEL = 'text-embedding-3-large';

// ── Vector math ─────────────────────────────────────────────────────────────
export const cosineSimilarity: (a: number[], b: number[]) => number = similarity.cosine;

// ── Singleton client ────────────────────────────────────────────────────────
let client: OpenAI | null = null;

function getClient(): OpenAI {
    if (!client) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
        client = new OpenAI({ apiKey, organization: process.env.OPENAI_ORG_ID });
    }
    return client;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface RecipeEmbeddingInput {
    title: string;
    description: string;
    ingredients: string[];
    tags: string[];
    category?: string;
    difficulty?: string;
}

/**
 * Builds a compact text representation of a recipe for embedding.
 * Intentionally short — embeddings work best with concise, focused text.
 */
export function buildRecipeEmbeddingText(recipe: RecipeEmbeddingInput): string {
    const parts: string[] = [recipe.title];

    if (recipe.description) {
        parts.push(recipe.description);
    }
    if (recipe.category) {
        parts.push(`Kategorie: ${recipe.category}`);
    }
    if (recipe.difficulty) {
        parts.push(`Schwierigkeit: ${recipe.difficulty}`);
    }
    if (recipe.ingredients.length > 0) {
        parts.push(`Zutaten: ${recipe.ingredients.join(', ')}`);
    }
    if (recipe.tags.length > 0) {
        parts.push(`Tags: ${recipe.tags.join(', ')}`);
    }

    return parts.join('. ');
}

/**
 * Request body for /v1/embeddings. The direct calls below and the batch
 * backfill (worker/queues/embeddings-backfill.ts) both send exactly this.
 */
export function buildEmbeddingRequest<T extends string | string[]>(input: T) {
    return { model: EMBEDDING_MODEL, input };
}

/**
 * Generate an embedding vector for a single text input.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const openai = getClient();
    const response = await openai.embeddings.create(buildEmbeddingRequest(text));
    return response.data[0].embedding;
}
