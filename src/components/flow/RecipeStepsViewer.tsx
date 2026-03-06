'use client';

import {
    applyNodeChanges,
    Background,
    Handle,
    MarkerType,
    Position,
    ReactFlow,
    type Node as RFNode,
    type NodeChange,
    type NodeProps,
} from '@xyflow/react';
import {
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    Monitor,
    Pause,
    Play,
    RotateCcw,
    Smartphone,
    Sparkles,
    X,
} from 'lucide-react';
import '@xyflow/react/dist/style.css';
import { type ComponentType, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { css } from 'styled-system/css';

import type { FlowEdgeSerialized, FlowNodeSerialized, StepType } from './editor/editorTypes';
import { getStepConfig } from './editor/stepConfig';

/* ── types ───────────────────────────────────────────────── */

export interface RecipeStepsViewerProps {
    nodes: FlowNodeSerialized[];
    edges: FlowEdgeSerialized[];
    ingredients?: { id: string; name: string; amount?: string; unit?: string }[];
}

interface TimerState {
    remaining: number; // seconds left
    running: boolean;
    total: number; // total seconds
}

interface ViewerState {
    completed: Set<string>;
    timers: Map<string, TimerState>;
}

type ViewerAction =
    | { type: 'toggle'; nodeId: string }
    | { type: 'timerStart'; nodeId: string }
    | { type: 'timerPause'; nodeId: string }
    | { type: 'timerReset'; nodeId: string }
    | { type: 'timerTick' }
    | { type: 'init'; timers: Map<string, TimerState> };

function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
    switch (action.type) {
        case 'toggle': {
            const next = new Set(state.completed);
            const t = state.timers.get(action.nodeId);
            if (next.has(action.nodeId)) {
                next.delete(action.nodeId);
                // Reset timer when uncompleting so the card isn't left in timerDone visual state
                if (t && t.total > 0) {
                    const nextTimers = new Map(state.timers);
                    nextTimers.set(action.nodeId, {
                        remaining: t.total,
                        running: false,
                        total: t.total,
                    });
                    return { completed: next, timers: nextTimers };
                }
                return { ...state, completed: next };
            }
            next.add(action.nodeId);
            // Finish the timer when marking as done
            if (t && (t.running || t.remaining > 0)) {
                const nextTimers = new Map(state.timers);
                nextTimers.set(action.nodeId, { ...t, running: false, remaining: 0 });
                return { completed: next, timers: nextTimers };
            }
            return { ...state, completed: next };
        }
        case 'timerStart': {
            const t = state.timers.get(action.nodeId);
            if (!t || t.remaining === 0) return state;
            const next = new Map(state.timers);
            next.set(action.nodeId, { ...t, running: true });
            return { ...state, timers: next };
        }
        case 'timerPause': {
            const t = state.timers.get(action.nodeId);
            if (!t) return state;
            const next = new Map(state.timers);
            next.set(action.nodeId, { ...t, running: false });
            return { ...state, timers: next };
        }
        case 'timerReset': {
            const t = state.timers.get(action.nodeId);
            if (!t) return state;
            const next = new Map(state.timers);
            next.set(action.nodeId, { remaining: t.total, running: false, total: t.total });
            return { ...state, timers: next };
        }
        case 'timerTick': {
            let changed = false;
            const next = new Map(state.timers);
            for (const [id, t] of next) {
                if (!t.running) continue;
                if (t.remaining <= 0) {
                    next.set(id, { ...t, running: false });
                    changed = true;
                } else {
                    next.set(id, { ...t, remaining: t.remaining - 1 });
                    changed = true;
                }
            }
            return changed ? { ...state, timers: next } : state;
        }
        case 'init':
            return { ...state, timers: action.timers };
        default:
            return state;
    }
}

/* ── topology builder ────────────────────────────────────── */

interface Topology {
    columnGroups: FlowNodeSerialized[][];
    outgoing: Map<string, string[]>;
    incoming: Map<string, string[]>;
    nodeById: Map<string, FlowNodeSerialized>;
}

function buildTopology(nodes: FlowNodeSerialized[], edges: FlowEdgeSerialized[]): Topology {
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    for (const n of nodes) {
        outgoing.set(n.id, []);
        incoming.set(n.id, []);
    }
    for (const e of edges) {
        outgoing.get(e.source)?.push(e.target);
        incoming.get(e.target)?.push(e.source);
    }

    // BFS column assignment: column = max(parent column + 1)
    const columns = new Map<string, number>();
    const startId = nodes.find((n) => n.type === 'start')?.id ?? nodes[0]?.id;
    if (!startId) return { columnGroups: [], outgoing, incoming, nodeById };

    columns.set(startId, 0);
    const queue = [startId];
    const enqueued = new Set([startId]);

    while (queue.length > 0) {
        const id = queue.shift()!;
        const col = columns.get(id) ?? 0;
        for (const child of outgoing.get(id) ?? []) {
            const existing = columns.get(child) ?? -1;
            columns.set(child, Math.max(existing, col + 1));
            if (!enqueued.has(child)) {
                enqueued.add(child);
                queue.push(child);
            }
        }
    }

    // Nodes not reachable from start: place at column 0
    for (const n of nodes) {
        if (!columns.has(n.id)) columns.set(n.id, 0);
    }

    const maxCol = Math.max(0, ...columns.values());
    const groups: FlowNodeSerialized[][] = Array.from({ length: maxCol + 1 }, () => []);
    for (const [nodeId, col] of columns) {
        const node = nodeById.get(nodeId);
        if (node) groups[col].push(node);
    }

    return { columnGroups: groups, outgoing, incoming, nodeById };
}

/* ── helpers ─────────────────────────────────────────────── */

function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

const MENTION_REGEX = /@\[(.*?)(?:\|(.*?))?\]\((.*?)\)/g;

function renderDescription(
    text: string,
    ingredients: RecipeStepsViewerProps['ingredients'],
): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    MENTION_REGEX.lastIndex = 0;

    while ((match = MENTION_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
        const [, name, override, id] = match;
        const ing = ingredients?.find((i) => i.id === id);
        const amountStr = override
            ? ` (${override})`
            : ing && (ing.amount || ing.unit)
              ? ` (${[ing.amount, ing.unit].filter(Boolean).join(' ')})`
              : '';
        parts.push(
            <span
                key={match.index}
                style={{
                    backgroundColor: 'rgba(224,123,83,0.15)',
                    color: '#c45e30',
                    borderRadius: 4,
                    padding: '0 3px',
                    fontWeight: 600,
                }}
            >
                {name}
                {amountStr}
            </span>,
        );
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
}

/* ── animated connector ──────────────────────────────────── */

function Connector({
    sourceDone,
    timerPct,
    vertical = false,
}: {
    sourceDone: boolean;
    timerPct: number; // 0-100
    vertical?: boolean;
}) {
    const fillPct = sourceDone ? 100 : timerPct;
    const fillColor = sourceDone ? '#00b894' : '#e07b53';
    const glowColor = sourceDone ? 'rgba(0,184,148,0.5)' : 'rgba(224,123,83,0.45)';

    if (vertical) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: 36,
                    flexShrink: 0,
                }}
            >
                <div style={{ position: 'relative', width: 2, height: 32 }}>
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.08)',
                            borderRadius: 1,
                        }}
                    />
                    {fillPct > 0 && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: `${fillPct}%`,
                                backgroundColor: fillColor,
                                borderRadius: 1,
                                boxShadow: fillPct > 5 ? `0 0 6px ${glowColor}` : 'none',
                                transition: sourceDone ? 'height 0.4s ease' : 'height 1s linear',
                            }}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: 44,
                position: 'relative',
            }}
        >
            {/* Track */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    borderRadius: 1,
                }}
            />
            {/* Fill */}
            {fillPct > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        height: 2,
                        width: `${fillPct}%`,
                        backgroundColor: fillColor,
                        borderRadius: 1,
                        boxShadow: fillPct > 5 ? `0 0 6px ${glowColor}` : 'none',
                        transition: sourceDone ? 'width 0.4s ease' : 'width 1s linear',
                    }}
                />
            )}
            {/* Arrowhead */}
            <div
                style={{
                    position: 'absolute',
                    right: 2,
                    width: 0,
                    height: 0,
                    borderTop: '4px solid transparent',
                    borderBottom: '4px solid transparent',
                    borderLeft: `5px solid ${fillPct >= 99 ? fillColor : 'rgba(0,0,0,0.15)'}`,
                    transition: 'border-left-color 0.4s ease',
                }}
            />
        </div>
    );
}

/* ── color helpers ───────────────────────────────────────── */

/** Interpolate between orange (#e07b53) and green (#00b894) based on 0-100 pct */
function timerColor(pct: number): string {
    const r = Math.round(224 - 224 * (pct / 100));
    const g = Math.round(123 + 61 * (pct / 100));
    const b = Math.round(83 + 65 * (pct / 100));
    return `rgb(${r},${g},${b})`;
}

/* ── node detail modal ───────────────────────────────────── */

const MODAL_MENTION_RE = /@\[.*?(?:\|.*?)?\]\((.*?)\)/g;

function NodeDetailModal({
    node,
    ingredients,
    timerState,
    completed,
    onClose,
    onToggle,
    onTimerStart,
    onTimerPause,
    onTimerReset,
}: {
    node: FlowNodeSerialized;
    ingredients?: RecipeStepsViewerProps['ingredients'];
    timerState?: TimerState;
    completed: boolean;
    onClose: () => void;
    onToggle: () => void;
    onTimerStart: () => void;
    onTimerPause: () => void;
    onTimerReset: () => void;
}) {
    const config = getStepConfig(node.type as StepType);
    const Icon = config.icon;
    const isSpecial = node.type === 'start' || node.type === 'servieren';

    const stepIngredients = useMemo(() => {
        if (!node.description || !ingredients) return [];
        const ids = new Set<string>();
        for (const m of node.description.matchAll(MODAL_MENTION_RE)) ids.add(m[1]);
        return ingredients.filter((i) => ids.has(i.id));
    }, [node.description, ingredients]);

    const hasTimer = !!timerState;
    const timerRunning = hasTimer && timerState!.running;
    const pct = hasTimer
        ? ((timerState!.total - timerState!.remaining) / timerState!.total) * 100
        : 0;
    const timerDone = hasTimer && timerState!.remaining === 0;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                backdropFilter: 'blur(2px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: 20,
                    maxWidth: 480,
                    width: '100%',
                    maxHeight: '88vh',
                    overflowY: 'auto',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                    position: 'relative',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 10,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: node.photoUrl ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: node.photoUrl ? 'white' : '#555',
                    }}
                >
                    <X style={{ width: 16, height: 16 }} />
                </button>

                {/* Photo */}
                {node.photoUrl && (
                    <img
                        src={node.photoUrl}
                        alt=""
                        style={{
                            width: '100%',
                            height: 220,
                            objectFit: 'cover',
                            borderRadius: '20px 20px 0 0',
                            display: 'block',
                        }}
                    />
                )}

                {/* Timer progress bar */}
                {hasTimer && (
                    <div style={{ height: 4, backgroundColor: 'rgba(0,0,0,0.06)' }}>
                        <div
                            style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: timerDone
                                    ? '#00b894'
                                    : 'linear-gradient(90deg, #e07b53, #f39c12)',
                                transition: 'width 1s linear',
                                boxShadow:
                                    timerRunning && pct > 0
                                        ? '0 0 8px rgba(224,123,83,0.6)'
                                        : 'none',
                            }}
                        />
                    </div>
                )}

                <div style={{ padding: '20px 24px 28px' }}>
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 12,
                        }}
                    >
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: config.color,
                                backgroundImage: config.gradient,
                                borderRadius: 999,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#555',
                            }}
                        >
                            <Icon style={{ width: 12, height: 12 }} />
                            {config.label}
                        </span>
                        {hasTimer && (
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 12,
                                    color: timerRunning ? '#e07b53' : '#888',
                                    fontWeight: timerRunning ? 700 : 400,
                                    marginLeft: 'auto',
                                }}
                            >
                                <Clock style={{ width: 13, height: 13 }} />
                                {timerRunning || pct > 0
                                    ? formatTime(timerState!.remaining)
                                    : `${node.duration} Min.`}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h3
                        style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: '#1a1a1a',
                            marginBottom: 12,
                            lineHeight: 1.2,
                        }}
                    >
                        {node.label}
                    </h3>

                    {/* Description */}
                    {node.description && (
                        <p
                            style={{
                                fontSize: 14,
                                color: '#555',
                                lineHeight: 1.65,
                                marginBottom: 16,
                            }}
                        >
                            {renderDescription(node.description, ingredients)}
                        </p>
                    )}

                    {/* Step ingredients */}
                    {stepIngredients.length > 0 && (
                        <div
                            style={{
                                backgroundColor: 'rgba(224,123,83,0.06)',
                                border: '1px solid rgba(224,123,83,0.15)',
                                borderRadius: 12,
                                padding: '12px 16px',
                                marginBottom: 16,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase' as const,
                                    letterSpacing: '0.06em',
                                    color: '#c0623e',
                                    marginBottom: 8,
                                }}
                            >
                                Zutaten für diesen Schritt
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column' as const,
                                    gap: 6,
                                }}
                            >
                                {stepIngredients.map((ing) => (
                                    <div
                                        key={ing.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            fontSize: 13,
                                            color: '#333',
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                backgroundColor: '#e07b53',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span style={{ fontWeight: 600 }}>{ing.name}</span>
                                        {(ing.amount || ing.unit) && (
                                            <span style={{ color: '#888', marginLeft: 'auto' }}>
                                                {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timer controls */}
                    {hasTimer && !completed && !isSpecial && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 16,
                            }}
                        >
                            <button
                                type="button"
                                onClick={timerRunning ? onTimerPause : onTimerStart}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: '10px 16px',
                                    borderRadius: 12,
                                    border: `1.5px solid ${timerRunning ? 'rgba(231,76,60,0.3)' : 'rgba(224,123,83,0.3)'}`,
                                    backgroundColor: timerRunning
                                        ? 'rgba(231,76,60,0.08)'
                                        : 'rgba(224,123,83,0.08)',
                                    color: timerRunning ? '#e74c3c' : '#e07b53',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                {timerRunning ? (
                                    <>
                                        <Pause style={{ width: 14, height: 14 }} /> Pause
                                    </>
                                ) : (
                                    <>
                                        <Play style={{ width: 14, height: 14 }} /> Timer starten
                                    </>
                                )}
                            </button>
                            {pct > 0 && (
                                <button
                                    type="button"
                                    onClick={onTimerReset}
                                    style={{
                                        padding: '10px',
                                        borderRadius: 12,
                                        border: '1.5px solid rgba(0,0,0,0.1)',
                                        backgroundColor: 'rgba(0,0,0,0.04)',
                                        color: '#999',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <RotateCcw style={{ width: 14, height: 14 }} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Done button */}
                    {!isSpecial && (
                        <button
                            type="button"
                            onClick={() => {
                                onToggle();
                                onClose();
                            }}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: 12,
                                border: completed ? '1.5px solid rgba(0,184,148,0.3)' : 'none',
                                backgroundColor: completed ? 'rgba(0,184,148,0.1)' : '#e07b53',
                                color: completed ? '#00b894' : 'white',
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {completed ? (
                                <>
                                    <CheckCircle2 style={{ width: 16, height: 16 }} /> Als erledigt
                                    markiert
                                </>
                            ) : (
                                'Als erledigt markieren'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── step card ───────────────────────────────────────────── */

function StepCard({
    node,
    completed,
    active,
    timerState,
    onToggle,
    onTimerStart,
    onTimerPause,
    onTimerReset,
    onOpenDetail,
    ingredients,
    compact = false,
    fullWidth = false,
}: {
    node: FlowNodeSerialized;
    completed: boolean;
    active: boolean;
    timerState?: TimerState;
    onToggle: () => void;
    onTimerStart: () => void;
    onTimerPause: () => void;
    onTimerReset: () => void;
    onOpenDetail: () => void;
    ingredients?: RecipeStepsViewerProps['ingredients'];
    compact?: boolean;
    fullWidth?: boolean;
}) {
    const config = getStepConfig(node.type as StepType);
    const Icon = config.icon;
    const hasTimer = !!timerState;
    const timerDone = hasTimer && timerState!.remaining === 0;
    const timerRunning = hasTimer && timerState!.running;
    const pct = hasTimer
        ? ((timerState!.total - timerState!.remaining) / timerState!.total) * 100
        : 0;

    const isSpecial = node.type === 'start' || node.type === 'servieren';

    return (
        <div
            data-node-id={node.id}
            onClick={onOpenDetail}
            style={{
                width: fullWidth ? '100%' : compact ? 200 : 220,
                borderRadius: 16,
                overflow: 'hidden',
                border: 'none',
                boxShadow:
                    active && !completed
                        ? '0 4px 20px rgba(224,123,83,0.18)'
                        : '0 2px 8px rgba(0,0,0,0.07)',
                transition: 'all 0.2s ease',
                backgroundImage: config.gradient,
                backgroundColor: config.color,
                flexShrink: 0,
                cursor: 'pointer',
                position: 'relative',
            }}
        >
            {/* Timer progress bar at top */}
            {hasTimer && (
                <div style={{ height: 3, backgroundColor: 'rgba(0,0,0,0.06)' }}>
                    <div
                        style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: timerDone
                                ? '#00b894'
                                : 'linear-gradient(90deg, #e07b53, #f39c12)',
                            transition: 'width 1s linear',
                            borderRadius: '0 2px 2px 0',
                            boxShadow:
                                timerRunning && pct > 0 ? '0 0 8px rgba(224,123,83,0.6)' : 'none',
                        }}
                    />
                </div>
            )}

            <div style={{ padding: compact ? '8px 10px 10px' : '10px 12px 12px' }}>
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 6,
                    }}
                >
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: 'rgba(255,255,255,0.65)',
                            borderRadius: 999,
                            padding: '2px 8px',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#555',
                        }}
                    >
                        <Icon style={{ width: 11, height: 11 }} />
                        {config.label}
                    </span>
                    {hasTimer && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: 10,
                                color: timerRunning ? '#e07b53' : '#888',
                                marginLeft: 'auto',
                                fontWeight: timerRunning ? 700 : 400,
                                transition: 'color 0.2s ease',
                            }}
                        >
                            <Clock style={{ width: 10, height: 10 }} />
                            {timerRunning || pct > 0
                                ? formatTime(timerState!.remaining)
                                : `${node.duration} Min.`}
                        </span>
                    )}
                    {completed && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                backgroundColor: '#00b894',
                                marginLeft: hasTimer ? 0 : 'auto',
                                flexShrink: 0,
                            }}
                        >
                            <Check style={{ width: 10, height: 10, color: 'white' }} />
                        </span>
                    )}
                </div>

                {/* Title */}
                <div
                    style={{
                        fontSize: compact ? 13 : 14,
                        fontWeight: 700,
                        color: '#1a1a1a',
                        marginBottom: 4,
                        lineHeight: 1.3,
                    }}
                >
                    {node.label}
                </div>

                {/* Description */}
                {node.description && !compact && (
                    <div
                        style={
                            {
                                fontSize: 12,
                                color: '#666',
                                lineHeight: 1.5,
                                marginBottom: 8,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                            } as React.CSSProperties
                        }
                    >
                        {renderDescription(node.description, ingredients)}
                    </div>
                )}

                {/* Photo */}
                {node.photoUrl && !compact && (
                    <div
                        style={{
                            borderRadius: 8,
                            overflow: 'hidden',
                            marginBottom: 8,
                            marginTop: 4,
                        }}
                    >
                        <img
                            src={node.photoUrl}
                            alt=""
                            style={{
                                width: '100%',
                                height: 72,
                                objectFit: 'cover',
                                display: 'block',
                            }}
                        />
                    </div>
                )}

                {/* Actions */}
                {!isSpecial && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            marginTop: 8,
                        }}
                    >
                        {/* Timer controls */}
                        {hasTimer && !completed && (
                            <div
                                style={{ display: 'flex', gap: 4 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (timerRunning) { onTimerPause(); } else { onTimerStart(); }
                                    }}
                                    title={timerRunning ? 'Pause' : 'Timer starten'}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 26,
                                        height: 26,
                                        borderRadius: '50%',
                                        backgroundColor: timerRunning
                                            ? 'rgba(231,76,60,0.1)'
                                            : 'rgba(224,123,83,0.1)',
                                        border: `1.5px solid ${timerRunning ? 'rgba(231,76,60,0.3)' : 'rgba(224,123,83,0.3)'}`,
                                        cursor: 'pointer',
                                        color: timerRunning ? '#e74c3c' : '#e07b53',
                                    }}
                                >
                                    {timerRunning ? (
                                        <Pause style={{ width: 10, height: 10 }} />
                                    ) : (
                                        <Play style={{ width: 10, height: 10 }} />
                                    )}
                                </button>
                                {pct > 0 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTimerReset();
                                        }}
                                        title="Zurücksetzen"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 26,
                                            height: 26,
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(0,0,0,0.05)',
                                            border: '1.5px solid rgba(0,0,0,0.1)',
                                            cursor: 'pointer',
                                            color: '#999',
                                        }}
                                    >
                                        <RotateCcw style={{ width: 10, height: 10 }} />
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle();
                            }}
                            style={{
                                marginLeft: 'auto',
                                flexShrink: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: completed
                                    ? '1.5px solid rgba(0,184,148,0.3)'
                                    : timerDone
                                      ? '1.5px solid #00b894'
                                      : '1.5px solid rgba(0,0,0,0.12)',
                                backgroundColor: completed
                                    ? 'rgba(0,184,148,0.1)'
                                    : timerDone
                                      ? '#00b894'
                                      : 'rgba(255,255,255,0.7)',
                                color: completed ? '#00b894' : timerDone ? 'white' : '#888',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {completed ? (
                                <>
                                    <CheckCircle2 style={{ width: 11, height: 11 }} />
                                    Fertig
                                </>
                            ) : (
                                'Erledigt'
                            )}
                        </button>
                    </div>
                )}

                {/* Servieren button */}
                {node.type === 'servieren' && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        style={{
                            width: '100%',
                            marginTop: 8,
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            backgroundColor: completed ? 'rgba(0,184,148,0.12)' : '#e07b53',
                            color: completed ? '#00b894' : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        {completed ? (
                            <>
                                <Check style={{ width: 13, height: 13 }} /> Guten Appetit!
                            </>
                        ) : (
                            'Fertig kochen!'
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── mini-map ────────────────────────────────────────────── */

function MiniMap({
    columnGroups,
    completed,
    currentCol,
    currentRow,
}: {
    columnGroups: FlowNodeSerialized[][];
    completed: Set<string>;
    currentCol: number;
    currentRow: number;
}) {
    return (
        <div
            style={{
                position: 'absolute',
                top: 10,
                right: 10,
                backgroundColor: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 10,
                padding: '6px 8px',
                display: 'flex',
                gap: 4,
                alignItems: 'flex-start',
                boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                zIndex: 20,
                backdropFilter: 'blur(4px)',
            }}
        >
            {columnGroups.map((group, colIdx) => (
                <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {group.map((node, rowIdx) => {
                        const isCurrent = colIdx === currentCol && rowIdx === currentRow;
                        const isDone = completed.has(node.id);
                        return (
                            <div
                                key={node.id}
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: isDone
                                        ? '#00b894'
                                        : isCurrent
                                          ? '#e07b53'
                                          : 'rgba(0,0,0,0.15)',
                                    border: isCurrent ? '1.5px solid #e07b53' : 'none',
                                    boxShadow: isCurrent
                                        ? '0 0 0 2px rgba(224,123,83,0.25)'
                                        : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

/* ── desktop: horizontal column view ─────────────────────── */

/* ── viewer node for read-only xyflow desktop view ──────── */

interface ViewerNodeData extends Record<string, unknown> {
    sNode: FlowNodeSerialized;
    completed: boolean;
    active: boolean;
    timerState: TimerState | undefined;
    onToggle: () => void;
    onTimerStart: () => void;
    onTimerPause: () => void;
    onTimerReset: () => void;
    onOpenDetail: () => void;
    ingredients: RecipeStepsViewerProps['ingredients'] | undefined;
}

const INVIS_HANDLE: React.CSSProperties = { opacity: 0, pointerEvents: 'none' };

function ViewerNodeRenderer({ data }: NodeProps) {
    const d = data as ViewerNodeData;
    return (
        <>
            <Handle type="target" position={Position.Left} style={INVIS_HANDLE} />
            <Handle id="top-in" type="target" position={Position.Top} style={INVIS_HANDLE} />
            <Handle id="bottom-in" type="target" position={Position.Bottom} style={INVIS_HANDLE} />
            <StepCard
                node={d.sNode}
                completed={d.completed}
                active={d.active}
                timerState={d.timerState}
                onToggle={d.onToggle}
                onTimerStart={d.onTimerStart}
                onTimerPause={d.onTimerPause}
                onTimerReset={d.onTimerReset}
                onOpenDetail={d.onOpenDetail}
                ingredients={d.ingredients}
            />
            <Handle type="source" position={Position.Right} style={INVIS_HANDLE} />
            <Handle id="top-out" type="source" position={Position.Top} style={INVIS_HANDLE} />
            <Handle id="bottom-out" type="source" position={Position.Bottom} style={INVIS_HANDLE} />
        </>
    );
}

// Module-level constant — must never be recreated inside a render
const VIEWER_NODE_TYPES: Record<string, ComponentType<NodeProps>> = Object.fromEntries(
    (
        [
            'start',
            'kochen',
            'schneiden',
            'braten',
            'backen',
            'mixen',
            'warten',
            'wuerzen',
            'anrichten',
            'servieren',
        ] as const
    ).map((t) => [t, ViewerNodeRenderer as ComponentType<NodeProps>]),
);

/* ── desktop: read-only xyflow view ─────────────────────── */

function DesktopView({
    nodes,
    outgoing,
    edges,
    completed,
    timers,
    dispatch,
    onOpenDetail,
    ingredients,
}: {
    nodes: FlowNodeSerialized[];
    outgoing: Map<string, string[]>;
    edges: FlowEdgeSerialized[];
    completed: Set<string>;
    timers: Map<string, TimerState>;
    dispatch: React.Dispatch<ViewerAction>;
    onOpenDetail: (nodeId: string) => void;
    ingredients?: RecipeStepsViewerProps['ingredients'];
}) {
    const makeNodeData = useCallback(
        (node: FlowNodeSerialized): ViewerNodeData => ({
            sNode: node,
            completed: completed.has(node.id),
            active:
                !completed.has(node.id) &&
                (outgoing.get(node.id)?.every((c) => completed.has(c)) === false ||
                    node.type === 'start'),
            timerState: timers.get(node.id),
            onToggle: () => dispatch({ type: 'toggle', nodeId: node.id }),
            onTimerStart: () => dispatch({ type: 'timerStart', nodeId: node.id }),
            onTimerPause: () => dispatch({ type: 'timerPause', nodeId: node.id }),
            onTimerReset: () => dispatch({ type: 'timerReset', nodeId: node.id }),
            onOpenDetail: () => onOpenDetail(node.id),
            ingredients,
        }),
        [completed, timers, outgoing, dispatch, onOpenDetail, ingredients],
    );

    const buildRfEdges = useCallback(
        () =>
            edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const sourceDone = completed.has(edge.source) || sourceNode?.type === 'start';
                const t = timers.get(edge.source);
                const timerPct =
                    t && t.total > 0 ? ((t.total - t.remaining) / t.total) * 100 : 0;
                const stroke = sourceDone
                    ? '#00b894'
                    : timerPct > 0
                      ? timerColor(timerPct)
                      : 'rgba(0,0,0,0.18)';
                return {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    type: 'smoothstep',
                    style: { stroke, strokeWidth: sourceDone ? 2.5 : 2 },
                    animated: !sourceDone && (t?.running ?? false),
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: stroke,
                        width: 14,
                        height: 14,
                    },
                };
            }),
        [edges, nodes, completed, timers],
    );

    const [rfNodes, setRfNodes] = useState<RFNode[]>(() =>
        nodes.map((n) => ({ id: n.id, type: n.type, position: n.position ?? { x: 0, y: 0 }, data: makeNodeData(n) })),
    );
    const [rfEdges, setRfEdges] = useState(() => buildRfEdges());

    // Allow xyflow to apply dimension measurements (needed for fitView)
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setRfNodes((nds) => applyNodeChanges(changes, nds)),
        [],
    );

    // Sync node data when completion/timer state changes (preserve xyflow's measured sizes)
    useEffect(() => {
        setRfNodes((nds) =>
            nds.map((n) => {
                const orig = nodes.find((o) => o.id === n.id);
                return orig ? { ...n, data: makeNodeData(orig) } : n;
            }),
        );
    }, [completed, timers, makeNodeData, nodes]);

    // Sync edge styles when state changes
    useEffect(() => {
        setRfEdges(buildRfEdges());
    }, [buildRfEdges]);

    // Container height based on node bounding box
    const containerHeight = useMemo(() => {
        if (nodes.length === 0) return 400;
        const ys = nodes.map((n) => n.position?.y ?? 0);
        return Math.max(420, Math.min(740, Math.max(...ys) - Math.min(...ys) + 380));
    }, [nodes]);

    return (
        <div style={{ height: containerHeight, position: 'relative' }}>
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={VIEWER_NODE_TYPES}
                onNodesChange={onNodesChange}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag
                zoomOnScroll
                fitView
                fitViewOptions={{ padding: 0.18 }}
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={24} color="rgba(0,0,0,0.035)" size={1} />
            </ReactFlow>
        </div>
    );
}


/* ── mobile: swipeable single-step view ──────────────────── */

function MobileView({
    columnGroups,
    completed,
    timers,
    dispatch,
    onOpenDetail,
    ingredients,
}: {
    columnGroups: FlowNodeSerialized[][];
    completed: Set<string>;
    timers: Map<string, TimerState>;
    dispatch: React.Dispatch<ViewerAction>;
    onOpenDetail: (nodeId: string) => void;
    ingredients?: RecipeStepsViewerProps['ingredients'];
}) {
    const [position, setPosition] = useState({ col: 0, row: 0 });
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const { col, row } = position;
    const currentGroup = columnGroups[col] ?? [];
    const currentNode = currentGroup[row];

    const canGoLeft = col > 0;
    const canGoRight = col < columnGroups.length - 1;
    const canGoUp = row > 0;
    const canGoDown = row < currentGroup.length - 1;

    const prevNode = canGoLeft
        ? columnGroups[col - 1]?.[Math.min(row, (columnGroups[col - 1]?.length ?? 1) - 1)]
        : null;
    const nextNode = canGoRight ? columnGroups[col + 1]?.[0] : null;
    const upNode = canGoUp ? currentGroup[row - 1] : null;
    const downNode = canGoDown ? currentGroup[row + 1] : null;

    const goLeft = useCallback(() => {
        if (!canGoLeft) return;
        setPosition((p) => ({
            col: p.col - 1,
            row: Math.min(p.row, (columnGroups[p.col - 1]?.length ?? 1) - 1),
        }));
    }, [canGoLeft, columnGroups]);

    const goRight = useCallback(() => {
        if (!canGoRight) return;
        setPosition((p) => ({ col: p.col + 1, row: 0 }));
    }, [canGoRight]);

    const goUp = useCallback(() => {
        if (!canGoUp) return;
        setPosition((p) => ({ ...p, row: p.row - 1 }));
    }, [canGoUp]);

    const goDown = useCallback(() => {
        if (!canGoDown) return;
        setPosition((p) => ({ ...p, row: p.row + 1 }));
    }, [canGoDown]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = e.changedTouches[0].clientY - touchStart.current.y;
        const threshold = 50;
        touchStart.current = null;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
            if (dx < 0) goRight();
            else goLeft();
        } else if (Math.abs(dy) > threshold) {
            if (dy < 0) goDown();
            else goUp();
        }
    };

    if (!currentNode) return null;

    const navLabelStyle: React.CSSProperties = {
        fontSize: 10,
        fontWeight: 600,
        color: 'rgba(0,0,0,0.45)',
        maxWidth: 64,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        lineHeight: 1.2,
    };

    const navBtnStyle = (enabled: boolean): React.CSSProperties => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '8px 12px',
        borderRadius: 12,
        border: 'none',
        backgroundColor: enabled ? 'rgba(224,123,83,0.08)' : 'transparent',
        cursor: enabled ? 'pointer' : 'default',
        opacity: enabled ? 1 : 0.2,
        transition: 'all 0.15s ease',
        minWidth: 56,
    });

    return (
        <div
            style={{ position: 'relative', userSelect: 'none' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <MiniMap
                columnGroups={columnGroups}
                completed={completed}
                currentCol={col}
                currentRow={row}
            />

            {/* Up navigation */}
            {(canGoUp || canGoDown) && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 12,
                        paddingTop: 8,
                        paddingBottom: 4,
                    }}
                >
                    <button
                        type="button"
                        style={navBtnStyle(canGoUp)}
                        onClick={goUp}
                        disabled={!canGoUp}
                    >
                        <ChevronUp style={{ width: 16, height: 16, color: '#e07b53' }} />
                        {upNode && <span style={navLabelStyle}>{upNode.label}</span>}
                    </button>
                </div>
            )}

            {/* Main row: left nav, card, right nav */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '8px 12px',
                }}
            >
                {/* Left nav */}
                <button
                    type="button"
                    style={{ ...navBtnStyle(canGoLeft), minWidth: 48, flexShrink: 0 }}
                    onClick={goLeft}
                    disabled={!canGoLeft}
                >
                    <ChevronLeft style={{ width: 16, height: 16, color: '#e07b53' }} />
                    {prevNode && <span style={navLabelStyle}>{prevNode.label}</span>}
                </button>

                {/* Current step - centered, full width up to 400px */}
                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                        maxWidth: 400,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                    }}
                >
                    {/* Connector above (from prev column) */}
                    {canGoLeft && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                            <Connector
                                vertical
                                sourceDone={completed.has(columnGroups[col - 1]?.[0]?.id ?? '')}
                                timerPct={0}
                            />
                        </div>
                    )}

                    <StepCard
                        node={currentNode}
                        completed={completed.has(currentNode.id)}
                        active={!completed.has(currentNode.id)}
                        timerState={timers.get(currentNode.id)}
                        onToggle={() => dispatch({ type: 'toggle', nodeId: currentNode.id })}
                        onTimerStart={() =>
                            dispatch({ type: 'timerStart', nodeId: currentNode.id })
                        }
                        onTimerPause={() =>
                            dispatch({ type: 'timerPause', nodeId: currentNode.id })
                        }
                        onTimerReset={() =>
                            dispatch({ type: 'timerReset', nodeId: currentNode.id })
                        }
                        onOpenDetail={() => onOpenDetail(currentNode.id)}
                        ingredients={ingredients}
                        fullWidth
                    />

                    {/* Connector below (to next column) */}
                    {canGoRight && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                            <Connector
                                vertical
                                sourceDone={completed.has(currentNode.id)}
                                timerPct={0}
                            />
                        </div>
                    )}
                </div>

                {/* Right nav */}
                <button
                    type="button"
                    style={{ ...navBtnStyle(canGoRight), minWidth: 48, flexShrink: 0 }}
                    onClick={goRight}
                    disabled={!canGoRight}
                >
                    <ChevronRight style={{ width: 16, height: 16, color: '#e07b53' }} />
                    {nextNode && <span style={navLabelStyle}>{nextNode.label}</span>}
                </button>
            </div>

            {/* Down navigation */}
            {(canGoUp || canGoDown) && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        paddingTop: 4,
                        paddingBottom: 8,
                    }}
                >
                    <button
                        type="button"
                        style={navBtnStyle(canGoDown)}
                        onClick={goDown}
                        disabled={!canGoDown}
                    >
                        <ChevronDown style={{ width: 16, height: 16, color: '#e07b53' }} />
                        {downNode && <span style={navLabelStyle}>{downNode.label}</span>}
                    </button>
                </div>
            )}

            {/* Step indicator */}
            <div
                style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'rgba(0,0,0,0.4)',
                    paddingBottom: 12,
                    fontWeight: 600,
                }}
            >
                {col + 1} / {columnGroups.length}
                {currentGroup.length > 1 && ` · Zweig ${row + 1}/${currentGroup.length}`}
            </div>
        </div>
    );
}

/* ── completion banner ───────────────────────────────────── */

function CompletionBanner() {
    return (
        <div
            style={{
                margin: '0 24px 24px',
                padding: '20px 24px',
                backgroundColor: '#e8faf4',
                border: '1px solid rgba(0,184,148,0.25)',
                borderRadius: 16,
                textAlign: 'center',
            }}
        >
            <div style={{ fontSize: 32, marginBottom: 6 }}>
                <Sparkles style={{ width: 32, height: 32, color: '#00b894', display: 'inline' }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#00b894', marginBottom: 4 }}>
                Fertig gekocht!
            </div>
            <div style={{ fontSize: 14, color: '#55b89a' }}>Guten Appetit!</div>
        </div>
    );
}

/* ── main component ──────────────────────────────────────── */

export function RecipeStepsViewer({ nodes, edges, ingredients }: RecipeStepsViewerProps) {
    const { columnGroups, outgoing } = useMemo(() => buildTopology(nodes, edges), [nodes, edges]);

    const [state, dispatch] = useReducer(viewerReducer, {
        completed: new Set<string>(),
        timers: new Map<string, TimerState>(),
    });

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

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

    const mobileProps = { ...sharedState, columnGroups, outgoing };

    const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

    return (
        <>
            <div
                style={{
                    backgroundColor: '#fdfcfb',
                    borderRadius: 16,
                    border: '1px solid rgba(224,123,83,0.12)',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                {/* Mobile view toggle button */}
                <button
                    type="button"
                    onClick={() => setViewMode('mobile')}
                    title="Mobile-Ansicht öffnen"
                    style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 20,
                        border: '1px solid rgba(224,123,83,0.25)',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: '#c45e30',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    <Smartphone style={{ width: 13, height: 13 }} /> Mobil
                </button>

                <DesktopView {...sharedState} nodes={nodes} edges={edges} outgoing={outgoing} />

                {allStepsDone && <CompletionBanner />}
            </div>

            {/* Mobile fullscreen overlay */}
            {viewMode === 'mobile' && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 300,
                        backgroundColor: 'rgba(15,10,5,0.65)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    {/* Toolbar */}
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 520,
                            display: 'flex',
                            justifyContent: 'flex-end',
                            padding: '12px 16px 0',
                            flexShrink: 0,
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setViewMode('desktop')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 14px',
                                borderRadius: 20,
                                border: '1px solid rgba(255,255,255,0.2)',
                                backgroundColor: 'rgba(255,255,255,0.12)',
                                color: 'rgba(255,255,255,0.85)',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                backdropFilter: 'blur(4px)',
                            }}
                        >
                            <Monitor style={{ width: 13, height: 13 }} /> Desktop
                        </button>
                    </div>

                    {/* Mobile content */}
                    <div
                        style={{
                            flex: 1,
                            width: '100%',
                            maxWidth: 520,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: 'rgba(255,252,250,0.97)',
                                borderRadius: 20,
                                margin: '12px 16px 16px',
                                overflow: 'hidden',
                            }}
                        >
                            <MobileView {...mobileProps} />
                        </div>
                    </div>
                </div>
            )}

            {selectedNode && (
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
                />
            )}
        </>
    );
}
