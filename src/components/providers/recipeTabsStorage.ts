import {
    MAX_PINNED,
    MAX_RECENT,
    type RecipeTabItem,
    type RecipeTabsData,
} from '@app/lib/recipe-tabs/types';
import { STORAGE_KEYS } from '@app/lib/storageKeys';

/**
 * Guest persistence for the "Zuletzt" header bar.
 *
 * localStorage is the source of truth for guests: every mutation is a
 * synchronous read-modify-write against storage. That makes the result
 * independent of React effect ordering — a page can track a view before
 * the provider has hydrated its state without wiping older entries.
 */

const STORAGE_KEY = STORAGE_KEYS.recipeTabs;
const LEGACY_STORAGE_KEY = STORAGE_KEYS.recipeTabsLegacy;

const EMPTY: RecipeTabsData = { pinned: [], recent: [] };

function sanitizeItems(value: unknown, limit: number): RecipeTabItem[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter(
            (item): item is RecipeTabItem =>
                !!item && typeof item === 'object' && typeof item.id === 'string',
        )
        .slice(0, limit);
}

export function readGuestTabs(): RecipeTabsData {
    if (typeof window === 'undefined') return EMPTY;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                pinned: sanitizeItems(parsed.pinned, MAX_PINNED),
                recent: sanitizeItems(parsed.recent, MAX_RECENT),
            };
        }
        // One-time import from the pre-rebuild storage format (recent only)
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
            const parsed = JSON.parse(legacy);
            const migrated: RecipeTabsData = {
                pinned: [],
                recent: sanitizeItems(parsed.recent, MAX_RECENT),
            };
            writeGuestTabs(migrated);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            return migrated;
        }
    } catch (error) {
        console.error('Failed to read recipe tabs from storage', error);
    }
    return EMPTY;
}

function writeGuestTabs(data: RecipeTabsData) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to write recipe tabs to storage', error);
    }
}

export function clearGuestTabs() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear recipe tabs storage', error);
    }
}

export function guestAddRecent(recipe: RecipeTabItem): RecipeTabsData {
    const current = readGuestTabs();
    const next: RecipeTabsData = {
        pinned: current.pinned,
        recent: [recipe, ...current.recent.filter((item) => item.id !== recipe.id)].slice(
            0,
            MAX_RECENT,
        ),
    };
    writeGuestTabs(next);
    return next;
}

/** Pins a recipe; when all slots are taken, the oldest pin is replaced. */
export function guestPin(recipe: RecipeTabItem): RecipeTabsData {
    const current = readGuestTabs();
    if (current.pinned.some((item) => item.id === recipe.id)) return current;
    const pinned = [...current.pinned, recipe];
    const next: RecipeTabsData = {
        pinned: pinned.length > MAX_PINNED ? pinned.slice(pinned.length - MAX_PINNED) : pinned,
        recent: current.recent,
    };
    writeGuestTabs(next);
    return next;
}

export function guestUnpin(recipeId: string): RecipeTabsData {
    const current = readGuestTabs();
    const next: RecipeTabsData = {
        pinned: current.pinned.filter((item) => item.id !== recipeId),
        recent: current.recent,
    };
    writeGuestTabs(next);
    return next;
}
