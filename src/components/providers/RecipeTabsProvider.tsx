'use client';

import { useSession } from 'next-auth/react';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    addToRecentAction,
    migrateLocalRecipesAction,
    pinRecipeAction,
    refreshRecipeTabsAction,
    unpinRecipeAction,
} from '@app/app/actions/recipe-tabs';

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

function applyTabsResult(result: {
    pinned: RecipeTabItem[];
    recent: RecipeTabItem[];
}): RecipeTabsState {
    return {
        pinned: result.pinned
            .map(withDefaultEmoji)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
        recent: result.recent.map(withDefaultEmoji),
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
            const result = await refreshRecipeTabsAction();
            updateTabs(() => applyTabsResult(result));
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
            const result = await migrateLocalRecipesAction(
                stored.recent.slice(0, MAX_RECENT).map((r) => r.id),
            );
            updateTabs(() => applyTabsResult(result));
        } catch (error) {
            console.error('Failed to migrate local recipes', error);
        } finally {
            saveToStorage([]);
        }
    }, [updateTabs]);

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
                        skipInitialRefreshRef.current = false;
                    } else {
                        await refreshData();
                    }
                    setIsLoading(false);
                } else if (skipInitialRefreshRef.current) {
                    // Already authenticated on load — trust SSR data
                    skipInitialRefreshRef.current = false;
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

            // Optimistic update
            const prevTabs = tabs;
            updateTabs((prev) => ({
                ...prev,
                pinned: [...prev.pinned, withDefaultEmoji(recipe)],
            }));

            try {
                const result = await pinRecipeAction(recipe.id);
                updateTabs(() => applyTabsResult(result));
            } catch (error) {
                console.error('Failed to pin recipe', error);
                updateTabs(() => prevTabs);
            }
        },
        [isAuthenticated, tabs, updateTabs],
    );

    const unpinRecipe = useCallback(
        async (recipeId: string) => {
            if (!isAuthenticated) return;

            // Optimistic update
            const prevTabs = tabs;
            updateTabs((prev) => ({
                ...prev,
                pinned: prev.pinned.filter((item) => item.id !== recipeId),
            }));

            try {
                const result = await unpinRecipeAction(recipeId);
                updateTabs(() => applyTabsResult(result));
            } catch (error) {
                console.error('Failed to unpin recipe', error);
                updateTabs(() => prevTabs);
            }
        },
        [isAuthenticated, tabs, updateTabs],
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
                await addToRecentAction(recipe.id);
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
