'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { LaneGrid, TimerState } from './types';

/** Builds initial timer state from a grid — every step with a duration gets a timer */
function buildInitialTimers(grid: LaneGrid): Map<string, TimerState> {
    const m = new Map<string, TimerState>();
    for (const seg of grid.segments) {
        for (const lane of seg.lanes) {
            for (const step of lane) {
                if (step.duration) {
                    m.set(step.id, {
                        remaining: step.duration * 60,
                        total: step.duration * 60,
                        running: false,
                    });
                }
            }
        }
    }
    return m;
}

export function useTimers(grid: LaneGrid) {
    const [timers, setTimers] = useState<Map<string, TimerState>>(() => buildInitialTimers(grid));
    const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            for (const interval of intervalsRef.current.values()) {
                clearInterval(interval);
            }
        };
    }, []);

    const start = useCallback((id: string) => {
        // Clear existing interval
        const existing = intervalsRef.current.get(id);
        if (existing) clearInterval(existing);

        setTimers((prev) => {
            const t = prev.get(id);
            if (!t || t.remaining === 0) return prev;
            const next = new Map(prev);
            next.set(id, { ...t, running: true });
            return next;
        });

        const interval = setInterval(() => {
            setTimers((prev) => {
                const t = prev.get(id);
                if (!t || !t.running) {
                    clearInterval(interval);
                    intervalsRef.current.delete(id);
                    return prev;
                }
                if (t.remaining <= 1) {
                    clearInterval(interval);
                    intervalsRef.current.delete(id);
                    const next = new Map(prev);
                    next.set(id, { ...t, remaining: 0, running: false });
                    return next;
                }
                const next = new Map(prev);
                next.set(id, { ...t, remaining: t.remaining - 1 });
                return next;
            });
        }, 1000);
        intervalsRef.current.set(id, interval);
    }, []);

    const pause = useCallback((id: string) => {
        const existing = intervalsRef.current.get(id);
        if (existing) {
            clearInterval(existing);
            intervalsRef.current.delete(id);
        }
        setTimers((prev) => {
            const t = prev.get(id);
            if (!t) return prev;
            const next = new Map(prev);
            next.set(id, { ...t, running: false });
            return next;
        });
    }, []);

    const reset = useCallback((id: string) => {
        const existing = intervalsRef.current.get(id);
        if (existing) {
            clearInterval(existing);
            intervalsRef.current.delete(id);
        }
        setTimers((prev) => {
            const t = prev.get(id);
            if (!t) return prev;
            const next = new Map(prev);
            next.set(id, { remaining: t.total, total: t.total, running: false });
            return next;
        });
    }, []);

    return { timers, start, pause, reset };
}
