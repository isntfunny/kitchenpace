'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * useState-like hook that persists the value in localStorage.
 *
 * - SSR-safe: returns `defaultValue` during server render (via useSyncExternalStore)
 * - No hydration mismatch: client first renders defaultValue, then syncs
 * - Handles JSON serialization for objects/arrays
 * - Silently falls back to in-memory state if localStorage is unavailable
 */
export function useLocalStorage<T>(
    key: string,
    defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
    const listenersRef = useRef(new Set<() => void>());
    const valueRef = useRef(defaultValue);

    const subscribe = useCallback((onStoreChange: () => void) => {
        listenersRef.current.add(onStoreChange);
        return () => {
            listenersRef.current.delete(onStoreChange);
        };
    }, []);

    const getSnapshot = useCallback(() => valueRef.current, []);
    const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

    // Read from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored !== null) {
                valueRef.current = JSON.parse(stored) as T;
                listenersRef.current.forEach((fn) => fn());
            }
        } catch {
            // localStorage unavailable
        }
    }, [key]);

    const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    // Persist changes to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Quota exceeded or private browsing
        }
    }, [key, value]);

    const set = useCallback((next: T | ((prev: T) => T)) => {
        const prev = valueRef.current;
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        valueRef.current = resolved;
        listenersRef.current.forEach((fn) => fn());
    }, []);

    return [value, set];
}
