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
    Position,
    ReactFlow,
    ReactFlowProvider,
    type EdgeProps,
    type Node as RFNode,
    type NodeChange,
    type NodeProps,
    useNodes,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Download, Maximize2, Minimize2 } from 'lucide-react';
import {
    type ComponentType,
    type Dispatch,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { computeAvoidingPath, nodesToRects } from '@app/components/flow/edgeAvoidance';
import { useIsDark } from '@app/lib/darkMode';
import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

import type { FlowEdgeSerialized, FlowNodeSerialized } from '../editor/editorTypes';

import { StepCard } from './StepCard';
import type { RecipeStepsViewerProps, TimerState, ViewerAction } from './viewerTypes';
import { timerColor } from './viewerUtils';

/* ── custom curved edge (higher curvature than default bezier) ── */

function CurvedEdge(props: EdgeProps) {
    const {
        source,
        target,
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        markerEnd,
        style,
    } = props;
    const allNodes = useNodes();

    const nodeRects = useMemo(() => nodesToRects(allNodes), [allNodes]);
    const avoidance = useMemo(
        () => computeAvoidingPath(sourceX, sourceY, targetX, targetY, nodeRects, source, target),
        [sourceX, sourceY, targetX, targetY, nodeRects, source, target],
    );

    const [defaultPath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.4,
    });

    return <BaseEdge path={avoidance?.path ?? defaultPath} markerEnd={markerEnd} style={style} />;
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
    isParallel: boolean;
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
                isParallel={d.isParallel}
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
    /** Embedded mode: full viewport height, no overlay buttons */
    embedded?: boolean;
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
    embedded,
}: DesktopViewProps) {
    const dark = useIsDark();

    // Compute which nodes are in a parallel group (share a fork parent)
    const parallelNodeIds = useMemo(() => {
        const parallel = new Set<string>();
        for (const [, targets] of outgoing) {
            if (targets.length > 1) {
                for (const t of targets) parallel.add(t);
            }
        }
        return parallel;
    }, [outgoing]);

    const makeNodeData = useCallback(
        (node: FlowNodeSerialized): ViewerNodeData => ({
            sNode: node,
            completed: completed.has(node.id),
            active:
                !completed.has(node.id) &&
                (outgoing.get(node.id)?.every((c) => completed.has(c)) === false ||
                    node.type === 'start'),
            isParallel: parallelNodeIds.has(node.id),
            timerState: timers.get(node.id),
            onToggle: () => dispatch({ type: 'toggle', nodeId: node.id }),
            onTimerStart: () => dispatch({ type: 'timerStart', nodeId: node.id }),
            onTimerPause: () => dispatch({ type: 'timerPause', nodeId: node.id }),
            onTimerReset: () => dispatch({ type: 'timerReset', nodeId: node.id }),
            onOpenDetail: () => onOpenDetail(node.id),
            ingredients,
        }),
        [completed, timers, outgoing, parallelNodeIds, dispatch, onOpenDetail, ingredients],
    );

    const buildRfEdges = useCallback(
        () =>
            edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const sourceDone = completed.has(edge.source) || sourceNode?.type === 'start';
                const t = timers.get(edge.source);
                const timerPct = t && t.total > 0 ? ((t.total - t.remaining) / t.total) * 100 : 0;
                const stroke = sourceDone
                    ? PALETTE.emerald
                    : timerPct > 0
                      ? timerColor(timerPct)
                      : dark
                        ? 'rgba(255,255,255,0.18)'
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
        [edges, nodes, completed, timers, dark],
    );

    const makeNodeDataForViewer = useCallback(
        (node: FlowNodeSerialized): ViewerNodeData => ({
            ...makeNodeData(node),
            // Single click on card → zoom (not open modal); double-click opens modal
            onOpenDetail: () => {
                /* handled by onNodeClick at ReactFlow level */
            },
        }),
        [makeNodeData],
    );

    const [rfNodes, setRfNodes] = useState<RFNode[]>(() =>
        nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position ?? { x: 0, y: 0 },
            data: makeNodeDataForViewer(n),
        })),
    );
    const [rfEdges, setRfEdges] = useState(() => buildRfEdges());
    const containerRef = useRef<HTMLDivElement>(null);
    const { getNodes, setViewport, fitView } = useReactFlow();
    const hasFitRef = useRef(false);

    // Single click → zoom to node
    const handleNodeClick = useCallback(
        (_: React.MouseEvent, rfNode: RFNode) => {
            fitView({ nodes: [{ id: rfNode.id }], padding: 0.8, duration: 300 });
        },
        [fitView],
    );

    // Double-click → open detail modal
    const handleNodeDoubleClick = useCallback(
        (_: React.MouseEvent, rfNode: RFNode) => {
            console.log('[DV] double-click on', rfNode.id);
            onOpenDetail(rfNode.id);
        },
        [onOpenDetail],
    );

    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current
                ?.requestFullscreen()
                .then(() => {
                    setIsFullscreen(true);
                })
                .catch(() => {
                    // Fullscreen blocked or failed
                });
        } else {
            document
                .exitFullscreen()
                .then(() => {
                    setIsFullscreen(false);
                })
                .catch(() => {
                    // Exit fullscreen failed
                });
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Allow xyflow to apply dimension measurements (needed for fitView)
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setRfNodes((nds) => applyNodeChanges(changes, nds));

            // Fit after first dimension measurements arrive
            if (
                !hasFitRef.current &&
                changes.some((c) => c.type === 'dimensions' && 'dimensions' in c && c.dimensions)
            ) {
                hasFitRef.current = true;
                // Wait one frame so React has flushed the state update
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const allNodes = getNodes();
                        if (allNodes.length === 0 || !containerRef.current) return;

                        let minX = Infinity,
                            maxX = -Infinity;
                        let minY = Infinity,
                            maxY = -Infinity;
                        for (const n of allNodes) {
                            const w = n.measured?.width ?? 220;
                            const h = n.measured?.height ?? 200;
                            minX = Math.min(minX, n.position.x);
                            maxX = Math.max(maxX, n.position.x + w);
                            minY = Math.min(minY, n.position.y);
                            maxY = Math.max(maxY, n.position.y + h);
                        }

                        const contentH = maxY - minY;
                        const containerHeight = containerRef.current.clientHeight;
                        const padding = 120;

                        const zoomY = (containerHeight - padding * 2) / contentH;
                        const zoom = Math.min(zoomY, 2.0);

                        const viewportX = padding - minX * zoom;
                        const viewportY = containerHeight / 2 - ((minY + maxY) / 2) * zoom;

                        setViewport({ x: viewportX, y: viewportY, zoom });
                    });
                });
            }
        },
        [getNodes, setViewport],
    );

    // Sync node data when completion/timer state changes (preserve xyflow's measured sizes)
    // Only create new data objects for nodes whose state actually changed.
    const prevTimersRef = useRef(timers);
    const prevCompletedRef = useRef(completed);
    useEffect(() => {
        const prevTimers = prevTimersRef.current;
        const prevCompleted = prevCompletedRef.current;
        prevTimersRef.current = timers;
        prevCompletedRef.current = completed;

        setRfNodes((nds) =>
            nds.map((n) => {
                const timerChanged = timers.get(n.id) !== prevTimers.get(n.id);
                const completedChanged = completed.has(n.id) !== prevCompleted.has(n.id);
                if (!timerChanged && !completedChanged) return n; // same reference = no re-render

                const orig = nodes.find((o) => o.id === n.id);
                return orig ? { ...n, data: makeNodeDataForViewer(orig) } : n;
            }),
        );
    }, [completed, timers, makeNodeDataForViewer, nodes]);

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
        <div
            ref={containerRef}
            style={{
                height: isFullscreen || embedded ? '100vh' : 'calc(100vh - 200px)',
                minHeight: embedded ? undefined : 400,
                position: 'relative',
                backgroundColor: dark ? '#0d0d0d' : '#ffffff',
            }}
        >
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={VIEWER_NODE_TYPES}
                edgeTypes={VIEWER_EDGE_TYPES}
                onNodesChange={onNodesChange}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable
                panOnDrag
                zoomOnScroll={false}
                zoomOnPinch
                preventScrolling={false}
                minZoom={0.1}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    gap={24}
                    color={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)'}
                    size={1}
                />
            </ReactFlow>

            {/* Fullscreen + PDF buttons — hidden in embedded mode */}
            {!embedded && (
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Vollbild beenden' : 'Im Vollbild anzeigen'}
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
                        border: {
                            base: '1px solid rgba(224,123,83,0.2)',
                            _dark: '1px solid rgba(224,123,83,0.15)',
                        },
                        bg: 'surface',
                        color: 'palette.orange',
                        fontSize: 'xs',
                        fontWeight: '600',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        _hover: { bg: 'surface.elevated' },
                    })}
                >
                    {isFullscreen ? (
                        <Minimize2 style={{ width: 13, height: 13 }} />
                    ) : (
                        <Maximize2 style={{ width: 13, height: 13 }} />
                    )}
                    {isFullscreen ? 'Schließen' : 'Vollbild'}
                </button>
            )}

            {/* PDF export button — above fullscreen button */}
            {!embedded && (
                <button
                    type="button"
                    onClick={handleExportPdf}
                    title="Als PDF exportieren"
                    className={css({
                        position: 'absolute',
                        bottom: '14',
                        right: '3',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5',
                        py: '1.5',
                        px: '3',
                        borderRadius: 'lg',
                        border: {
                            base: '1px solid rgba(224,123,83,0.2)',
                            _dark: '1px solid rgba(224,123,83,0.15)',
                        },
                        bg: 'surface',
                        color: 'palette.orange',
                        fontSize: 'xs',
                        fontWeight: '600',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        _hover: { bg: 'surface.elevated' },
                    })}
                >
                    <Download style={{ width: 13, height: 13 }} /> PDF
                </button>
            )}
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
