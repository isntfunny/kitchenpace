'use client';

import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSession } from '@app/lib/auth-client';
import {
    MAX_PINNED,
    MAX_RECENT,
    type RecipeTabItem,
    type RecipeTabsData,
} from '@app/lib/recipe-tabs/types';

import {
    addToRecentAction,
    migrateGuestTabsAction,
    pinRecipeAction,
    refreshRecipeTabsAction,
    unpinRecipeAction,
} from './recipeTabsActions';
import {
    clearGuestTabs,
    guestAddRecent,
    guestPin,
    guestUnpin,
    readGuestTabs,
} from './recipeTabsStorage';

export type { RecipeTabItem };

interface RecipeTabsContextValue {
    pinned: RecipeTabItem[];
    recent: RecipeTabItem[];
    isLoading: boolean;
    isAuthenticated: boolean;
    pinRecipe: (recipe: RecipeTabItem) => Promise<void>;
    unpinRecipe: (recipeId: string) => Promise<void>;
    addToRecent: (recipe: RecipeTabItem, source?: string | null) => Promise<void>;
    refreshData: () => Promise<void>;
}

export const RecipeTabsContext = createContext<RecipeTabsContextValue | null>(null);

interface RecipeTabsProviderProps {
    children: React.ReactNode;
    initialPinned?: RecipeTabItem[];
    initialRecent?: RecipeTabItem[];
    /** Auth state as the server saw it — avoids waiting for the client session fetch */
    initialAuthenticated?: boolean;
}

export function RecipeTabsProvider({
    children,
    initialPinned = [],
    initialRecent = [],
    initialAuthenticated = false,
}: RecipeTabsProviderProps) {
    const { data: session, isPending } = useSession();
    // While the client session is still loading, trust what the server rendered.
    const isAuthenticated = isPending ? initialAuthenticated : !!session?.user?.id;

    const [tabs, setTabs] = useState<RecipeTabsData>({
        pinned: initialPinned,
        recent: initialRecent,
    });
    const [isLoading, setIsLoading] = useState(false);

    // Mutation callbacks need the auth state synchronously, without re-creating
    // themselves (and re-running consumer effects) on every auth flip.
    const authRef = useRef(isAuthenticated);
    authRef.current = isAuthenticated;

    // True until the SSR-provided data has been consumed by the auth effect once.
    const serverDataFreshRef = useRef(initialAuthenticated);

    const refreshData = useCallback(async () => {
        if (!authRef.current) {
            setTabs(readGuestTabs());
            return;
        }
        setIsLoading(true);
        try {
            setTabs(await refreshRecipeTabsAction());
        } catch (error) {
            console.error('Failed to refresh recipe tabs', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const initialize = async () => {
            if (!isAuthenticated) {
                serverDataFreshRef.current = false;
                setTabs(readGuestTabs());
                return;
            }

            // Signed in: import any guest data left in localStorage. This also
            // covers logins that went through a full page reload.
            const guest = readGuestTabs();
            if (guest.recent.length > 0 || guest.pinned.length > 0) {
                setIsLoading(true);
                try {
                    const result = await migrateGuestTabsAction({
                        recentIds: guest.recent.map((item) => item.id),
                        pinnedIds: guest.pinned.map((item) => item.id),
                    });
                    clearGuestTabs();
                    if (!cancelled) setTabs(result);
                } catch (error) {
                    console.error('Failed to migrate guest recipe tabs', error);
                } finally {
                    if (!cancelled) setIsLoading(false);
                }
                serverDataFreshRef.current = false;
                return;
            }

            if (serverDataFreshRef.current) {
                // The layout already fetched this user's tabs server-side.
                serverDataFreshRef.current = false;
                return;
            }

            // Client-side login without reload — fetch fresh data.
            await refreshData();
        };

        void initialize();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, refreshData]);

    const addToRecent = useCallback(async (recipe: RecipeTabItem, source?: string | null) => {
        if (!authRef.current) {
            setTabs(guestAddRecent(recipe));
            return;
        }
        setTabs((prev) => ({
            pinned: prev.pinned,
            recent: [recipe, ...prev.recent.filter((item) => item.id !== recipe.id)].slice(
                0,
                MAX_RECENT,
            ),
        }));
        try {
            await addToRecentAction(recipe.id, source);
        } catch (error) {
            console.error('Failed to track recipe view', error);
        }
    }, []);

    const pinRecipe = useCallback(
        async (recipe: RecipeTabItem) => {
            if (!authRef.current) {
                setTabs(guestPin(recipe));
                return;
            }
            // Optimistic: mirror the server's replace-oldest behavior.
            setTabs((prev) => {
                if (prev.pinned.some((item) => item.id === recipe.id)) return prev;
                const pinned = [...prev.pinned, recipe];
                return {
                    pinned:
                        pinned.length > MAX_PINNED
                            ? pinned.slice(pinned.length - MAX_PINNED)
                            : pinned,
                    recent: prev.recent,
                };
            });
            try {
                setTabs(await pinRecipeAction(recipe.id));
            } catch (error) {
                console.error('Failed to pin recipe', error);
                await refreshData();
            }
        },
        [refreshData],
    );

    const unpinRecipe = useCallback(
        async (recipeId: string) => {
            if (!authRef.current) {
                setTabs(guestUnpin(recipeId));
                return;
            }
            setTabs((prev) => ({
                pinned: prev.pinned.filter((item) => item.id !== recipeId),
                recent: prev.recent,
            }));
            try {
                setTabs(await unpinRecipeAction(recipeId));
            } catch (error) {
                console.error('Failed to unpin recipe', error);
                await refreshData();
            }
        },
        [refreshData],
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
        [tabs, isLoading, isAuthenticated, pinRecipe, unpinRecipe, addToRecent, refreshData],
    );

    return <RecipeTabsContext.Provider value={contextValue}>{children}</RecipeTabsContext.Provider>;
}
