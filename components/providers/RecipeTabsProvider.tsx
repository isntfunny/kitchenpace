'use client';

import { useSession } from 'next-auth/react';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface RecipeTabItem {
    id: string;
    title: string;
    slug?: string;
    emoji?: string;
    imageUrl?: string;
    prepTime?: number;
    cookTime?: number;
    difficulty?: string;
}

interface RecipeTabsContextValue {
    pinned: RecipeTabItem[];
    recent: RecipeTabItem[];
    isLoading: boolean;
    isAuthenticated: boolean;
    pinRecipe: (recipe: RecipeTabItem) => Promise<void>;
    unpinRecipe: (recipeId: string) => Promise<void>;
    addToRecent: (recipe: RecipeTabItem) => Promise<void>;
    refreshData: () => Promise<void>;
}

const STORAGE_KEY = 'kitchenpace_recipe_tabs';
const MAX_PINNED = 3;
const MAX_RECENT = 5;

type RecipeTabsState = {
    pinned: RecipeTabItem[];
    recent: RecipeTabItem[];
};

function loadFromStorage(): RecipeTabsState {
    if (typeof window === 'undefined') return { pinned: [], recent: [] };
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to read recipe tabs from storage', error);
    }
    return { pinned: [], recent: [] };
}

function saveToStorage(data: RecipeTabsState) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to write recipe tabs to storage', error);
    }
}

export const RecipeTabsContext = createContext<RecipeTabsContextValue | null>(null);

function withDefaultEmoji(recipe: RecipeTabItem): RecipeTabItem {
    return {
        ...recipe,
        emoji: recipe.emoji ?? '🍽️',
    };
}

export function RecipeTabsProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated' && !!session;
    const [tabs, setTabs] = useState<RecipeTabsState>({ pinned: [], recent: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const previousAuthRef = useRef<boolean | null>(null);

    // Initialize on mount and when auth changes
    useEffect(() => {
        const wasAuthenticated = previousAuthRef.current;
        const isFirstMount = wasAuthenticated === null;

        // First mount - load from appropriate source
        if (isFirstMount) {
            if (isAuthenticated) {
                // Fetch from API
                setIsLoading(true);
                Promise.all([fetch('/api/pinned-favorites'), fetch('/api/recent-recipes')])
                    .then(async ([pinnedRes, recentRes]) => {
                        const pinnedData = pinnedRes.ok ? await pinnedRes.json() : [];
                        const recentData = recentRes.ok ? await recentRes.json() : [];

                        setTabs({
                            pinned: (pinnedData as Array<{ recipe: RecipeTabItem }>).map((entry) =>
                                withDefaultEmoji({
                                    id: entry.recipe.id,
                                    title: entry.recipe.title,
                                    slug: entry.recipe.slug,
                                    imageUrl: entry.recipe.imageUrl,
                                    prepTime: entry.recipe.prepTime,
                                    cookTime: entry.recipe.cookTime,
                                    difficulty: entry.recipe.difficulty,
                                }),
                            ),
                            recent: (recentData as RecipeTabItem[]).map((entry) =>
                                withDefaultEmoji(entry),
                            ),
                        });
                    })
                    .catch(console.error)
                    .finally(() => setIsLoading(false));
            } else {
                // Load from localStorage
                setTabs(loadFromStorage());
            }
            setIsInitialized(true);
        }
        // Auth state changed (not first mount)
        else if (wasAuthenticated !== isAuthenticated) {
            if (!wasAuthenticated && isAuthenticated) {
                // User logged in - migrate localStorage to DB
                const stored = loadFromStorage();
                (async () => {
                    for (const recipe of stored.pinned.slice(0, MAX_PINNED)) {
                        await fetch('/api/pinned-favorites', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ recipeId: recipe.id }),
                        });
                    }
                    for (const recipe of stored.recent.slice(0, MAX_RECENT)) {
                        await fetch('/api/recent-recipes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ recipeId: recipe.id }),
                        });
                    }
                    saveToStorage({ pinned: [], recent: [] });

                    // Fetch from API
                    const [pinnedRes, recentRes] = await Promise.all([
                        fetch('/api/pinned-favorites'),
                        fetch('/api/recent-recipes'),
                    ]);
                    const pinnedData = pinnedRes.ok ? await pinnedRes.json() : [];
                    const recentData = recentRes.ok ? await recentRes.json() : [];
                    setTabs({
                        pinned: (pinnedData as Array<{ recipe: RecipeTabItem }>).map((entry) =>
                            withDefaultEmoji({
                                id: entry.recipe.id,
                                title: entry.recipe.title,
                                slug: entry.recipe.slug,
                                imageUrl: entry.recipe.imageUrl,
                                prepTime: entry.recipe.prepTime,
                                cookTime: entry.recipe.cookTime,
                                difficulty: entry.recipe.difficulty,
                            }),
                        ),
                        recent: (recentData as RecipeTabItem[]).map((entry) =>
                            withDefaultEmoji(entry),
                        ),
                    });
                })().catch(console.error);
            } else if (wasAuthenticated && !isAuthenticated) {
                // User logged out - load from localStorage
                setTabs(loadFromStorage());
            }
        }

        previousAuthRef.current = isAuthenticated;
    }, [isAuthenticated]);

    // Save to localStorage when tabs change (only for non-authenticated users)
    useEffect(() => {
        if (!isAuthenticated && isInitialized) {
            saveToStorage(tabs);
        }
    }, [tabs, isAuthenticated, isInitialized]);

    const refreshData = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const [pinnedRes, recentRes] = await Promise.all([
                fetch('/api/pinned-favorites'),
                fetch('/api/recent-recipes'),
            ]);
            const pinnedData = pinnedRes.ok ? await pinnedRes.json() : [];
            const recentData = recentRes.ok ? await recentRes.json() : [];
            setTabs({
                pinned: (pinnedData as Array<{ recipe: RecipeTabItem }>).map((entry) =>
                    withDefaultEmoji({
                        id: entry.recipe.id,
                        title: entry.recipe.title,
                        slug: entry.recipe.slug,
                        imageUrl: entry.recipe.imageUrl,
                        prepTime: entry.recipe.prepTime,
                        cookTime: entry.recipe.cookTime,
                        difficulty: entry.recipe.difficulty,
                    }),
                ),
                recent: (recentData as RecipeTabItem[]).map((entry) => withDefaultEmoji(entry)),
            });
        } catch (error) {
            console.error('Failed to refresh recipe tabs', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    const pinRecipe = useCallback(
        async (recipe: RecipeTabItem) => {
            const normalized = withDefaultEmoji(recipe);
            setTabs((prev) => {
                if (
                    prev.pinned.length >= MAX_PINNED ||
                    prev.pinned.some((item) => item.id === recipe.id)
                ) {
                    return prev;
                }
                return {
                    pinned: [...prev.pinned, normalized],
                    recent: prev.recent.filter((item) => item.id !== recipe.id),
                };
            });
            if (isAuthenticated) {
                await fetch('/api/pinned-favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipeId: recipe.id }),
                });
            }
        },
        [isAuthenticated],
    );

    const unpinRecipe = useCallback(
        async (recipeId: string) => {
            setTabs((prev) => {
                const unpinnedRecipe = prev.pinned.find((item) => item.id === recipeId);
                const isInRecent = prev.recent.some((item) => item.id === recipeId);

                // Add back to recent if it was removed when pinning and not already there
                let newRecent = prev.recent;
                if (unpinnedRecipe && !isInRecent) {
                    newRecent = [unpinnedRecipe, ...prev.recent].slice(0, MAX_RECENT);
                }

                return {
                    pinned: prev.pinned.filter((item) => item.id !== recipeId),
                    recent: newRecent,
                };
            });
            if (isAuthenticated) {
                await fetch(`/api/pinned-favorites/${recipeId}`, { method: 'DELETE' });
            }
        },
        [isAuthenticated],
    );

    const addToRecent = useCallback(
        async (recipe: RecipeTabItem) => {
            const normalized = withDefaultEmoji(recipe);
            setTabs((prev) => ({
                ...prev,
                recent: [normalized, ...prev.recent.filter((item) => item.id !== recipe.id)].slice(
                    0,
                    MAX_RECENT,
                ),
            }));
            if (isAuthenticated) {
                await fetch('/api/recent-recipes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipeId: recipe.id }),
                });
            }
        },
        [isAuthenticated],
    );

    const contextValue = useMemo(
        () => ({
            pinned: tabs.pinned,
            recent: tabs.recent,
            isLoading,
            isAuthenticated,
            pinRecipe,
            unpinRecipe,
            addToRecent,
            refreshData,
        }),
        [
            tabs.pinned,
            tabs.recent,
            isLoading,
            isAuthenticated,
            pinRecipe,
            unpinRecipe,
            addToRecent,
            refreshData,
        ],
    );

    return <RecipeTabsContext.Provider value={contextValue}>{children}</RecipeTabsContext.Provider>;
}
