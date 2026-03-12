'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * useState-like hook that persists the value in localStorage.
 *
 * - SSR-safe: returns `defaultValue` during server render
 * - Handles JSON serialization for objects/arrays; stores primitives as-is
 * - Silently falls back to in-memory state if localStorage is unavailable
 */
export function useLocalStorage<T>(
    key: string,
    defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const stored = localStorage.getItem(key);
            if (stored === null) return defaultValue;
            return JSON.parse(stored) as T;
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Quota exceeded or private browsing — silently ignore
        }
    }, [key, value]);

    const set = useCallback((next: T | ((prev: T) => T)) => {
        setValue((prev) => {
            const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
            return resolved;
        });
    }, []);

    return [value, set];
}
