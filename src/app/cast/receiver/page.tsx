'use client';

/**
 * Google Cast Web Receiver page — loaded by Chromecast devices on the TV.
 *
 * The TV displays the same MobileView used on the phone — no duplicate UI code.
 *
 * Setup:
 *  1. Host this app and note the URL, e.g. https://kuechentakt.de/cast/receiver
 *  2. Register a Receiver App at https://cast.google.com/publish with that URL.
 *  3. Set NEXT_PUBLIC_CAST_APP_ID in your .env with the resulting App ID.
 *  4. During development, enrol your Chromecast in the Cast SDK developer console.
 *
 * Message flow:
 *  Phone → [LOAD_RECIPE]  → TV initialises MobileView with nodes/edges
 *  Phone → [STEP_CHANGE]  → TV seeks MobileView to the matching node
 *  Phone → [TIMER_ACTION] → TV starts / pauses / resets that step's timer
 *  Phone → [STEP_COMPLETE]→ TV marks step done
 *
 * Touch-capable Cast devices (Google Nest Hub etc.):
 *  The Cast framework injects a <touch-controls> overlay that blocks all touch
 *  events.  We apply the Home Assistant hack: remove the overlay after ctx.start()
 *  and restore overflow-y.  MobileView's own swipe/tap handlers then work natively.
 */

import { useEffect, useMemo, useReducer, useState } from 'react';

import { MobileView } from '@app/components/flow/viewer/MobileView';
import { viewerReducer } from '@app/components/flow/viewer/viewerTypes';
import type { TimerState } from '@app/components/flow/viewer/viewerTypes';
import { buildTopology } from '@app/components/flow/viewer/viewerUtils';
import type { FlowEdgeSerialized, FlowNodeSerialized } from '@app/components/flow/editor/editorTypes';
import type { CastMessage } from '@app/hooks/useCast';
import { CAST_NAMESPACE } from '@app/hooks/useCast';
import { PALETTE } from '@app/lib/palette';

// ── Cast Receiver SDK types ─────────────────────────────────────────────
interface CastReceiverOptions {
    touchScreenOptimizedApp?: boolean;
    maxInactivity?: number;
}

interface CastReceiverContext {
    start: (options?: CastReceiverOptions) => void;
    addCustomMessageListener: (ns: string, handler: (ev: { data: string }) => void) => void;
    getDeviceCapabilities: () => { touch_input_supported?: boolean } | null;
}

declare global {
    interface Window {
        cast?: {
            framework: {
                CastReceiverContext: { getInstance: () => CastReceiverContext };
            };
        };
    }
}
// ───────────────────────────────────────────────────────────────────────

export default function CastReceiverPage() {
    const [nodes, setNodes] = useState<FlowNodeSerialized[]>([]);
    const [edges, setEdges] = useState<FlowEdgeSerialized[]>([]);
    const [externalNodeId, setExternalNodeId] = useState<string | undefined>();
    const [ready, setReady] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    const [state, dispatch] = useReducer(viewerReducer, {
        completed: new Set<string>(),
        timers: new Map<string, TimerState>(),
    });

    // Global timer tick.
    useEffect(() => {
        const id = setInterval(() => dispatch({ type: 'timerTick' }), 1000);
        return () => clearInterval(id);
    }, []);

    // Boot the Cast Receiver SDK and listen for messages.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const script = document.createElement('script');
        script.src = '//www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
        script.onload = () => {
            const ctx = window.cast?.framework.CastReceiverContext.getInstance();
            if (!ctx) return;

            ctx.addCustomMessageListener(CAST_NAMESPACE, ({ data }) => {
                let msg: CastMessage;
                try { msg = JSON.parse(data) as CastMessage; } catch { return; }

                switch (msg.type) {
                    case 'LOAD_RECIPE': {
                        setNodes(msg.nodes);
                        setEdges(msg.edges);
                        setExternalNodeId(msg.nodes[msg.stepIndex]?.id);
                        const timers = new Map(
                            msg.nodes
                                .filter((n) => n.duration && n.duration > 0)
                                .map((n) => [n.id, {
                                    remaining: n.duration! * 60,
                                    running: false,
                                    total: n.duration! * 60,
                                }]),
                        );
                        dispatch({ type: 'init', timers });
                        setReady(true);
                        break;
                    }
                    case 'STEP_CHANGE':
                        // Use functional setNodes to read current nodes without a stale closure.
                        setNodes((currentNodes) => {
                            const nodeId = currentNodes[msg.stepIndex]?.id;
                            if (nodeId) setExternalNodeId(nodeId);
                            return currentNodes;
                        });
                        break;
                    case 'TIMER_ACTION': {
                        const { nodeId, action } = msg;
                        if (action === 'start') dispatch({ type: 'timerStart', nodeId });
                        else if (action === 'pause') dispatch({ type: 'timerPause', nodeId });
                        else if (action === 'reset') dispatch({ type: 'timerReset', nodeId });
                        break;
                    }
                    case 'STEP_COMPLETE':
                        dispatch({ type: 'toggle', nodeId: msg.nodeId });
                        break;
                }
            });

            ctx.start({ touchScreenOptimizedApp: true });

            // ── Home Assistant touch hack ─────────────────────────────────────
            // The Cast framework injects a <touch-controls> element after start()
            // that intercepts all pointer/touch events on touch-screen Cast devices
            // (Nest Hub etc.). Remove it and restore scrolling — same approach used
            // by Home Assistant since 2019.
            const caps = ctx.getDeviceCapabilities?.();
            if (caps?.touch_input_supported) {
                setIsTouchDevice(true);
                const breakFree = () => {
                    document.body.querySelector('touch-controls')?.remove();
                    document.body.setAttribute('style', 'overflow-y: auto !important');
                };
                breakFree();
                setTimeout(breakFree, 500);
                setTimeout(breakFree, 1500);
            }
        };
        document.head.appendChild(script);
    }, []);

    const { columnGroups, dagreY } = useMemo(
        () => buildTopology(nodes, edges),
        [nodes, edges],
    );

    // ── Waiting screen ──────────────────────────────────────────────────
    if (!ready) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#111',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                fontFamily: '-apple-system, Inter, sans-serif',
            }}>
                <div style={{
                    width: 88, height: 88, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${PALETTE.orange} 0%, #f8b500 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
                }}>
                    🍳
                </div>
                <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
                    KüchenTakt
                </div>
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.38)' }}>
                    Warte auf Rezept vom Sender…
                </div>
                <div style={{ display: 'flex', gap: 7, marginTop: 6 }}>
                    {[0, 1, 2].map((i) => (
                        <div key={i} style={{
                            width: 9, height: 9, borderRadius: '50%',
                            backgroundColor: PALETTE.orange,
                            animation: `w 1.4s ease-in-out ${i * 0.22}s infinite`,
                            opacity: 0.6,
                        }} />
                    ))}
                </div>
                <style>{`
                    @keyframes w{0%,80%,100%{transform:scale(.65);opacity:.35}40%{transform:scale(1.1);opacity:1}}
                    *{box-sizing:border-box;margin:0;padding:0}
                    body{background:#111;overflow:hidden}
                `}</style>
            </div>
        );
    }

    // ── Active recipe — rendered as MobileView ──────────────────────────
    return (
        <div style={{
            height: '100vh',
            background: 'linear-gradient(180deg, rgba(26,23,21,0.98) 0%, rgba(35,30,26,1) 100%)',
            overflow: isTouchDevice ? 'auto' : 'hidden',
            fontFamily: '-apple-system, Inter, sans-serif',
        }}>
            <style>{`
                @keyframes branchPulse{0%,100%{opacity:.7}50%{opacity:1}}
                *{box-sizing:border-box;margin:0;padding:0}
                body{background:#1a1714;${isTouchDevice ? 'overflow-y:auto' : 'overflow:hidden'}}
            `}</style>
            <MobileView
                columnGroups={columnGroups}
                edges={edges}
                dagreY={dagreY}
                completed={state.completed}
                timers={state.timers}
                dispatch={dispatch}
                onOpenDetail={() => {/* read-only on TV */}}
                externalNodeId={externalNodeId}
            />
        </div>
    );
}
