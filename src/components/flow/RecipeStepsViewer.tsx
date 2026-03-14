'use client';

import { List, RotateCcw, Smartphone, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CastButton } from '@app/components/cast/CastButton';
import { useCast } from '@app/hooks/useCast';
import { css } from 'styled-system/css';

import { CompletionBanner } from './viewer/CompletionBanner';
import { MobileView } from './viewer/MobileView';
import { NodeDetailModal } from './viewer/NodeDetailModal';
import { SimpleTextView } from './viewer/SimpleTextView';
import {
    clearPersistedState,
    deserializeViewerState,
    loadPersistedState,
    persistViewerState,
    serializeViewerState,
} from './viewer/viewerPersistence';
import type { PersistedViewerState } from './viewer/viewerPersistence';
import { viewerReducer } from './viewer/viewerTypes';
import type { RecipeStepsViewerProps, TimerState, ViewerAction } from './viewer/viewerTypes';
import { buildTopology } from './viewer/viewerUtils';

const DesktopView = dynamic(() => import('./viewer/DesktopView').then((m) => m.DesktopView), {
    ssr: false,
});

/** Actions that represent deliberate user interactions (not the 1s tick). */
const PERSISTABLE_ACTIONS = new Set<ViewerAction['type']>([
    'toggle',
    'timerStart',
    'timerPause',
    'timerReset',
]);

export function RecipeStepsViewer({
    nodes,
    edges,
    ingredients,
    recipeSlug,
    initialProgress,
    isAuthenticated,
}: RecipeStepsViewerProps & {
    initialProgress?: PersistedViewerState | null;
    isAuthenticated?: boolean;
}) {
    const { columnGroups, dagreY, outgoing } = useMemo(
        () => buildTopology(nodes, edges),
        [nodes, edges],
    );

    const [state, dispatch] = useReducer(viewerReducer, {
        completed: new Set<string>(),
        timers: new Map<string, TimerState>(),
    });

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'text'>('desktop');

    // ── Persistence refs ─────────────────────────────────────────────────
    const hydratedRef = useRef(false);
    const redisSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // ── Google Cast — send recipe slug to TV ─────────────────────────────
    const { castState, startCast, stopCast, sendMessage } = useCast();

    useEffect(() => {
        if (castState !== 'connected' || !recipeSlug) return;
        // Send immediately, then retry with delays to handle the async script-
        // load race condition on the receiver (Cast SDK loads dynamically, so
        // the receiver's message listener may not be registered when the first
        // message arrives right after SESSION_STARTED).
        const msg = { type: 'LOAD_RECIPE' as const, slug: recipeSlug };
        sendMessage(msg);
        const t1 = setTimeout(() => sendMessage(msg), 1500);
        const t2 = setTimeout(() => sendMessage(msg), 4000);
        const t3 = setTimeout(() => sendMessage(msg), 9000);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [castState, recipeSlug, sendMessage]);
    // ─────────────────────────────────────────────────────────────────────

    // Lock body scroll when overlay is open
    useEffect(() => {
        if (viewMode === 'mobile' || viewMode === 'text') {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [viewMode]);

    // Detect mobile devices
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e: MediaQueryListEvent) => setIsMobileDevice(e.matches);
        handler({ matches: mq.matches } as MediaQueryListEvent);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Build fresh timers from nodes (used as fallback and for resetAll)
    const buildFreshTimers = useCallback(() => {
        const timers = new Map<string, TimerState>();
        for (const n of nodes) {
            if (n.duration && n.duration > 0) {
                const total = n.duration * 60;
                timers.set(n.id, { remaining: total, running: false, total });
            }
        }
        return timers;
    }, [nodes]);

    // Initialize / hydrate timer state — priority: server > local > fresh
    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        // Try server-provided progress first
        if (initialProgress) {
            const hydrated = deserializeViewerState(initialProgress);
            dispatch({ type: 'hydrate', timers: hydrated.timers, completed: hydrated.completed });
            return;
        }

        // Try localStorage
        if (recipeSlug) {
            const local = loadPersistedState(recipeSlug);
            if (local) {
                dispatch({ type: 'hydrate', timers: local.timers, completed: local.completed });
                return;
            }
        }

        // Fallback: fresh timers from nodes
        dispatch({ type: 'init', timers: buildFreshTimers() });
    }, [nodes, recipeSlug, initialProgress, buildFreshTimers]);

    // Single global tick for all timers
    useEffect(() => {
        const interval = setInterval(() => {
            dispatch({ type: 'timerTick' });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Track whether we need to persist (bumped on user actions)
    const persistSeqRef = useRef(0);
    const [persistSeq, setPersistSeq] = useState(0);

    const trackedDispatch = useCallback((action: ViewerAction) => {
        dispatch(action);
        if (PERSISTABLE_ACTIONS.has(action.type)) {
            persistSeqRef.current += 1;
            setPersistSeq(persistSeqRef.current);
        }
    }, []);

    // Persist to localStorage + debounced Redis whenever persistSeq changes
    useEffect(() => {
        if (persistSeq === 0 || !recipeSlug) return;

        // localStorage — immediate
        persistViewerState(recipeSlug, state);

        // Redis — debounced 2s, using stateRef to avoid stale closure
        if (isAuthenticated) {
            if (redisSyncTimerRef.current) clearTimeout(redisSyncTimerRef.current);
            redisSyncTimerRef.current = setTimeout(async () => {
                const { syncRecipeProgress } = await import('@app/app/actions/recipe-progress');
                const serialized = serializeViewerState(stateRef.current);
                syncRecipeProgress(recipeSlug, serialized).catch(() => {});
            }, 2000);
        }
    }, [persistSeq, recipeSlug, state, isAuthenticated]);

    // ── Reset progress ───────────────────────────────────────────────────
    const hasProgress =
        state.completed.size > 0 ||
        [...state.timers.values()].some((t) => t.running || t.remaining < t.total);

    const handleReset = useCallback(async () => {
        if (!window.confirm('Möchtest du den Fortschritt für dieses Rezept zurücksetzen?')) return;

        dispatch({ type: 'resetAll', timers: buildFreshTimers() });

        if (recipeSlug) {
            clearPersistedState(recipeSlug);
        }

        if (isAuthenticated && recipeSlug) {
            const { deleteRecipeProgress } = await import('@app/app/actions/recipe-progress');
            deleteRecipeProgress(recipeSlug).catch(() => {});
        }
    }, [buildFreshTimers, recipeSlug, isAuthenticated]);
    // ─────────────────────────────────────────────────────────────────────

    const nonTrivialNodes = useMemo(
        () => nodes.filter((n) => n.type !== 'start' && n.type !== 'servieren'),
        [nodes],
    );
    const allStepsDone =
        nonTrivialNodes.length > 0 && nonTrivialNodes.every((n) => state.completed.has(n.id));

    // Clear persistence when all steps are done
    useEffect(() => {
        if (!allStepsDone || !recipeSlug) return;
        const timer = setTimeout(() => {
            clearPersistedState(recipeSlug);
            if (isAuthenticated) {
                import('@app/app/actions/recipe-progress').then(({ deleteRecipeProgress }) =>
                    deleteRecipeProgress(recipeSlug).catch(() => {}),
                );
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [allStepsDone, recipeSlug, isAuthenticated]);

    if (nodes.length === 0) {
        return (
            <div
                className={css({
                    py: '8',
                    textAlign: 'center',
                    color: 'text.muted',
                    fontSize: 'sm',
                })}
            >
                Noch keine Zubereitungsschritte vorhanden.
            </div>
        );
    }

    const sharedState = {
        completed: state.completed,
        timers: state.timers,
        dispatch: trackedDispatch,
        onOpenDetail: setSelectedNodeId,
        ingredients,
    };

    const mobileProps = { ...sharedState, columnGroups, edges, dagreY };
    const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

    return (
        <>
            {/* On mobile: show action buttons instead of desktop flow */}
            {isMobileDevice ? (
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3',
                        py: '4',
                        px: '4',
                    })}
                >
                    <button
                        type="button"
                        onClick={() => setViewMode('mobile')}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2',
                            py: '3.5',
                            px: '6',
                            borderRadius: 'xl',
                            border: 'none',
                            bg: 'primary',
                            color: 'white',
                            fontSize: 'md',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            _hover: { opacity: 0.9 },
                        })}
                    >
                        <Smartphone style={{ width: 18, height: 18 }} />
                        Rezept starten
                    </button>
                    {castState !== 'unavailable' && (
                        <CastButton castState={castState} onStart={startCast} onStop={stopCast} />
                    )}
                    <button
                        type="button"
                        onClick={() => setViewMode('text')}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2',
                            py: '3',
                            px: '6',
                            borderRadius: 'xl',
                            border: '1px solid',
                            borderColor: 'border.primary',
                            bg: 'transparent',
                            color: 'primary',
                            fontSize: 'sm',
                            fontWeight: '600',
                            cursor: 'pointer',
                        })}
                    >
                        <List style={{ width: 16, height: 16 }} />
                        Als Text anzeigen
                    </button>
                </div>
            ) : (
                <div
                    className={css({
                        bg: 'surface',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: {
                            base: 'rgba(224,123,83,0.12)',
                            _dark: 'rgba(224,123,83,0.15)',
                        },
                        overflow: 'hidden',
                        position: 'relative',
                    })}
                >
                    {/* View mode toggle buttons — top right */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            zIndex: 10,
                            display: 'flex',
                            gap: 6,
                            alignItems: 'center',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setViewMode('text')}
                            title="Textansicht"
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1',
                                py: '1',
                                px: '2.5',
                                borderRadius: 'full',
                                border: {
                                    base: '1px solid rgba(224,123,83,0.25)',
                                    _dark: '1px solid rgba(224,123,83,0.3)',
                                },
                                bg: { base: 'rgba(255,255,255,0.9)', _dark: 'rgba(30,33,38,0.9)' },
                                color: 'palette.orange',
                                fontSize: 'xs',
                                fontWeight: '600',
                                cursor: 'pointer',
                                backdropFilter: 'blur(4px)',
                            })}
                        >
                            <List style={{ width: 13, height: 13 }} /> Text
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('mobile')}
                            title="Mobile-Ansicht öffnen"
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1',
                                py: '1',
                                px: '2.5',
                                borderRadius: 'full',
                                border: {
                                    base: '1px solid rgba(224,123,83,0.25)',
                                    _dark: '1px solid rgba(224,123,83,0.3)',
                                },
                                bg: { base: 'rgba(255,255,255,0.9)', _dark: 'rgba(30,33,38,0.9)' },
                                color: 'palette.orange',
                                fontSize: 'xs',
                                fontWeight: '600',
                                cursor: 'pointer',
                                backdropFilter: 'blur(4px)',
                            })}
                        >
                            <Smartphone style={{ width: 13, height: 13 }} /> Mobil
                        </button>
                        <CastButton castState={castState} onStart={startCast} onStop={stopCast} />
                        {hasProgress && (
                            <button
                                type="button"
                                onClick={handleReset}
                                title="Fortschritt zurücksetzen"
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1',
                                    py: '1',
                                    px: '2.5',
                                    borderRadius: 'full',
                                    border: {
                                        base: '1px solid rgba(224,123,83,0.25)',
                                        _dark: '1px solid rgba(224,123,83,0.3)',
                                    },
                                    bg: {
                                        base: 'rgba(255,255,255,0.9)',
                                        _dark: 'rgba(30,33,38,0.9)',
                                    },
                                    color: 'text.muted',
                                    fontSize: 'xs',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    backdropFilter: 'blur(4px)',
                                    _hover: { color: 'palette.orange' },
                                })}
                            >
                                <RotateCcw style={{ width: 13, height: 13 }} />
                            </button>
                        )}
                    </div>

                    <DesktopView {...sharedState} nodes={nodes} edges={edges} outgoing={outgoing} />

                    {allStepsDone && <CompletionBanner />}
                </div>
            )}

            {/* Portaled overlays — escape any parent transform/stacking context */}
            {viewMode === 'text' &&
                createPortal(
                    <div
                        className={css({
                            position: 'fixed',
                            inset: 0,
                            zIndex: 300,
                            bg: 'background',
                            overflowY: 'auto',
                        })}
                    >
                        <div
                            style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                            }}
                            className={css({
                                bg: 'background',
                                borderBottom: '1px solid',
                                borderColor: {
                                    base: 'rgba(224,123,83,0.1)',
                                    _dark: 'rgba(224,123,83,0.15)',
                                },
                            })}
                        >
                            <span
                                className={css({
                                    fontWeight: 'bold',
                                    fontSize: 'md',
                                    color: 'text',
                                })}
                            >
                                Zubereitungsschritte
                            </span>
                            <button
                                type="button"
                                onClick={() => setViewMode('desktop')}
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: 'full',
                                    border: '1px solid',
                                    borderColor: 'rgba(224,123,83,0.2)',
                                    bg: 'surface',
                                    color: 'text.muted',
                                    cursor: 'pointer',
                                })}
                            >
                                <X style={{ width: 16, height: 16 }} />
                            </button>
                        </div>
                        <SimpleTextView
                            columnGroups={columnGroups}
                            completed={state.completed}
                            timers={state.timers}
                            dispatch={trackedDispatch}
                            ingredients={ingredients}
                        />
                    </div>,
                    document.body,
                )}

            {viewMode === 'mobile' &&
                createPortal(
                    <div
                        className={css({
                            position: 'fixed',
                            inset: 0,
                            zIndex: 300,
                            display: 'flex',
                            flexDirection: 'column',
                            background:
                                'linear-gradient(180deg, rgba(26,23,21,0.92) 0%, rgba(35,30,26,0.95) 40%, rgba(28,24,21,0.92) 100%)',
                            backdropFilter: 'blur(24px)',
                            // @ts-expect-error vendor prefix not in csstype
                            WebkitBackdropFilter: 'blur(24px)',
                        })}
                    >
                        <style>{`
                        @keyframes branchPulse {
                            0%, 100% { opacity: 0.7; }
                            50% { opacity: 1; }
                        }
                    `}</style>

                        {/* Close button — top right */}
                        <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 10 }}>
                            <button
                                type="button"
                                onClick={() => setViewMode('desktop')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                    color: 'rgba(255,255,255,0.7)',
                                    cursor: 'pointer',
                                }}
                            >
                                <X style={{ width: 16, height: 16 }} />
                            </button>
                        </div>

                        <MobileView {...mobileProps} />
                    </div>,
                    document.body,
                )}

            {selectedNode &&
                createPortal(
                    <NodeDetailModal
                        node={selectedNode}
                        ingredients={ingredients}
                        timerState={state.timers.get(selectedNodeId!)}
                        completed={state.completed.has(selectedNodeId!)}
                        onClose={() => setSelectedNodeId(null)}
                        onToggle={() =>
                            trackedDispatch({ type: 'toggle', nodeId: selectedNodeId! })
                        }
                        onTimerStart={() =>
                            trackedDispatch({ type: 'timerStart', nodeId: selectedNodeId! })
                        }
                        onTimerPause={() =>
                            trackedDispatch({ type: 'timerPause', nodeId: selectedNodeId! })
                        }
                        onTimerReset={() =>
                            trackedDispatch({ type: 'timerReset', nodeId: selectedNodeId! })
                        }
                    />,
                    document.body,
                )}
        </>
    );
}
