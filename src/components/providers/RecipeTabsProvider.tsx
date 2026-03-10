'use client';

import { useSession } from 'next-auth/react';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface RecipeTabItem {
    id: string;
    title: string;
    slug?: string;
    emoji?: string;
    imageKey?: string | null;
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
const _MAX_PINNED = 3;
const MAX_RECENT = 5;
const API_BASE = '/api/recipe-tabs';
const PINNED_API = `${API_BASE}/pinned`;
const RECENT_API = `${API_BASE}/recent`;

type TabsApiResponse = { pinned: RecipeTabItem[]; recent: RecipeTabItem[] };

type RecipeTabsState = {
    pinned: RecipeTabItem[];
    recent: RecipeTabItem[];
};

function loadFromStorage(): RecipeTabsState {
    if (typeof window === 'undefined') return { pinned: [], recent: [] };
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Only keep recent for unauthenticated users — pinned requires an account
            return { pinned: [], recent: parsed.recent ?? [] };
        }
    } catch (error) {
        console.error('Failed to read recipe tabs from storage', error);
    }
    return { pinned: [], recent: [] };
}

function saveToStorage(recent: RecipeTabItem[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ recent }));
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

interface RecipeTabsProviderProps {
    children: React.ReactNode;
    initialPinned?: RecipeTabItem[];
    initialRecent?: RecipeTabItem[];
    /** True when the layout has already fetched fresh data server-side */
    serverDataFetched?: boolean;
}

export function RecipeTabsProvider({
    children,
    initialPinned,
    initialRecent,
    serverDataFetched = false,
}: RecipeTabsProviderProps) {
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated' && !!session?.user?.id;
    const initialTabs =
        initialPinned || initialRecent
            ? { pinned: initialPinned ?? [], recent: initialRecent ?? [] }
            : emptyTabs;
    const [tabs, setTabs] = useState<RecipeTabsState>(initialTabs);
    const [isLoading, setIsLoading] = useState(false);
    const previousAuthRef = useRef(isAuthenticated);
    // Skip the first client-side refresh when the layout already provided fresh SSR data
    const skipInitialRefreshRef = useRef(serverDataFetched);

    const updateTabs = useCallback(
        (updater: (prev: RecipeTabsState) => RecipeTabsState) => {
            setTabs((prev) => {
                const next = updater(prev);
                if (!isAuthenticated) {
                    saveToStorage(next.recent);
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
            const response = await fetch(API_BASE);

            if (!response.ok) {
                throw new Error(`Failed to load recipe tabs (${response.status})`);
            }

            const { pinned: pinnedEntries, recent: recentEntries }: TabsApiResponse =
                await response.json();

            updateTabs(() => ({
                pinned: pinnedEntries
                    .map(withDefaultEmoji)
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
                recent: recentEntries.map(withDefaultEmoji),
            }));
        } catch (error) {
            console.error('Failed to refresh recipe tabs', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, updateTabs]);

    const migrateLocalData = useCallback(async () => {
        const stored = loadFromStorage();
        if (stored.recent.length === 0) return;
        try {
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
            saveToStorage([]);
        }
    }, []);

    useEffect(() => {
        const prevAuth = previousAuthRef.current;
        previousAuthRef.current = isAuthenticated;

        const initialize = async () => {
            if (isAuthenticated) {
                if (!prevAuth) {
                    // First time becoming authenticated — migrate any local data
                    setIsLoading(true);
                    await migrateLocalData();
                    if (skipInitialRefreshRef.current) {
                        // SSR already provided fresh data; no need to re-fetch
                        skipInitialRefreshRef.current = false;
                    } else {
                        await refreshData();
                    }
                    setIsLoading(false);
                } else {
                    await refreshData();
                }
            } else {
                setTabs(loadFromStorage());
            }
        };

        void initialize();
    }, [isAuthenticated, migrateLocalData, refreshData]);

    const pinRecipe = useCallback(
        async (recipe: RecipeTabItem) => {
            if (!isAuthenticated) return;

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
        [isAuthenticated, refreshData],
    );

    const unpinRecipe = useCallback(
        async (recipeId: string) => {
            if (!isAuthenticated) return;

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
        [isAuthenticated, refreshData],
    );

    const addToRecent = useCallback(
        async (recipe: RecipeTabItem) => {
            const normalized = withDefaultEmoji(recipe);
            // Optimistic update — move recipe to front, deduplicate, cap length
            updateTabs((prev) => ({
                ...prev,
                recent: [normalized, ...prev.recent.filter((item) => item.id !== recipe.id)].slice(
                    0,
                    MAX_RECENT,
                ),
            }));

            if (!isAuthenticated) return;

            try {
                const response = await fetch(RECENT_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipeId: recipe.id }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to log recipe view (${response.status})`);
                }
                // No refreshData() here — the optimistic update is sufficient for UI
            } catch (error) {
                console.error('Failed to track recipe view', error);
            }
        },
        [isAuthenticated, updateTabs],
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
