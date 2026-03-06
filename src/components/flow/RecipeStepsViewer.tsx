'use client';

import {
    applyNodeChanges,
    BaseEdge,
    Background,
    getBezierPath,
    getNodesBounds,
    getViewportForBounds,
    Handle,
    MarkerType,
    PanOnScrollMode,
    Position,
    ReactFlow,
    ReactFlowProvider,
    type EdgeProps,
    type Node as RFNode,
    type NodeChange,
    type NodeProps,
    useReactFlow,
} from '@xyflow/react';
import {
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    Download,
    List,
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

/* ── custom curved edge (higher curvature than default bezier) ── */

function CurvedEdge(props: EdgeProps) {
    const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, markerEnd, style } = props;
    const [path] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.4,
    });
    return <BaseEdge path={path} markerEnd={markerEnd} style={style} />;
}

const VIEWER_EDGE_TYPES = { curved: CurvedEdge } as const;

/* ── PDF export ─────────────────────────────────────────── */

async function exportFlowToPdf(flowElement: HTMLElement, rfInstance: { getNodes: () => RFNode[] }) {
    const { toPng } = await import('html-to-image');
    const { default: jsPDF } = await import('jspdf');

    const allNodes = rfInstance.getNodes();
    if (allNodes.length === 0) return;

    // Compute bounds and a viewport that fits all nodes
    const bounds = getNodesBounds(allNodes);
    const padding = 40;
    const width = Math.ceil(bounds.width + padding * 2);
    const height = Math.ceil(bounds.height + padding * 2);
    const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, padding);

    // Target the xyflow viewport element directly (official approach)
    const viewportEl = flowElement.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!viewportEl) return;

    const dataUrl = await toPng(viewportEl, {
        backgroundColor: '#ffffff',
        width,
        height,
        style: {
            width: String(width),
            height: String(height),
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
        filter: (node: HTMLElement) => {
            // Exclude background pattern, panels, and minimap from export
            const cls = node?.classList;
            if (!cls) return true;
            return (
                !cls.contains('react-flow__background') &&
                !cls.contains('react-flow__panel') &&
                !cls.contains('react-flow__minimap') &&
                !cls.contains('react-flow__controls')
            );
        },
    });

    const isLandscape = width > height;
    const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
    pdf.save('rezept-flow.pdf');
}

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

/* ── dagre setup (same instance used by FlowEditor) ──────── */

interface DagreGraph {
    setDefaultEdgeLabel(fn: () => Record<string, unknown>): void;
    setGraph(opts: {
        rankdir?: string;
        nodesep?: number;
        ranksep?: number;
        marginx?: number;
        marginy?: number;
    }): void;
    setNode(id: string, opts: { width: number; height: number }): void;
    setEdge(source: string, target: string): void;
    node(id: string): { x: number; y: number };
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dagre = require('dagre') as {
    graphlib: { Graph: new () => DagreGraph };
    layout: (g: DagreGraph) => void;
};

/* ── topology builder (dagre-powered) ───────────────────── */

interface Topology {
    columnGroups: FlowNodeSerialized[][];
    /** dagre Y position per node — used by minimap for stable lane positioning */
    dagreY: Map<string, number>;
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

    if (nodes.length === 0) {
        return { columnGroups: [], dagreY: new Map(), outgoing, incoming, nodeById };
    }

    // Use dagre for layered layout — it handles topological ordering, column
    // assignment (ranks), and Y-lane positioning (Brandes-Köpf) in one call.
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 40 });

    for (const n of nodes) g.setNode(n.id, { width: 24, height: 24 });
    for (const e of edges) g.setEdge(e.source, e.target);

    dagre.layout(g);

    // Extract positions — dagre X = rank/column, Y = lane
    const positions = new Map<string, { x: number; y: number }>();
    const dagreY = new Map<string, number>();
    for (const n of nodes) {
        const pos = g.node(n.id);
        positions.set(n.id, pos);
        dagreY.set(n.id, pos.y);
    }

    // Derive column groups from dagre X positions (same X = same column).
    // Dagre uses exact X values per rank, so we can group by X.
    const xToNodes = new Map<number, FlowNodeSerialized[]>();
    for (const n of nodes) {
        const x = positions.get(n.id)!.x;
        if (!xToNodes.has(x)) xToNodes.set(x, []);
        xToNodes.get(x)!.push(n);
    }

    // Sort columns by X value, sort nodes within each column by Y
    const sortedXValues = [...xToNodes.keys()].sort((a, b) => a - b);
    const groups: FlowNodeSerialized[][] = sortedXValues.map((x) => {
        const col = xToNodes.get(x)!;
        col.sort((a, b) => (dagreY.get(a.id) ?? 0) - (dagreY.get(b.id) ?? 0));
        return col;
    });

    return { columnGroups: groups, dagreY, outgoing, incoming, nodeById };
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
        <div style={{ pointerEvents: 'all' }}>
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
        </div>
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
    onExportPdf,
    ingredients,
}: {
    nodes: FlowNodeSerialized[];
    outgoing: Map<string, string[]>;
    edges: FlowEdgeSerialized[];
    completed: Set<string>;
    timers: Map<string, TimerState>;
    dispatch: React.Dispatch<ViewerAction>;
    onOpenDetail: (nodeId: string) => void;
    onExportPdf: (el: HTMLElement, rf: { getNodes: () => RFNode[] }) => void;
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
                    type: 'curved',
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
    const containerRef = useRef<HTMLDivElement>(null);
    const { getNodes, setViewport } = useReactFlow();
    const hasFitRef = useRef(false);

    // Allow xyflow to apply dimension measurements (needed for fitView)
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setRfNodes((nds) => applyNodeChanges(changes, nds));

            // After xyflow measures node dimensions, fit zoom to match container height
            if (!hasFitRef.current) {
                const measured = getNodes();
                if (measured.length > 0 && measured[0].measured?.width) {
                    hasFitRef.current = true;
                    requestAnimationFrame(() => {
                        const allNodes = getNodes();
                        if (allNodes.length === 0 || !containerRef.current) return;

                        let minY = Infinity, maxY = -Infinity;
                        for (const n of allNodes) {
                            const h = n.measured?.height ?? 200;
                            minY = Math.min(minY, n.position.y);
                            maxY = Math.max(maxY, n.position.y + h);
                        }

                        const contentHeight = maxY - minY;
                        const containerHeight = containerRef.current.clientHeight;
                        const paddingPx = 20; // small margin top+bottom in screen pixels
                        const zoom = Math.min(
                            (containerHeight - paddingPx * 2) / contentHeight,
                            3.0,
                        );

                        // Center vertically, start near left edge
                        const centerY = (minY + maxY) / 2;
                        const viewportY = containerHeight / 2 - centerY * zoom;

                        setViewport({ x: 20, y: viewportY, zoom }, { duration: 300 });
                    });
                }
            }
        },
        [getNodes, setViewport],
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

    const handleExportPdf = useCallback(() => {
        if (containerRef.current) {
            onExportPdf(containerRef.current, { getNodes });
        }
    }, [onExportPdf, getNodes]);

    return (
        <div ref={containerRef} style={{ height: 'calc(100vh - 200px)', minHeight: 400, position: 'relative' }}>
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={VIEWER_NODE_TYPES}
                edgeTypes={VIEWER_EDGE_TYPES}
                onNodesChange={onNodesChange}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={[1, 2]}
                panOnScroll
                panOnScrollMode={PanOnScrollMode.Horizontal}
                zoomOnScroll={false}
                zoomOnPinch
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={24} color="rgba(0,0,0,0.035)" size={1} />
            </ReactFlow>

            {/* PDF export button — bottom right */}
            <button
                type="button"
                onClick={handleExportPdf}
                title="Als PDF exportieren"
                className={css({
                    position: 'absolute',
                    bottom: '3',
                    right: '3',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5',
                    py: '1.5',
                    px: '3',
                    borderRadius: 'lg',
                    border: '1px solid rgba(224,123,83,0.2)',
                    bg: 'rgba(255,255,255,0.9)',
                    color: '#c45e30',
                    fontSize: 'xs',
                    fontWeight: '600',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                    _hover: { bg: 'rgba(255,255,255,1)' },
                })}
            >
                <Download style={{ width: 13, height: 13 }} /> PDF
            </button>
        </div>
    );
}


/* ── mobile minimap with timer circles ────────────────────── */


function MobileMiniMap({
    columnGroups,
    edges,
    dagreY,
    completed,
    currentCol,
    currentRow,
    onNavigate,
}: {
    columnGroups: FlowNodeSerialized[][];
    edges: FlowEdgeSerialized[];
    dagreY: Map<string, number>;
    completed: Set<string>;
    currentCol: number;
    currentRow: number;
    onNavigate: (col: number, row: number) => void;
}) {
    const dotSize = 24;
    const connLen = 16;
    const padding = 4;

    // Derive Y bounds from dagre positions
    const allY = Array.from(dagreY.values());
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const yRange = maxY - minY;

    // SVG dimensions
    const colWidth = dotSize + connLen;
    const totalWidth = columnGroups.length * colWidth - connLen;
    const maxLanes = Math.max(1, ...columnGroups.map((g) => g.length));
    const totalHeight = maxLanes > 1
        ? maxLanes * (dotSize + padding) - padding + dotSize / 2
        : dotSize + 12;

    // Map dagre Y to pixel Y, preserving dagre's relative spacing
    const getNodeX = (colIdx: number): number => colIdx * colWidth + dotSize / 2;
    const getNodeY = (nodeId: string): number => {
        if (yRange === 0) return totalHeight / 2;
        const y = dagreY.get(nodeId) ?? 0;
        return ((y - minY) / yRange) * (totalHeight - dotSize) + dotSize / 2;
    };

    // Build a nodeId → (colIdx, rowIdx) lookup for onNavigate
    const nodePosition = new Map<string, { col: number; row: number }>();
    for (let c = 0; c < columnGroups.length; c++) {
        for (let r = 0; r < columnGroups[c].length; r++) {
            nodePosition.set(columnGroups[c][r].id, { col: c, row: r });
        }
    }

    // Build connectors from actual edges
    const connectors: { x1: number; y1: number; x2: number; y2: number; done: boolean }[] = [];
    for (const edge of edges) {
        const src = nodePosition.get(edge.source);
        const tgt = nodePosition.get(edge.target);
        if (!src || !tgt) continue;
        connectors.push({
            x1: getNodeX(src.col) + dotSize / 2,
            y1: getNodeY(edge.source),
            x2: getNodeX(tgt.col) - dotSize / 2,
            y2: getNodeY(edge.target),
            done: completed.has(edge.source),
        });
    }

    return (
        <div
            className={css({
                display: 'flex',
                justifyContent: 'center',
                py: '3',
                px: '4',
                flexShrink: 0,
                overflowX: 'auto',
                backdropFilter: 'blur(12px)',
                bg: 'rgba(26, 23, 21, 0.6)',
                borderBottom: '1px solid rgba(224,123,83,0.1)',
            })}
        >
            <svg
                width={totalWidth}
                height={totalHeight}
                viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                style={{ flexShrink: 0 }}
            >
                {/* Connector lines from actual edges */}
                {connectors.map((c, i) => (
                    <line
                        key={`conn-${i}`}
                        x1={c.x1}
                        y1={c.y1}
                        x2={c.x2}
                        y2={c.y2}
                        stroke={c.done ? 'rgba(0,184,148,0.5)' : 'rgba(224,123,83,0.15)'}
                        strokeWidth={2}
                        strokeLinecap="round"
                        style={{ transition: 'stroke 0.3s ease' }}
                    />
                ))}

                {/* Node dots */}
                {columnGroups.map((group, colIdx) =>
                    group.map((node, rowIdx) => {
                        const cx = getNodeX(colIdx);
                        const cy = getNodeY(node.id);
                        const isCurrent = colIdx === currentCol && rowIdx === currentRow;
                        const isDone = completed.has(node.id);
                        const config = getStepConfig(node.type as StepType);
                        const NodeIcon = config.icon;

                        return (
                            <g
                                key={node.id}
                                onClick={() => onNavigate(colIdx, rowIdx)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Glow ring for current */}
                                {isCurrent && (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={dotSize / 2 + 3}
                                        fill="none"
                                        stroke="rgba(224,123,83,0.4)"
                                        strokeWidth={2}
                                    />
                                )}
                                {/* Background circle */}
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={dotSize / 2}
                                    fill={
                                        isDone
                                            ? 'rgba(0,184,148,0.25)'
                                            : isCurrent
                                              ? 'rgba(224,123,83,0.3)'
                                              : 'rgba(255,255,255,0.08)'
                                    }
                                />
                                {/* Icon */}
                                <foreignObject
                                    x={cx - dotSize / 2}
                                    y={cy - dotSize / 2}
                                    width={dotSize}
                                    height={dotSize}
                                >
                                    <div
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {isDone ? (
                                            <Check style={{ width: 11, height: 11, color: '#00b894' }} />
                                        ) : (
                                            <NodeIcon
                                                style={{
                                                    width: 11,
                                                    height: 11,
                                                    color: isCurrent ? '#e07b53' : 'rgba(255,255,255,0.4)',
                                                }}
                                            />
                                        )}
                                    </div>
                                </foreignObject>
                            </g>
                        );
                    }),
                )}
            </svg>
        </div>
    );
}

/* ── mobile: fullscreen immersive single-card view ───────── */

function BranchHint({
    direction,
    node,
    onClick,
}: {
    direction: 'up' | 'down';
    node: FlowNodeSerialized;
    onClick: () => void;
}) {
    const config = getStepConfig(node.type as StepType);
    const Icon = config.icon;
    const isUp = direction === 'up';

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                ...(isUp ? { top: 0 } : { bottom: 0 }),
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: isUp ? '6px 16px 10px' : '10px 16px 6px',
                border: 'none',
                background: isUp
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)'
                    : 'linear-gradient(0deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
                borderRadius: isUp ? '0 0 16px 16px' : '16px 16px 0 0',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.7)',
                animation: 'branchPulse 2s ease-in-out infinite',
            }}
        >
            {isUp && <ChevronUp style={{ width: 16, height: 16, opacity: 0.6 }} />}
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: 'nowrap',
            }}>
                <Icon style={{ width: 12, height: 12 }} />
                {node.label.length > 20 ? node.label.slice(0, 20) + '\u2026' : node.label}
            </span>
            {!isUp && <ChevronDown style={{ width: 16, height: 16, opacity: 0.6 }} />}
        </button>
    );
}

function MobileView({
    columnGroups,
    edges,
    dagreY,
    completed,
    timers,
    dispatch,
    ingredients,
}: {
    columnGroups: FlowNodeSerialized[][];
    edges: FlowEdgeSerialized[];
    dagreY: Map<string, number>;
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

    // Build edge-based navigation lookups: nodeId → outgoing/incoming target nodeIds
    const { outgoingMap, incomingMap, nodePos } = useMemo(() => {
        const out = new Map<string, string[]>();
        const inc = new Map<string, string[]>();
        const pos = new Map<string, { col: number; row: number }>();
        for (let c = 0; c < columnGroups.length; c++) {
            for (let r = 0; r < columnGroups[c].length; r++) {
                const id = columnGroups[c][r].id;
                pos.set(id, { col: c, row: r });
                if (!out.has(id)) out.set(id, []);
                if (!inc.has(id)) inc.set(id, []);
            }
        }
        for (const e of edges) {
            out.get(e.source)?.push(e.target);
            inc.get(e.target)?.push(e.source);
        }
        return { outgoingMap: out, incomingMap: inc, nodePos: pos };
    }, [columnGroups, edges]);

    // Edge-aware navigation
    const targets = currentNode ? (outgoingMap.get(currentNode.id) ?? []) : [];
    const sources = currentNode ? (incomingMap.get(currentNode.id) ?? []) : [];

    const canGoRight = targets.length > 0;
    const canGoLeft = sources.length > 0;

    // Cross-column branch detection: find parallel branches that span the current column.
    // A node on another branch is "parallel" if it sits in a column range that overlaps
    // the current column. We find all nodes whose column range (their col .. their
    // furthest-downstream col before a shared merge) overlaps with `col`.
    // Simplified approach: collect all nodes from other branches that are reachable
    // from a common ancestor and haven't merged yet at the current column.
    const parallelBranches = useMemo(() => {
        if (!currentNode) return [];
        // Walk backward from currentNode to find the nearest fork ancestor
        const findForkAncestor = (nodeId: string): string | null => {
            let cur = nodeId;
            const visited = new Set<string>();
            while (cur) {
                if (visited.has(cur)) break;
                visited.add(cur);
                // Check if this node has multiple outgoing edges (it's a fork)
                if ((outgoingMap.get(cur) ?? []).length > 1) return cur;
                // Go to parent
                const parents = incomingMap.get(cur) ?? [];
                if (parents.length !== 1) break;
                cur = parents[0];
            }
            return null;
        };

        const forkId = findForkAncestor(currentNode.id);
        if (!forkId) return [];

        // Get all branches from this fork
        const forkChildren = outgoingMap.get(forkId) ?? [];
        if (forkChildren.length < 2) return [];

        // Find which branch the current node is on
        const isOnBranch = (branchStartId: string, targetId: string): boolean => {
            const visited = new Set<string>();
            const q = [branchStartId];
            while (q.length > 0) {
                const id = q.shift()!;
                if (id === targetId) return true;
                if (visited.has(id)) continue;
                visited.add(id);
                for (const child of outgoingMap.get(id) ?? []) q.push(child);
            }
            return false;
        };

        // Collect first node of each other branch
        const result: { node: FlowNodeSerialized; col: number; row: number }[] = [];
        for (const branchStart of forkChildren) {
            if (branchStart === currentNode.id) continue;
            if (isOnBranch(branchStart, currentNode.id)) continue;

            // Find the node on this branch closest to the current column
            // Walk the branch and collect all nodes
            const branchNodes: string[] = [];
            const visited = new Set<string>();
            const q = [branchStart];
            while (q.length > 0) {
                const id = q.shift()!;
                if (visited.has(id)) continue;
                visited.add(id);
                branchNodes.push(id);
                // Stop at merge points (nodes with >1 incoming edge)
                const inc = incomingMap.get(id) ?? [];
                if (inc.length > 1 && id !== branchStart) continue;
                for (const child of outgoingMap.get(id) ?? []) q.push(child);
            }

            // Find the branch node closest to current column
            let bestNode: string | null = null;
            let bestDist = Infinity;
            for (const bid of branchNodes) {
                const pos = nodePos.get(bid);
                if (!pos) continue;
                const dist = Math.abs(pos.col - col);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestNode = bid;
                }
            }

            if (bestNode) {
                const pos = nodePos.get(bestNode)!;
                const node = columnGroups[pos.col]?.[pos.row];
                if (node) result.push({ node, ...pos });
            }
        }

        return result;
    }, [currentNode, col, outgoingMap, incomingMap, nodePos, columnGroups]);

    // Same-column lanes (existing)
    const hasLaneAbove = row > 0;
    const hasLaneBelow = row < currentGroup.length - 1;
    const hasMultipleLanes = currentGroup.length > 1;

    // Combined: can branch-switch if same-column lanes OR parallel branches exist
    const canBranchUp = hasLaneAbove || parallelBranches.length > 0;
    const canBranchDown = hasLaneBelow || parallelBranches.length > 0;
    const hasBranching = hasMultipleLanes || parallelBranches.length > 0;

    const goRight = useCallback(() => {
        if (!currentNode) return;
        const tgts = outgoingMap.get(currentNode.id) ?? [];
        if (tgts.length === 0) return;
        const targetPos = nodePos.get(tgts[0]);
        if (targetPos) setPosition(targetPos);
    }, [currentNode, outgoingMap, nodePos]);

    const goLeft = useCallback(() => {
        if (!currentNode) return;
        const srcs = incomingMap.get(currentNode.id) ?? [];
        if (srcs.length === 0) return;
        const sourcePos = nodePos.get(srcs[0]);
        if (sourcePos) setPosition(sourcePos);
    }, [currentNode, incomingMap, nodePos]);

    const goLaneUp = useCallback(() => {
        if (hasLaneAbove) {
            setPosition((p) => ({ ...p, row: p.row - 1 }));
        } else if (parallelBranches.length > 0) {
            // Jump to the first parallel branch node
            const target = parallelBranches[0];
            setPosition({ col: target.col, row: target.row });
        }
    }, [hasLaneAbove, parallelBranches]);

    const goLaneDown = useCallback(() => {
        if (hasLaneBelow) {
            setPosition((p) => ({ ...p, row: p.row + 1 }));
        } else if (parallelBranches.length > 0) {
            // Jump to the last parallel branch node
            const target = parallelBranches[parallelBranches.length - 1];
            setPosition({ col: target.col, row: target.row });
        }
    }, [hasLaneBelow, parallelBranches]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    goLeft();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    goRight();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    goLaneUp();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    goLaneDown();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goLeft, goRight, goLaneUp, goLaneDown]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = e.changedTouches[0].clientY - touchStart.current.y;
        const threshold = 50;
        touchStart.current = null;

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy && absDx > threshold) {
            // Horizontal swipe = navigate columns (steps)
            if (dx < 0) goRight();
            else goLeft();
        } else if (absDy > threshold && hasBranching) {
            // Vertical swipe = switch lanes/branches
            if (dy < 0) goLaneDown();
            else goLaneUp();
        }
    };

    if (!currentNode) return null;

    const config = getStepConfig(currentNode.type as StepType);
    const Icon = config.icon;
    const isSpecial = currentNode.type === 'start' || currentNode.type === 'servieren';
    const isDone = completed.has(currentNode.id);
    const timerState = timers.get(currentNode.id);
    const hasTimer = !!timerState;
    const timerRunning = hasTimer && timerState!.running;
    const timerDone = hasTimer && timerState!.remaining === 0;
    const pct = hasTimer
        ? ((timerState!.total - timerState!.remaining) / timerState!.total) * 100
        : 0;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                userSelect: 'none',
                overflow: 'hidden',
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Minimap */}
            <MobileMiniMap
                columnGroups={columnGroups}
                edges={edges}
                dagreY={dagreY}
                completed={completed}
                currentCol={col}
                currentRow={row}
                onNavigate={(c, r) => setPosition({ col: c, row: r })}
            />

            {/* Main card area — fills remaining space */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0 24px',
                    minHeight: 0,
                    position: 'relative',
                }}
            >
                {/* Branch hint: lane above (same column or parallel branch) */}
                {canBranchUp && (
                    <BranchHint
                        direction="up"
                        node={hasLaneAbove ? currentGroup[row - 1] : parallelBranches[0]?.node}
                        onClick={goLaneUp}
                    />
                )}

                {/* Branch hint: lane below (same column or parallel branch) */}
                {canBranchDown && (
                    <BranchHint
                        direction="down"
                        node={hasLaneBelow ? currentGroup[row + 1] : parallelBranches[parallelBranches.length - 1]?.node}
                        onClick={goLaneDown}
                    />
                )}

                {/* Lane indicator when branches are available */}
                {hasBranching && (() => {
                    const totalBranches = hasMultipleLanes
                        ? currentGroup.length
                        : 1 + parallelBranches.length;
                    const currentBranch = hasMultipleLanes ? row + 1 : 1;
                    return (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 12,
                            }}
                        >
                            <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.08em',
                                color: 'rgba(255,255,255,0.4)',
                            }}>
                                Branch {currentBranch}/{totalBranches}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {Array.from({ length: totalBranches }, (_, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            width: idx === currentBranch - 1 ? 16 : 6,
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: idx === currentBranch - 1
                                                ? '#e07b53'
                                                : 'rgba(255,255,255,0.2)',
                                            transition: 'all 0.2s ease',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Step type badge */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 16,
                    }}
                >
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderRadius: 999,
                            padding: '5px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.8)',
                        }}
                    >
                        <Icon style={{ width: 14, height: 14 }} />
                        {config.label}
                    </span>
                    {isDone && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: '#00b894',
                            }}
                        >
                            <Check style={{ width: 14, height: 14, color: 'white' }} />
                        </span>
                    )}
                </div>

                {/* Title — large, centered */}
                <h2
                    style={{
                        fontSize: 'clamp(28px, 7vw, 44px)',
                        fontWeight: 800,
                        color: 'white',
                        textAlign: 'center',
                        lineHeight: 1.15,
                        marginBottom: 16,
                        maxWidth: '100%',
                        wordBreak: 'break-word',
                    }}
                >
                    {currentNode.label}
                </h2>

                {/* Description — medium, centered */}
                {currentNode.description && (
                    <p
                        style={{
                            fontSize: 'clamp(15px, 3.5vw, 20px)',
                            color: 'rgba(255,255,255,0.75)',
                            textAlign: 'center',
                            lineHeight: 1.6,
                            maxWidth: 460,
                            marginBottom: 20,
                        }}
                    >
                        {renderDescription(currentNode.description, ingredients)}
                    </p>
                )}

                {/* Timer display */}
                {hasTimer && (
                    <div style={{ marginBottom: 20, textAlign: 'center' }}>
                        <div
                            style={{
                                fontSize: 'clamp(36px, 10vw, 56px)',
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums',
                                color: timerDone ? '#00b894' : timerRunning ? '#f39c12' : 'rgba(255,255,255,0.6)',
                                letterSpacing: '0.02em',
                                lineHeight: 1,
                                marginBottom: 12,
                            }}
                        >
                            {formatTime(timerState!.remaining)}
                        </div>
                        {/* Timer progress bar */}
                        <div
                            style={{
                                width: 200,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                margin: '0 auto 12px',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    height: '100%',
                                    width: `${pct}%`,
                                    backgroundColor: timerDone ? '#00b894' : '#e07b53',
                                    borderRadius: 2,
                                    transition: 'width 1s linear',
                                }}
                            />
                        </div>
                        {/* Timer buttons */}
                        {!isDone && !isSpecial && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (timerRunning) {
                                            dispatch({ type: 'timerPause', nodeId: currentNode.id });
                                        } else {
                                            dispatch({ type: 'timerStart', nodeId: currentNode.id });
                                        }
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '10px 20px',
                                        borderRadius: 999,
                                        border: '1.5px solid rgba(255,255,255,0.25)',
                                        backgroundColor: timerRunning ? 'rgba(231,76,60,0.2)' : 'rgba(255,255,255,0.12)',
                                        color: 'white',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {timerRunning ? (
                                        <><Pause style={{ width: 14, height: 14 }} /> Pause</>
                                    ) : (
                                        <><Play style={{ width: 14, height: 14 }} /> Start</>
                                    )}
                                </button>
                                {pct > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => dispatch({ type: 'timerReset', nodeId: currentNode.id })}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 42,
                                            height: 42,
                                            borderRadius: '50%',
                                            border: '1.5px solid rgba(255,255,255,0.2)',
                                            backgroundColor: 'rgba(255,255,255,0.08)',
                                            color: 'rgba(255,255,255,0.7)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <RotateCcw style={{ width: 14, height: 14 }} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Done button */}
                {!isSpecial && (
                    <button
                        type="button"
                        onClick={() => dispatch({ type: 'toggle', nodeId: currentNode.id })}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '14px 32px',
                            borderRadius: 999,
                            border: isDone ? '2px solid rgba(0,184,148,0.5)' : 'none',
                            backgroundColor: isDone ? 'rgba(0,184,148,0.15)' : '#e07b53',
                            color: isDone ? '#00b894' : 'white',
                            fontSize: 16,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            minWidth: 180,
                        }}
                    >
                        {isDone ? (
                            <><CheckCircle2 style={{ width: 18, height: 18 }} /> Erledigt</>
                        ) : timerDone ? (
                            <><Check style={{ width: 18, height: 18 }} /> Timer fertig — Erledigt?</>
                        ) : (
                            'Erledigt'
                        )}
                    </button>
                )}
            </div>

            {/* Bottom navigation — horizontal steps only */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 24px 20px',
                    flexShrink: 0,
                }}
            >
                <button
                    type="button"
                    onClick={goLeft}
                    disabled={!canGoLeft}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 16px',
                        borderRadius: 12,
                        border: 'none',
                        backgroundColor: canGoLeft ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: canGoLeft ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: canGoLeft ? 'pointer' : 'default',
                    }}
                >
                    <ChevronLeft style={{ width: 16, height: 16 }} />
                    Zurück
                </button>

                {/* Step counter */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                        Schritt {col + 1} / {columnGroups.length}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={goRight}
                    disabled={!canGoRight}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 16px',
                        borderRadius: 12,
                        border: 'none',
                        backgroundColor: canGoRight ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: canGoRight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: canGoRight ? 'pointer' : 'default',
                    }}
                >
                    Weiter
                    <ChevronRight style={{ width: 16, height: 16 }} />
                </button>
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

/* ── simple text recipe view ─────────────────────────────── */

function SimpleTextView({
    columnGroups,
    completed,
    timers,
    dispatch,
    ingredients,
}: {
    columnGroups: FlowNodeSerialized[][];
    completed: Set<string>;
    timers: Map<string, TimerState>;
    dispatch: React.Dispatch<ViewerAction>;
    ingredients?: RecipeStepsViewerProps['ingredients'];
}) {
    const steps = columnGroups.flat().filter((n) => n.type !== 'start');

    return (
        <div
            className={css({
                py: '6',
                px: '5',
                maxWidth: '640px',
                mx: 'auto',
            })}
        >
            <ol
                className={css({
                    listStyle: 'none',
                    p: 0,
                    m: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4',
                })}
            >
                {steps.map((node, idx) => {
                    const config = getStepConfig(node.type as StepType);
                    const Icon = config.icon;
                    const isLast = node.type === 'servieren';
                    const isDone = completed.has(node.id);
                    const timer = timers.get(node.id);
                    const hasTimer = !!timer;
                    const timerRunning = hasTimer && timer!.running;
                    const timerDone = hasTimer && timer!.remaining === 0;

                    return (
                        <li key={node.id}>
                            <div
                                className={css({
                                    display: 'flex',
                                    gap: '3',
                                    alignItems: 'flex-start',
                                    p: '3',
                                    borderRadius: 'lg',
                                    transition: 'all 0.2s ease',
                                })}
                                style={{
                                    backgroundColor: isDone
                                        ? 'rgba(0,184,148,0.06)'
                                        : 'transparent',
                                    opacity: isDone ? 0.7 : 1,
                                }}
                            >
                                {/* Clickable step icon — toggles done */}
                                <button
                                    type="button"
                                    onClick={() => dispatch({ type: 'toggle', nodeId: node.id })}
                                    className={css({
                                        flexShrink: 0,
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: 'full',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        cursor: 'pointer',
                                        mt: '0.5',
                                        transition: 'all 0.2s ease',
                                    })}
                                    style={{
                                        backgroundColor: isDone
                                            ? 'rgba(0,184,148,0.2)'
                                            : isLast
                                              ? 'rgba(0,184,148,0.12)'
                                              : 'rgba(224,123,83,0.1)',
                                        color: isDone
                                            ? '#00b894'
                                            : isLast
                                              ? '#00b894'
                                              : '#e07b53',
                                    }}
                                >
                                    {isDone ? (
                                        <Check style={{ width: 16, height: 16 }} />
                                    ) : (
                                        <Icon style={{ width: 16, height: 16 }} />
                                    )}
                                </button>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Title + duration */}
                                    <div
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2',
                                            mb: '1',
                                            flexWrap: 'wrap',
                                        })}
                                    >
                                        <span
                                            className={css({
                                                fontWeight: 'bold',
                                                fontSize: 'md',
                                                color: 'text',
                                            })}
                                            style={{
                                                textDecoration: isDone ? 'line-through' : 'none',
                                                textDecorationColor: 'rgba(0,184,148,0.4)',
                                            }}
                                        >
                                            {idx + 1}. {node.label}
                                        </span>
                                        {node.duration && node.duration > 0 && !hasTimer && (
                                            <span
                                                className={css({
                                                    fontSize: 'xs',
                                                    color: 'text.muted',
                                                    flexShrink: 0,
                                                })}
                                            >
                                                ~{node.duration} Min.
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {node.description && (
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                color: 'text.secondary',
                                                lineHeight: '1.6',
                                                m: 0,
                                            })}
                                        >
                                            {renderDescription(node.description, ingredients)}
                                        </p>
                                    )}

                                    {/* Timer controls */}
                                    {hasTimer && !isDone && (
                                        <div
                                            className={css({
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2',
                                                mt: '2',
                                            })}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    dispatch({
                                                        type: timerRunning ? 'timerPause' : 'timerStart',
                                                        nodeId: node.id,
                                                    })
                                                }
                                                className={css({
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1.5',
                                                    py: '1',
                                                    px: '2.5',
                                                    borderRadius: 'full',
                                                    border: '1px solid',
                                                    fontSize: 'xs',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                })}
                                                style={{
                                                    borderColor: timerRunning
                                                        ? 'rgba(243,156,18,0.3)'
                                                        : timerDone
                                                          ? 'rgba(0,184,148,0.3)'
                                                          : 'rgba(224,123,83,0.25)',
                                                    backgroundColor: timerRunning
                                                        ? 'rgba(243,156,18,0.08)'
                                                        : timerDone
                                                          ? 'rgba(0,184,148,0.08)'
                                                          : 'rgba(224,123,83,0.06)',
                                                    color: timerRunning
                                                        ? '#f39c12'
                                                        : timerDone
                                                          ? '#00b894'
                                                          : '#e07b53',
                                                }}
                                            >
                                                {timerRunning ? (
                                                    <Pause style={{ width: 12, height: 12 }} />
                                                ) : timerDone ? (
                                                    <Check style={{ width: 12, height: 12 }} />
                                                ) : (
                                                    <Play style={{ width: 12, height: 12 }} />
                                                )}
                                                <Clock style={{ width: 11, height: 11, opacity: 0.7 }} />
                                                {formatTime(timer!.remaining)}
                                            </button>
                                            {(timerRunning || timer!.remaining < timer!.total) && !timerDone && (
                                                <button
                                                    type="button"
                                                    onClick={() => dispatch({ type: 'timerReset', nodeId: node.id })}
                                                    className={css({
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        p: '1',
                                                        borderRadius: 'full',
                                                        border: 'none',
                                                        bg: 'transparent',
                                                        color: 'text.muted',
                                                        cursor: 'pointer',
                                                    })}
                                                    title="Zurücksetzen"
                                                >
                                                    <RotateCcw style={{ width: 12, height: 12 }} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

/* ── main component ──────────────────────────────────────── */

export function RecipeStepsViewer({ nodes, edges, ingredients }: RecipeStepsViewerProps) {
    const { columnGroups, dagreY, outgoing } = useMemo(() => buildTopology(nodes, edges), [nodes, edges]);

    const [state, dispatch] = useReducer(viewerReducer, {
        completed: new Set<string>(),
        timers: new Map<string, TimerState>(),
    });

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'text'>('desktop');

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
                    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 6 }}>
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
                    </div>

                    <ReactFlowProvider>
                        <DesktopView {...sharedState} nodes={nodes} edges={edges} outgoing={outgoing} onExportPdf={exportFlowToPdf} />
                    </ReactFlowProvider>

                    {allStepsDone && <CompletionBanner />}
                </div>
            )}

            {/* Text view overlay */}
            {viewMode === 'text' && (
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
                            onClick={() => setViewMode(isMobileDevice ? 'desktop' : 'desktop')}
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
                </div>
            )}

            {/* Mobile fullscreen overlay */}
            {viewMode === 'mobile' && (
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        zIndex: 300,
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'linear-gradient(180deg, rgba(26,23,21,0.92) 0%, rgba(35,30,26,0.95) 40%, rgba(28,24,21,0.92) 100%)',
                        backdropFilter: 'blur(24px)',
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
                            onClick={() => setViewMode(isMobileDevice ? 'desktop' : 'desktop')}
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
