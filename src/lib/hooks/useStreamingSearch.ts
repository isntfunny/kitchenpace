'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSession } from '@app/lib/auth-client';
import { decryptChunk, deriveKeyClient } from '@app/lib/search/streamCryptoClient';

// ── Types (reused from useMultiSearch) ───────────────────────────────────────

export type MultiSearchRecipe = {
    id: string;
    slug: string;
    title: string;
    category: string;
    totalTime: number;
    rating: number;
    imageKey: string | null;
    description: string;
};

export type SuggestItem = { name: string; count: number };

export type MultiSearchUser = {
    id: string;
    slug: string;
    nickname: string;
    photoKey: string | null;
    recipeCount: number;
};

export type SearchPhase = 'idle' | 'debouncing' | 'searching' | 'done';

export type StreamingSearchResult = {
    recipes: MultiSearchRecipe[];
    semanticRecipes: MultiSearchRecipe[];
    ingredients: SuggestItem[];
    tags: SuggestItem[];
    users: MultiSearchUser[];
    phase: SearchPhase;
    progress: number;
    hasSemantic: boolean;
};

// ── Progress mapping ─────────────────────────────────────────────────────────

const PROGRESS_SEMANTIC = {
    init: 0,
    suggest: 0.2,
    text: 0.4,
    embedding: 0.6,
    semantic: 0.9,
    done: 1,
} as const;

const PROGRESS_TEXT_ONLY = {
    init: 0,
    suggest: 0.5,
    text: 1,
    done: 1,
} as const;

type ChunkType = keyof typeof PROGRESS_SEMANTIC;

function getProgress(type: ChunkType, isSemantic: boolean): number {
    if (isSemantic) return PROGRESS_SEMANTIC[type] ?? 0;
    return (PROGRESS_TEXT_ONLY as Record<string, number>)[type] ?? 0;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SEMANTIC_MIN_WORD_COUNT = 4;
const DEBOUNCE_SHORT = 150;
const DEBOUNCE_LONG = 500;

// Internal stream data — populated by runStream
type StreamData = {
    recipes: MultiSearchRecipe[];
    semanticRecipes: MultiSearchRecipe[];
    ingredients: SuggestItem[];
    tags: SuggestItem[];
    users: MultiSearchUser[];
    streamPhase: 'debouncing' | 'streaming' | 'done' | null;
    progress: number;
    hasSemantic: boolean;
};

const EMPTY: StreamData = {
    recipes: [],
    semanticRecipes: [],
    ingredients: [],
    tags: [],
    users: [],
    streamPhase: null,
    progress: 0,
    hasSemantic: false,
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useStreamingSearch(
    query: string,
    options?: { enabled?: boolean },
): StreamingSearchResult {
    const { enabled = true } = options ?? {};
    const { data: session } = useSession();
    const sessionToken = (session?.session as { token?: string } | undefined)?.token ?? null;

    const [data, setData] = useState<StreamData>(EMPTY);
    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const trimmedQuery = query.trim();
    const wordCount = trimmedQuery.split(/\s+/).length;
    const shouldSearch = enabled && trimmedQuery.length >= 2;

    const runStream = useCallback(async (q: string, token: string | null) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setData({ ...EMPTY, streamPhase: 'streaming' });

        try {
            const response = await fetch(`/api/search/stream?q=${encodeURIComponent(q)}`, {
                signal: controller.signal,
            });

            if (!response.ok || !response.body) {
                setData(EMPTY);
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let cryptoKey: CryptoKey | null = null;
            let isSemantic = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.trim()) continue;

                    if (!cryptoKey) {
                        const init = JSON.parse(line) as {
                            type: 'init';
                            salt: string;
                            semantic: boolean;
                            eph?: string;
                        };

                        isSemantic = init.semantic;

                        // Derive key: use session token if available, otherwise ephemeral token
                        const keySource = token ?? init.eph;
                        if (keySource) {
                            cryptoKey = await deriveKeyClient(keySource, init.salt);
                        }

                        setData((prev) => ({
                            ...prev,
                            hasSemantic: isSemantic,
                            progress: getProgress('init', isSemantic),
                        }));
                        continue;
                    }

                    let chunk: { type: string; [key: string]: unknown };
                    try {
                        const decrypted = await decryptChunk(line.trim(), cryptoKey);
                        chunk = JSON.parse(decrypted);
                    } catch {
                        continue;
                    }

                    const chunkType = chunk.type as ChunkType;
                    const progress = getProgress(chunkType, isSemantic);

                    switch (chunkType) {
                        case 'suggest':
                            setData((prev) => ({
                                ...prev,
                                ingredients: chunk.ingredients as SuggestItem[],
                                tags: chunk.tags as SuggestItem[],
                                progress,
                            }));
                            break;

                        case 'text':
                            setData((prev) => ({
                                ...prev,
                                recipes: chunk.recipes as MultiSearchRecipe[],
                                users: chunk.users as MultiSearchUser[],
                                progress,
                            }));
                            break;

                        case 'embedding':
                            setData((prev) => ({ ...prev, progress }));
                            break;

                        case 'semantic':
                            setData((prev) => ({
                                ...prev,
                                semanticRecipes: chunk.recipes as MultiSearchRecipe[],
                                progress,
                            }));
                            break;

                        case 'done':
                            setData((prev) => ({
                                ...prev,
                                streamPhase: 'done',
                                progress: 1,
                            }));
                            break;
                    }
                }
            }

            setData((prev) =>
                prev.streamPhase === 'streaming'
                    ? { ...prev, streamPhase: 'done', progress: 1 }
                    : prev,
            );
        } catch (error) {
            if ((error as Error).name === 'AbortError') return;
            setData(EMPTY);
        }
    }, []);

    // Debounce + stream lifecycle
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }

        if (!shouldSearch) {
            abortRef.current?.abort();
            return;
        }

        const debounceMs = wordCount >= SEMANTIC_MIN_WORD_COUNT ? DEBOUNCE_LONG : DEBOUNCE_SHORT;

        // Use a microtask to signal debouncing (avoids synchronous setState in effect body)
        const signalTimer = setTimeout(() => {
            setData((prev) =>
                prev.streamPhase === null ? { ...EMPTY, streamPhase: 'debouncing' } : prev,
            );
        }, 0);

        debounceRef.current = setTimeout(() => {
            runStream(trimmedQuery, sessionToken);
        }, debounceMs);

        return () => {
            clearTimeout(signalTimer);
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
        };
    }, [trimmedQuery, shouldSearch, wordCount, sessionToken, runStream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortRef.current?.abort();
        };
    }, []);

    // Derive public phase
    const phase: SearchPhase = useMemo(() => {
        if (!shouldSearch) return 'idle';
        if (data.streamPhase === 'debouncing') return 'debouncing';
        if (data.streamPhase === 'streaming') return 'searching';
        if (data.streamPhase === 'done') return 'done';
        return 'debouncing'; // between effect run and signalTimer
    }, [shouldSearch, data.streamPhase]);

    if (!shouldSearch) return { ...EMPTY, phase: 'idle', hasSemantic: false };

    return {
        recipes: data.recipes,
        semanticRecipes: data.semanticRecipes,
        ingredients: data.ingredients,
        tags: data.tags,
        users: data.users,
        phase,
        progress: data.progress,
        hasSemantic: wordCount >= SEMANTIC_MIN_WORD_COUNT || data.hasSemantic,
    };
}
