'use client';

import { List, Smartphone, X } from 'lucide-react';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';

import { CastButton } from '@app/components/cast/CastButton';
import { useCast } from '@app/hooks/useCast';
import { css } from 'styled-system/css';

import { CompletionBanner } from './viewer/CompletionBanner';
import { DesktopView } from './viewer/DesktopView';
import { MobileView } from './viewer/MobileView';
import { NodeDetailModal } from './viewer/NodeDetailModal';
import { SimpleTextView } from './viewer/SimpleTextView';
import { viewerReducer } from './viewer/viewerTypes';
import type { RecipeStepsViewerProps, TimerState } from './viewer/viewerTypes';
import { buildTopology } from './viewer/viewerUtils';

export function RecipeStepsViewer({ nodes, edges, ingredients, recipeSlug }: RecipeStepsViewerProps) {
    const { columnGroups, dagreY, outgoing } = useMemo(() => buildTopology(nodes, edges), [nodes, edges]);

    const [state, dispatch] = useReducer(viewerReducer, {
        completed: new Set<string>(),
        timers: new Map<string, TimerState>(),
    });

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'text'>('desktop');

    // ── Google Cast — send recipe slug to TV ─────────────────────────────
    const { castState, startCast, stopCast, sendMessage } = useCast();

    useEffect(() => {
        if (castState !== 'connected' || !recipeSlug) return;
        sendMessage({ type: 'LOAD_RECIPE', slug: recipeSlug });
    }, [castState, recipeSlug, sendMessage]);
    // ─────────────────────────────────────────────────────────────────────

    // Detect mobile devices
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e: MediaQueryListEvent) => setIsMobileDevice(e.matches);
        handler({ matches: mq.matches } as MediaQueryListEvent);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Initialize timer state from nodes
    useEffect(() => {
        const initialTimers = new Map<string, TimerState>();
        for (const n of nodes) {
            if (n.duration && n.duration > 0) {
                const total = n.duration * 60;
                initialTimers.set(n.id, { remaining: total, running: false, total });
            }
        }
        dispatch({ type: 'init', timers: initialTimers });
    }, [nodes]);

    // Single global tick for all timers
    useEffect(() => {
        const interval = setInterval(() => {
            dispatch({ type: 'timerTick' });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const nonTrivialNodes = useMemo(
        () => nodes.filter((n) => n.type !== 'start' && n.type !== 'servieren'),
        [nodes],
    );
    const allStepsDone =
        nonTrivialNodes.length > 0 && nonTrivialNodes.every((n) => state.completed.has(n.id));

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
        dispatch,
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
                        <CastButton
                            castState={castState}
                            onStart={startCast}
                            onStop={stopCast}
                        />
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
                        borderColor: 'rgba(224,123,83,0.12)',
                        overflow: 'hidden',
                        position: 'relative',
                    })}
                >
                    {/* View mode toggle buttons — top right */}
                    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
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
                                border: '1px solid rgba(224,123,83,0.25)',
                                bg: 'rgba(255,255,255,0.9)',
                                color: '#c45e30',
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
                                border: '1px solid rgba(224,123,83,0.25)',
                                bg: 'rgba(255,255,255,0.9)',
                                color: '#c45e30',
                                fontSize: 'xs',
                                fontWeight: '600',
                                cursor: 'pointer',
                                backdropFilter: 'blur(4px)',
                            })}
                        >
                            <Smartphone style={{ width: 13, height: 13 }} /> Mobil
                        </button>
                        <CastButton
                            castState={castState}
                            onStart={startCast}
                            onStop={stopCast}
                        />
                    </div>

                    <DesktopView {...sharedState} nodes={nodes} edges={edges} outgoing={outgoing} />

                    {allStepsDone && <CompletionBanner />}
                </div>
            )}

            {/* Portaled overlays — escape any parent transform/stacking context */}
            {viewMode === 'text' && createPortal(
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
                            borderColor: 'rgba(224,123,83,0.1)',
                        })}
                    >
                        <span className={css({ fontWeight: 'bold', fontSize: 'md', color: 'text' })}>
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
                        dispatch={dispatch}
                        ingredients={ingredients}
                    />
                </div>,
                document.body,
            )}

            {viewMode === 'mobile' && createPortal(
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        zIndex: 300,
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'linear-gradient(180deg, rgba(26,23,21,0.92) 0%, rgba(35,30,26,0.95) 40%, rgba(28,24,21,0.92) 100%)',
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

            {selectedNode && createPortal(
                <NodeDetailModal
                    node={selectedNode}
                    ingredients={ingredients}
                    timerState={state.timers.get(selectedNodeId!)}
                    completed={state.completed.has(selectedNodeId!)}
                    onClose={() => setSelectedNodeId(null)}
                    onToggle={() => dispatch({ type: 'toggle', nodeId: selectedNodeId! })}
                    onTimerStart={() => dispatch({ type: 'timerStart', nodeId: selectedNodeId! })}
                    onTimerPause={() => dispatch({ type: 'timerPause', nodeId: selectedNodeId! })}
                    onTimerReset={() => dispatch({ type: 'timerReset', nodeId: selectedNodeId! })}
                />,
                document.body,
            )}
        </>
    );
}
