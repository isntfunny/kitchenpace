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
import '@xyflow/react/dist/style.css';
import { Download } from 'lucide-react';
import { type ComponentType, type Dispatch, useCallback, useEffect, useRef, useState } from 'react';

import { css } from 'styled-system/css';

import type { FlowEdgeSerialized, FlowNodeSerialized } from '../editor/editorTypes';

import { StepCard } from './StepCard';
import type { RecipeStepsViewerProps, TimerState, ViewerAction } from './viewerTypes';
import { timerColor } from './viewerUtils';

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

interface DesktopViewProps {
    nodes: FlowNodeSerialized[];
    outgoing: Map<string, string[]>;
    edges: FlowEdgeSerialized[];
    completed: Set<string>;
    timers: Map<string, TimerState>;
    dispatch: Dispatch<ViewerAction>;
    onOpenDetail: (nodeId: string) => void;
    ingredients?: RecipeStepsViewerProps['ingredients'];
}

function DesktopViewInner({
    nodes,
    outgoing,
    edges,
    completed,
    timers,
    dispatch,
    onOpenDetail,
    ingredients,
}: DesktopViewProps) {
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
            exportFlowToPdf(containerRef.current, { getNodes });
        }
    }, [getNodes]);

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

export function DesktopView(props: DesktopViewProps) {
    return (
        <ReactFlowProvider>
            <DesktopViewInner {...props} />
        </ReactFlowProvider>
    );
}
