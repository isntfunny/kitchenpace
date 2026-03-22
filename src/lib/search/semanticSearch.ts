import { createHash } from 'node:crypto';

import { generateEmbedding } from '@app/lib/embeddings/embedding-service';
import { checkRateLimit } from '@app/lib/rate-limit';
import { getRealtimeRedis } from '@app/lib/realtime/redis';
import {
    opensearchClient,
    OPENSEARCH_EMBEDDINGS_INDEX,
    OPENSEARCH_INDEX,
} from '@shared/opensearch/client';

// ── Types ────────────────────────────────────────────────────────────────────

export type SemanticRecipeHit = {
    id: string;
    slug: string;
    title: string;
    category: string;
    totalTime: number;
    rating: number;
    imageKey: string | null;
    description: string;
};

export type SemanticSearchResult = {
    recipes: SemanticRecipeHit[];
    cached: boolean;
};

// ── Config ───────────────────────────────────────────────────────────────────

const KNN_K = 10;
const EMBEDDING_DIMENSIONS = 3072;
const CACHE_KEY_PREFIX = 'search:emb:';

// ── Embedding Cache (Redis) ──────────────────────────────────────────────────

function cacheKey(query: string): string {
    const normalized = query.toLowerCase().trim();
    const hash = createHash('sha256').update(normalized).digest('hex');
    return `${CACHE_KEY_PREFIX}${hash}`;
}

async function getCachedEmbedding(query: string): Promise<number[] | null> {
    try {
        const redis = getRealtimeRedis();
        const buf = await redis.getBuffer(cacheKey(query));
        if (!buf || buf.length !== EMBEDDING_DIMENSIONS * 4) return null;

        const floats = new Float32Array(buf.buffer, buf.byteOffset, EMBEDDING_DIMENSIONS);
        return Array.from(floats);
    } catch {
        return null;
    }
}

async function setCachedEmbedding(query: string, embedding: number[]): Promise<void> {
    try {
        const redis = getRealtimeRedis();
        const floats = new Float32Array(embedding);
        const buf = Buffer.from(floats.buffer);
        await redis.set(cacheKey(query), buf);
    } catch {
        // Cache write failure is non-critical
    }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Semantic recipe search using OpenAI embeddings + OpenSearch kNN.
 *
 * Flow:
 * 1. Check Redis cache for query embedding
 * 2. If cache miss: check rate limit, generate embedding via OpenAI, cache it
 * 3. Run kNN search against recipe-embeddings index
 * 4. Deduplicate against excludeIds
 * 5. Fetch full recipe details from recipes index
 */
/**
 * @param skipRateLimit - Set true when caller already checked rate limit (e.g. stream handler)
 */
export async function semanticRecipeSearch(
    query: string,
    excludeIds: Set<string>,
    userId: string | null,
    skipRateLimit = false,
): Promise<SemanticSearchResult> {
    // 1. Check cache
    let embedding = await getCachedEmbedding(query);
    const cached = embedding !== null;

    if (!embedding) {
        // 2. Rate limit (only on cache miss — cache hits are free)
        if (!skipRateLimit && userId) {
            const { allowed } = await checkRateLimit('semantic', userId);
            if (!allowed) return { recipes: [], cached: false };
        }

        // 3. Generate embedding via OpenAI
        embedding = await generateEmbedding(query);

        // 4. Cache for future queries (no TTL — embeddings are deterministic)
        await setCachedEmbedding(query, embedding);
    }

    // 5. kNN search
    const knnResult = await opensearchClient.search({
        index: OPENSEARCH_EMBEDDINGS_INDEX,
        body: {
            size: KNN_K,
            query: { knn: { embedding: { vector: embedding, k: KNN_K } } },
        },
    });

    const knnHitIds = ((knnResult.body.hits?.hits ?? []) as Array<{ _id: string }>).map(
        (h) => h._id,
    );

    // 6. Deduplicate
    const novelIds = knnHitIds.filter((id) => !excludeIds.has(id));
    if (novelIds.length === 0) return { recipes: [], cached };

    // 7. Fetch full recipe details
    const detailsResult = await opensearchClient.mget({
        index: OPENSEARCH_INDEX,
        body: { ids: novelIds },
    });

    const recipes = (
        (detailsResult.body.docs ?? []) as Array<{
            found?: boolean;
            _source?: Record<string, unknown>;
        }>
    )
        .filter((doc) => doc.found && doc._source?.status === 'PUBLISHED')
        .map((doc) => ({
            id: doc._source!.id as string,
            slug: doc._source!.slug as string,
            title: (doc._source!.title as string) || 'Unbekanntes Rezept',
            category: (doc._source!.category as string) || 'Hauptgericht',
            totalTime: Number(doc._source!.totalTime ?? 0),
            rating: Number(doc._source!.rating ?? 0),
            imageKey: (doc._source!.imageKey as string) ?? null,
            description: (doc._source!.description as string) || '',
        }));

    return { recipes, cached };
}
