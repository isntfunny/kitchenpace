import { NextRequest, NextResponse } from 'next/server';

import {
    opensearchClient,
    OPENSEARCH_EMBEDDINGS_INDEX,
    OPENSEARCH_INDEX,
} from '@shared/opensearch/client';

type RouteContext = { params: Promise<{ id: string }> };

/** Minimum cosine similarity score to include a result. */
const MIN_SCORE = 0.7;

/**
 * Over-request factor for k-NN — we fetch extra results to compensate
 * for self-exclusion and unpublished recipes filtered in fetchRecipeDetails.
 */
const KNN_OVER_REQUEST_FACTOR = 3;

/**
 * GET /api/recipe/[id]/similar?limit=5
 *
 * Returns similar recipes using OpenSearch k-NN vector search.
 * Falls back to OpenSearch "more_like_this" if no embedding exists.
 */
export async function GET(request: NextRequest, context: RouteContext) {
    const { id: recipeId } = await context.params;
    const raw = Number(request.nextUrl.searchParams.get('limit'));
    const limit = Math.min(Number.isFinite(raw) ? raw : 5, 20);

    try {
        const similar = await findSimilarByEmbedding(recipeId, limit);

        if (similar) {
            return NextResponse.json({ data: similar, method: 'knn' });
        }

        // Fallback: text-based similarity via "more_like_this"
        const fallback = await findSimilarByText(recipeId, limit);
        return NextResponse.json({ data: fallback, method: 'mlt' });
    } catch (error) {
        console.error('[Similar] Request failed', {
            recipeId,
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Fehler beim Laden ähnlicher Rezepte' }, { status: 500 });
    }
}

// ── k-NN vector similarity ──────────────────────────────────────────────────

type KnnHit = { _id: string; _score: number };
type KnnResponse = { hits?: { hits?: KnnHit[] } };

async function findSimilarByEmbedding(
    recipeId: string,
    limit: number,
): Promise<SimilarRecipe[] | null> {
    // 1. Get the recipe's embedding
    let embedding: number[];
    try {
        const doc = await opensearchClient.get({
            index: OPENSEARCH_EMBEDDINGS_INDEX,
            id: recipeId,
            _source: ['embedding'],
        });
        embedding = (doc.body._source as { embedding: number[] }).embedding;
    } catch {
        // No embedding yet — signal fallback
        return null;
    }

    // 2. k-NN search — over-request to handle self-exclusion + unpublished filtering
    const k = Math.min(limit * KNN_OVER_REQUEST_FACTOR + 1, 100);
    const response = await opensearchClient.search({
        index: OPENSEARCH_EMBEDDINGS_INDEX,
        body: {
            size: k,
            query: {
                knn: {
                    embedding: {
                        vector: embedding,
                        k,
                    },
                },
            },
        },
    });

    const knnBody = response.body as KnnResponse;
    const knnHits = (knnBody.hits?.hits ?? [])
        .filter((h) => h._id !== recipeId && h._score >= MIN_SCORE)
        .slice(0, limit * KNN_OVER_REQUEST_FACTOR);

    if (knnHits.length === 0) return [];

    // 3. Fetch recipe details from recipes index (filters unpublished) and trim to limit
    const details = await fetchRecipeDetails(knnHits.map((h) => ({ id: h._id, score: h._score })));
    return details.slice(0, limit);
}

// ── Text-based "more like this" fallback ────────────────────────────────────

type MltHit = { _id: string; _score: number };
type MltResponse = { hits?: { hits?: MltHit[] } };

async function findSimilarByText(recipeId: string, limit: number): Promise<SimilarRecipe[]> {
    const response = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: {
            size: limit,
            query: {
                bool: {
                    must: [
                        {
                            more_like_this: {
                                fields: ['title', 'description', 'ingredients', 'tags', 'keywords'],
                                like: [{ _index: OPENSEARCH_INDEX, _id: recipeId }],
                                min_term_freq: 1,
                                max_query_terms: 15,
                                min_doc_freq: 1,
                            },
                        },
                    ],
                    filter: [{ term: { status: 'PUBLISHED' } }],
                    must_not: [{ ids: { values: [recipeId] } }],
                },
            },
        },
    });

    const mltBody = response.body as MltResponse;
    const hits = mltBody.hits?.hits ?? [];

    if (hits.length === 0) return [];

    return fetchRecipeDetails(hits.map((h) => ({ id: h._id, score: h._score })));
}

// ── Shared recipe detail fetch ──────────────────────────────────────────────

interface SimilarRecipe {
    id: string;
    slug: string;
    title: string;
    category: string;
    rating: number;
    time: string;
    imageKey: string | null;
    description: string;
    difficulty?: string;
    score: number;
}

type RecipeDoc = {
    id: string;
    slug: string;
    title: string;
    category?: string;
    rating?: number;
    totalTime?: number;
    imageKey?: string;
    description?: string;
    difficulty?: string;
    status?: string;
};

async function fetchRecipeDetails(
    items: Array<{ id: string; score: number }>,
): Promise<SimilarRecipe[]> {
    if (items.length === 0) return [];

    const response = await opensearchClient.mget({
        index: OPENSEARCH_INDEX,
        body: { ids: items.map((i) => i.id) },
    });

    type MgetDoc = { _id: string; found: boolean; _source?: RecipeDoc };
    const docs = (response.body.docs ?? []) as MgetDoc[];

    const scoreMap = new Map(items.map((i) => [i.id, i.score]));
    const difficultyLabel = (d?: string) =>
        d === 'EASY' ? 'Einfach' : d === 'HARD' ? 'Schwer' : d === 'MEDIUM' ? 'Mittel' : undefined;

    return docs
        .filter((d) => d.found && d._source?.status === 'PUBLISHED')
        .map((d) => {
            const src = d._source!;
            const totalTime = Number(src.totalTime ?? 0);
            return {
                id: src.id,
                slug: src.slug,
                title: src.title,
                category: src.category ?? 'Hauptgericht',
                rating: Number(src.rating ?? 0),
                time: totalTime > 0 ? `${totalTime} Min.` : '—',
                imageKey: src.imageKey ?? null,
                description: src.description ?? '',
                difficulty: difficultyLabel(src.difficulty),
                score: scoreMap.get(d._id) ?? 0,
            };
        })
        .sort((a, b) => b.score - a.score);
}
