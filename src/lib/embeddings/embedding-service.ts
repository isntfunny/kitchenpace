import { similarity } from 'ml-distance';
import OpenAI from 'openai';

// ── Config ──────────────────────────────────────────────────────────────────
export const EMBEDDING_MODEL = 'text-embedding-3-large';

// ── Vector math ─────────────────────────────────────────────────────────────
export const cosineSimilarity: (a: number[], b: number[]) => number = similarity.cosine;
const MAX_BATCH_SIZE = 100; // OpenAI embeddings API limit per request

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
 * Generate an embedding vector for a single text input.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const openai = getClient();
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
    });
    return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batches.
 * Returns vectors in the same order as inputs.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const openai = getClient();
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
        const batch = texts.slice(i, i + MAX_BATCH_SIZE);
        const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: batch,
        });

        // OpenAI returns embeddings sorted by index
        const sorted = response.data.sort((a, b) => a.index - b.index);
        for (const item of sorted) {
            results.push(item.embedding);
        }
    }

    return results;
}
