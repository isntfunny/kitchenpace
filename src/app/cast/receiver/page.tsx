'use client';

/**
 * Google Cast Web Receiver page — loaded by Chromecast devices on the TV.
 *
 * Setup:
 *  1. Host this app and note the URL of this page, e.g.
 *     https://kuechentakt.de/cast/receiver
 *  2. Register a Receiver App at https://cast.google.com/publish with that URL.
 *  3. Set NEXT_PUBLIC_CAST_APP_ID in your .env file with the resulting App ID.
 *  4. During development, enrol your Chromecast in the Cast SDK developer console.
 *
 * Message flow:
 *  Phone → [LOAD_RECIPE]  → TV initialises recipe + timers
 *  Phone → [STEP_CHANGE]  → TV highlights the new current step
 *  Phone → [TIMER_ACTION] → TV starts / pauses / resets that step's timer
 *  Phone → [STEP_COMPLETE]→ TV marks step done
 *
 * Navigation on TV is READ-ONLY — the phone / tablet is the sole controller.
 * The existing mobile cooking view (MobileView) on the phone is the touch remote.
 */

import { useEffect, useReducer, useState } from 'react';

import type { FlowEdgeSerialized, FlowNodeSerialized, StepType } from '@app/components/flow/editor/editorTypes';
import { getStepConfig } from '@app/components/flow/editor/stepConfig';
import { viewerReducer } from '@app/components/flow/viewer/viewerTypes';
import type { CastMessage } from '@app/hooks/useCast';
import { CAST_NAMESPACE } from '@app/hooks/useCast';
import { PALETTE } from '@app/lib/palette';

// ── Cast Receiver SDK types ─────────────────────────────────────────────
declare global {
    interface Window {
        cast?: {
            framework: {
                CastReceiverContext: {
                    getInstance: () => {
                        start: () => void;
                        addCustomMessageListener: (
                            ns: string,
                            handler: (ev: { data: string }) => void,
                        ) => void;
                    };
                };
            };
        };
    }
}
// ───────────────────────────────────────────────────────────────────────

function fmt(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function CastReceiverPage() {
    const [title, setTitle] = useState('KüchenTakt');
    const [image, setImage] = useState<string | null>(null);
    const [nodes, setNodes] = useState<FlowNodeSerialized[]>([]);
    const [, setEdges] = useState<FlowEdgeSerialized[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [ready, setReady] = useState(false);

    const [state, dispatch] = useReducer(viewerReducer, {
        completed: new Set<string>(),
        timers: new Map(),
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
        script.src =
            '//www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
        script.onload = () => {
            const ctx = window.cast?.framework.CastReceiverContext.getInstance();
            if (!ctx) return;

            ctx.addCustomMessageListener(CAST_NAMESPACE, ({ data }) => {
                let msg: CastMessage;
                try {
                    msg = JSON.parse(data) as CastMessage;
                } catch {
                    return;
                }

                switch (msg.type) {
                    case 'LOAD_RECIPE': {
                        setTitle(msg.title);
                        setImage(msg.recipeImage ?? null);
                        setNodes(msg.nodes);
                        setEdges(msg.edges);
                        setStepIndex(msg.stepIndex);
                        const timers = new Map(
                            msg.nodes
                                .filter((n) => n.duration && n.duration > 0)
                                .map((n) => [
                                    n.id,
                                    {
                                        remaining: n.duration! * 60,
                                        running: false,
                                        total: n.duration! * 60,
                                    },
                                ]),
                        );
                        dispatch({ type: 'init', timers });
                        setReady(true);
                        break;
                    }
                    case 'STEP_CHANGE':
                        setStepIndex(msg.stepIndex);
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

            ctx.start();
        };
        document.head.appendChild(script);
    }, []);

    // ── Waiting screen ──────────────────────────────────────────────
    if (!ready) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    background: '#111',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 20,
                    fontFamily: '-apple-system, Inter, sans-serif',
                }}
            >
                <div
                    style={{
                        width: 88,
                        height: 88,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${PALETTE.orange} 0%, #f8b500 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 40,
                    }}
                >
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
                        <div
                            key={i}
                            style={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                backgroundColor: PALETTE.orange,
                                animation: `w 1.4s ease-in-out ${i * 0.22}s infinite`,
                                opacity: 0.6,
                            }}
                        />
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

    // ── Active recipe display ───────────────────────────────────────
    const node = nodes[stepIndex] as FlowNodeSerialized | undefined;
    const config = node ? getStepConfig(node.type as StepType) : null;
    const Icon = config?.icon;
    const timerState = node ? state.timers.get(node.id) : undefined;
    const hasTimer = !!timerState;
    const timerDone = hasTimer && timerState!.remaining === 0;
    const timerRunning = hasTimer && timerState!.running;
    const pct = hasTimer
        ? ((timerState!.total - timerState!.remaining) / timerState!.total) * 100
        : 0;
    const isCompleted = node ? state.completed.has(node.id) : false;

    return (
        <div
            style={{
                height: '100vh',
                display: 'flex',
                background: '#111',
                overflow: 'hidden',
                fontFamily: '-apple-system, Inter, sans-serif',
                position: 'relative',
            }}
        >
            <style>{`
                @keyframes timerPulse{0%,100%{box-shadow:0 0 0 0 rgba(224,123,83,.4)}50%{box-shadow:0 0 0 14px rgba(224,123,83,0)}}
                @keyframes donePulse{0%,100%{box-shadow:0 0 0 0 rgba(0,184,148,.4)}50%{box-shadow:0 0 0 16px rgba(0,184,148,0)}}
                @keyframes stepIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
                *{box-sizing:border-box;margin:0;padding:0}
                body{background:#111;overflow:hidden}
            `}</style>

            {/* Recipe hero image — right panel */}
            {image && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '38%',
                        height: '100%',
                        overflow: 'hidden',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={image}
                        alt={title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                                'linear-gradient(to right, #111 0%, rgba(17,17,17,0.5) 30%, transparent 60%)',
                        }}
                    />
                </div>
            )}

            {/* Left content panel — re-animates on each step change via key */}
            <div
                key={stepIndex}
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: image ? '56px 64px' : '56px 10vw',
                    gap: 28,
                    zIndex: 1,
                    maxWidth: image ? '62%' : '100%',
                    animation: 'stepIn 0.4s ease',
                }}
            >
                {/* Recipe title + step counter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span
                        style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: PALETTE.orange,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {title}
                    </span>
                    <span
                        style={{
                            fontSize: 14,
                            color: 'rgba(255,255,255,0.28)',
                            marginLeft: 'auto',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        Schritt {stepIndex + 1} / {nodes.length}
                    </span>
                </div>

                {/* Step type badge */}
                {config && Icon && (
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            backgroundColor: config.color,
                            borderRadius: 999,
                            padding: '10px 24px',
                            alignSelf: 'flex-start',
                        }}
                    >
                        <Icon style={{ width: 22, height: 22, color: '#555' }} />
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#555' }}>
                            {config.label}
                        </span>
                    </div>
                )}

                {/* Step title */}
                {node && (
                    <h1
                        style={{
                            fontSize: 'clamp(40px, 5vw, 64px)',
                            fontWeight: 900,
                            color: isCompleted ? PALETTE.emerald : '#fff',
                            lineHeight: 1.08,
                            letterSpacing: '-1.5px',
                            transition: 'color 0.35s ease',
                        }}
                    >
                        {isCompleted && '✓ '}
                        {node.label}
                    </h1>
                )}

                {/* Description */}
                {node?.description && (
                    <p
                        style={{
                            fontSize: 'clamp(18px, 2.2vw, 26px)',
                            color: 'rgba(255,255,255,0.6)',
                            lineHeight: 1.65,
                            maxWidth: 580,
                        }}
                    >
                        {node.description.replace(/@\[([^\]]+)\]\([^)]+\)/g, '$1')}
                    </p>
                )}

                {/* Timer */}
                {hasTimer && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                        <div
                            style={{
                                width: 120,
                                height: 120,
                                borderRadius: '50%',
                                background: `conic-gradient(${timerDone ? PALETTE.emerald : PALETTE.orange} ${pct * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                animation: timerRunning && !timerDone
                                    ? 'timerPulse 2s ease-in-out infinite'
                                    : timerDone
                                      ? 'donePulse 1.5s ease-in-out infinite'
                                      : 'none',
                            }}
                        >
                            <div
                                style={{
                                    width: 90,
                                    height: 90,
                                    borderRadius: '50%',
                                    backgroundColor: '#171717',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: timerDone ? 30 : 22,
                                        fontWeight: 900,
                                        color: timerDone ? PALETTE.emerald : '#fff',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {timerDone ? '✓' : fmt(timerState!.remaining)}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.38)', marginBottom: 4 }}>
                                {timerDone ? 'Zeit abgelaufen!' : timerRunning ? 'Läuft…' : `${node?.duration} Minuten`}
                            </div>
                            {timerDone && (
                                <div style={{ fontSize: 28, fontWeight: 800, color: PALETTE.emerald }}>
                                    Fertig ✓
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Step progress dots — bottom centre */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 28,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 8,
                    zIndex: 2,
                }}
            >
                {nodes.map((n, i) => (
                    <div
                        key={n.id}
                        style={{
                            width: i === stepIndex ? 28 : 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: state.completed.has(n.id)
                                ? PALETTE.emerald
                                : i === stepIndex
                                  ? PALETTE.orange
                                  : 'rgba(255,255,255,0.2)',
                            transition: 'all 0.3s ease',
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
