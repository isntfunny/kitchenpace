import { NextRequest } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';
import { checkRateLimit } from '@app/lib/rate-limit';
import { semanticRecipeSearch } from '@app/lib/search/semanticSearch';
import { deriveKey, encryptChunk, generateSalt } from '@app/lib/search/streamCrypto';
import {
    buildRecipeTextQuery,
    buildSuggestQuery,
    getRecipeCounts,
    opensearchClient,
    OPENSEARCH_INDEX,
    OPENSEARCH_INGREDIENTS_INDEX,
    OPENSEARCH_TAGS_INDEX,
} from '@shared/opensearch/client';
import { prisma } from '@shared/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SEMANTIC_MIN_WORD_COUNT = 4;

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseRecipeHits(hits: Array<{ _source?: Record<string, unknown> }>): RecipeHit[] {
    return hits
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

// ── Stream Handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
        return new Response(JSON.stringify({ type: 'error', message: 'Query too short' }), {
            status: 400,
        });
    }

    const session = await getServerAuthSession('api/search/stream');
    const userId = session?.user?.id ?? null;
    const sessionToken = (session?.session as { token?: string } | undefined)?.token ?? null;

    const wordCount = query.split(/\s+/).length;
    const canSemantic =
        wordCount >= SEMANTIC_MIN_WORD_COUNT && userId !== null && sessionToken !== null;

    // Pre-check rate limit for semantic (so we can tell the client upfront)
    let semanticEnabled = canSemantic;
    if (canSemantic && userId) {
        const { allowed } = await checkRateLimit('semantic', userId);
        if (!allowed) semanticEnabled = false;
    }

    // Key derivation:
    // - Authenticated: HMAC(sessionToken, salt) — only this user can decrypt
    // - Unauthenticated: HMAC(ephemeralToken, salt) — token sent in init chunk,
    //   still obfuscates the stream (can't read without parsing init first)
    const salt = generateSalt();
    const ephemeralToken = !sessionToken ? salt.toString('hex') : null;
    const keySource = sessionToken ?? ephemeralToken!;
    const encryptionKey = deriveKey(keySource, salt);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendLine = (json: string) => {
                controller.enqueue(encoder.encode(json + '\n'));
            };

            const sendEncrypted = (data: unknown) => {
                const plaintext = JSON.stringify(data);
                const encrypted = encryptChunk(plaintext, encryptionKey);
                sendLine(encrypted);
            };

            try {
                // 1. Init chunk (plaintext — contains salt + optional ephemeral token)
                sendLine(
                    JSON.stringify({
                        type: 'init',
                        salt: salt.toString('hex'),
                        semantic: semanticEnabled,
                        ...(ephemeralToken ? { eph: ephemeralToken } : {}),
                    }),
                );

                // 2. Fire parallel queries: suggest (tags+ingredients) and text (recipes+users)
                const suggestPromise = Promise.all([
                    opensearchClient.search({
                        index: OPENSEARCH_TAGS_INDEX,
                        body: { query: buildSuggestQuery(query), size: 10, _source: ['name'] },
                    }),
                    opensearchClient.search({
                        index: OPENSEARCH_INGREDIENTS_INDEX,
                        body: {
                            query: buildSuggestQuery(query),
                            size: 10,
                            _source: ['name', 'pluralName'],
                        },
                    }),
                ]);

                const textPromise = Promise.all([
                    opensearchClient.search({
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
                    }),
                    prisma.profile.findMany({
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
                    }),
                ]);

                // Wait for suggest results first (usually faster)
                const [tagsResult, ingredientsResult] = await suggestPromise;

                // Parse tags
                const tagNames = (tagsResult.body.hits?.hits ?? [])
                    .map((hit: { _source?: { name?: string } }) => hit._source?.name)
                    .filter((name: string | undefined): name is string => Boolean(name));
                const tagCountMap = await getRecipeCounts(tagNames, 'tags');
                const tags: SuggestItem[] = tagNames
                    .map((name) => ({ name, count: tagCountMap.get(name) ?? 0 }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                // Parse ingredients (dedup plural)
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
                const pluralSet = new Set(
                    allIngredientDocs
                        .map((d) => d.pluralName?.toLowerCase())
                        .filter((v): v is string => Boolean(v)),
                );
                const ingredientNames = allIngredientDocs
                    .filter((d) => !pluralSet.has(d.name.toLowerCase()))
                    .map((d) => d.name);
                const ingredientCountMap = await getRecipeCounts(ingredientNames, 'ingredients');
                const ingredients: SuggestItem[] = ingredientNames
                    .map((name) => ({ name, count: ingredientCountMap.get(name) ?? 0 }))
                    .filter((item) => item.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                // 3. Send suggest chunk
                sendEncrypted({ type: 'suggest', ingredients, tags });

                // Wait for text results
                const [recipesResult, usersResult] = await textPromise;

                const recipes: RecipeHit[] = parseRecipeHits(
                    (recipesResult.body.hits?.hits ?? []) as Array<{
                        _source?: Record<string, unknown>;
                    }>,
                );

                const users: UserHit[] = (usersResult ?? []).map((p) => ({
                    id: p.userId,
                    slug: p.slug,
                    nickname: p.nickname,
                    photoKey: p.photoKey,
                    recipeCount: p.recipeCount,
                }));

                // 4. Send text chunk
                sendEncrypted({ type: 'text', recipes, users });

                // 5. Semantic search (only if enabled)
                if (semanticEnabled) {
                    // Signal that embedding generation is happening
                    sendEncrypted({ type: 'embedding' });

                    const existingIds = new Set(recipes.map((r) => r.id));
                    const semanticResult = await semanticRecipeSearch(
                        query,
                        existingIds,
                        userId,
                        true, // rate limit already checked above
                    );

                    sendEncrypted({ type: 'semantic', recipes: semanticResult.recipes });
                }

                // 6. Done
                sendEncrypted({ type: 'done' });
                controller.close();
            } catch {
                try {
                    sendEncrypted({ type: 'error', message: 'Search failed' });
                    controller.close();
                } catch {
                    // Controller already closed
                }
            }
        },
    });

    // Cleanup on client abort
    request.signal.addEventListener(
        'abort',
        () => {
            try {
                stream.cancel();
            } catch {
                // Already closed
            }
        },
        { once: true },
    );

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
        },
    });
}
