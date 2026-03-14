import { STORAGE_KEYS } from '@app/lib/storageKeys';

import type { TimerState, ViewerState } from './viewerTypes';

interface PersistedTimer {
    remaining: number;
    running: boolean;
    total: number;
    startedAt?: string;
}

export interface PersistedViewerState {
    version: 1;
    timers: Record<string, PersistedTimer>;
    completed: string[];
    updatedAt: string;
}

/** Serialize ViewerState (Map/Set) to a plain JSON-safe object. */
export function serializeViewerState(state: ViewerState): PersistedViewerState {
    const timers: Record<string, PersistedTimer> = {};
    for (const [id, t] of state.timers) {
        timers[id] = {
            remaining: t.remaining,
            running: t.running,
            total: t.total,
            startedAt: t.startedAt,
        };
    }
    return {
        version: 1,
        timers,
        completed: [...state.completed],
        updatedAt: new Date().toISOString(),
    };
}

/** Rehydrate a persisted state back into Map/Set, recalculating running timers. */
export function deserializeViewerState(persisted: PersistedViewerState): ViewerState {
    const timers = new Map<string, TimerState>();
    for (const [id, t] of Object.entries(persisted.timers)) {
        if (t.running && t.startedAt) {
            const elapsed = (Date.now() - Date.parse(t.startedAt)) / 1000;
            const remaining = Math.max(t.total - Math.floor(elapsed), 0);
            timers.set(id, {
                remaining,
                running: remaining > 0,
                total: t.total,
                startedAt: remaining > 0 ? t.startedAt : undefined,
            });
        } else {
            timers.set(id, {
                remaining: t.remaining,
                running: false,
                total: t.total,
            });
        }
    }
    return {
        timers,
        completed: new Set(persisted.completed),
    };
}

/** Persist viewer state to localStorage. */
export function persistViewerState(recipeSlug: string, state: ViewerState): void {
    try {
        const data = serializeViewerState(state);
        localStorage.setItem(STORAGE_KEYS.viewerProgress + recipeSlug, JSON.stringify(data));
    } catch {
        // localStorage may be full or unavailable — fail silently
    }
}

/** Load persisted viewer state from localStorage, recalculating running timers. */
export function loadPersistedState(recipeSlug: string): ViewerState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.viewerProgress + recipeSlug);
        if (!raw) return null;
        const persisted = JSON.parse(raw) as PersistedViewerState;
        if (persisted.version !== 1) return null;
        return deserializeViewerState(persisted);
    } catch {
        return null;
    }
}

/** Remove persisted viewer state from localStorage. */
export function clearPersistedState(recipeSlug: string): void {
    try {
        localStorage.removeItem(STORAGE_KEYS.viewerProgress + recipeSlug);
    } catch {
        // fail silently
    }
}
