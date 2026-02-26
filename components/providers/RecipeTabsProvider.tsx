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
    position?: number;
    viewedAt?: string;
    pinned?: boolean;
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
const API_BASE = '/api/recipe-tabs';
const PINNED_API = `${API_BASE}/pinned`;
const RECENT_API = `${API_BASE}/recent`;

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
        emoji: recipe.emoji ?? 'plating',
    };
}

const emptyTabs: RecipeTabsState = { pinned: [], recent: [] };

export function RecipeTabsProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated' && !!session?.user?.id;
    const [tabs, setTabs] = useState<RecipeTabsState>(emptyTabs);
    const [isLoading, setIsLoading] = useState(false);
    const previousAuthRef = useRef(isAuthenticated);

    const updateTabs = useCallback(
        (updater: (prev: RecipeTabsState) => RecipeTabsState) => {
            setTabs((prev) => {
                const next = updater(prev);
                if (!isAuthenticated) {
                    saveToStorage(next);
                }
                return next;
            });
        },
        [isAuthenticated],
    );

    const refreshData = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const [pinnedResponse, recentResponse] = await Promise.all([
                fetch(PINNED_API),
                fetch(RECENT_API),
            ]);

            if (!pinnedResponse.ok) {
                throw new Error(`Failed to load pinned recipes (${pinnedResponse.status})`);
            }

            if (!recentResponse.ok) {
                throw new Error(`Failed to load recent recipes (${recentResponse.status})`);
            }

            const pinnedEntries: RecipeTabItem[] = await pinnedResponse.json();
            const recentEntries: RecipeTabItem[] = await recentResponse.json();

            const normalizedPinned = pinnedEntries
                .map(withDefaultEmoji)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            const pinnedIds = new Set(normalizedPinned.map((entry) => entry.id));

            const normalizedRecent = recentEntries
                .filter((entry) => !pinnedIds.has(entry.id))
                .map(withDefaultEmoji)
                .slice(0, MAX_RECENT);

            updateTabs(() => ({
                pinned: normalizedPinned,
                recent: normalizedRecent,
            }));
        } catch (error) {
            console.error('Failed to refresh recipe tabs', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, updateTabs]);

    const migrateLocalData = useCallback(async () => {
        const stored = loadFromStorage();
        try {
            for (const recipe of stored.pinned.slice(0, MAX_PINNED)) {
                try {
                    await fetch(PINNED_API, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ recipeId: recipe.id }),
                    });
                } catch (error) {
                    console.error('Failed to migrate pinned recipe', error);
                }
            }
            for (const recipe of stored.recent.slice(0, MAX_RECENT)) {
                try {
                    await fetch(RECENT_API, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ recipeId: recipe.id }),
                    });
                } catch (error) {
                    console.error('Failed to migrate recent recipe', error);
                }
            }
        } finally {
            saveToStorage(emptyTabs);
        }
    }, []);

    useEffect(() => {
        const prevAuth = previousAuthRef.current;
        previousAuthRef.current = isAuthenticated;

        const initialize = async () => {
            if (isAuthenticated) {
                setIsLoading(true);
                if (!prevAuth) {
                    await migrateLocalData();
                }
                await refreshData();
                setIsLoading(false);
            } else {
                setTabs(loadFromStorage());
            }
        };

        void initialize();
    }, [isAuthenticated, migrateLocalData, refreshData]);

    const pinRecipe = useCallback(
        async (recipe: RecipeTabItem) => {
            const normalized = withDefaultEmoji(recipe);

            if (!isAuthenticated) {
                updateTabs((prev) => {
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
                return;
            }

            try {
                const response = await fetch(PINNED_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipeId: recipe.id }),
                });
                if (!response.ok) {
                    throw new Error(`Failed to pin recipe (${response.status})`);
                }
            } catch (error) {
                console.error('Failed to pin recipe', error);
            } finally {
                await refreshData();
            }
        },
        [isAuthenticated, refreshData, updateTabs],
    );

    const unpinRecipe = useCallback(
        async (recipeId: string) => {
            if (!isAuthenticated) {
                updateTabs((prev) => ({
                    pinned: prev.pinned.filter((item) => item.id !== recipeId),
                    recent: prev.recent,
                }));
                return;
            }

            try {
                const response = await fetch(`${PINNED_API}/${recipeId}`, { method: 'DELETE' });
                if (!response.ok) {
                    throw new Error(`Failed to unpin recipe (${response.status})`);
                }
            } catch (error) {
                console.error('Failed to unpin recipe', error);
            } finally {
                await refreshData();
            }
        },
        [isAuthenticated, refreshData, updateTabs],
    );

    const addToRecent = useCallback(
        async (recipe: RecipeTabItem) => {
            const normalized = withDefaultEmoji(recipe);
            updateTabs((prev) => ({
                ...prev,
                recent: [normalized, ...prev.recent.filter((item) => item.id !== recipe.id)].slice(
                    0,
                    MAX_RECENT,
                ),
            }));

            if (!isAuthenticated) {
                return;
            }

            try {
                const response = await fetch(RECENT_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipeId: recipe.id }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to log recipe view (${response.status})`);
                }
                await refreshData();
            } catch (error) {
                console.error('Failed to track recipe view', error);
            }
        },
        [isAuthenticated, refreshData, updateTabs],
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
