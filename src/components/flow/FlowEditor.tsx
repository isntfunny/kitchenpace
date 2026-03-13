'use client';

import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    useReactFlow,
    addEdge,
    type Connection,
    type Edge,
    type EdgeChange,
    ReactFlowProvider,
    Panel,
} from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from 'react';
import '@xyflow/react/dist/style.css';

import type { AddedIngredient } from '@app/components/recipe/RecipeForm/data';
import type { AIAnalysisResult, ApplySelection } from '@app/lib/importer/ai-text-analysis';
import { PALETTE } from '@app/lib/palette';
import { getValidationIssuesByNode, validateFlow } from '@app/lib/validation/flowValidation';
import { css, cx } from 'styled-system/css';

import { AiConversionDialog } from './editor/AiConversionDialog';
import type {
    RecipeNodeData,
    RecipeFlowNode,
    FlowNodeSerialized,
    FlowEdgeSerialized,
    StepType,
} from './editor/editorTypes';
import { FlowEditorContext, type FlowEditorContextValue } from './editor/FlowEditorContext';
import { InsertEdge } from './editor/InsertEdge';
import { NodeEditPanel } from './editor/NodeEditPanel';
import { RecipeNode } from './editor/RecipeNode';
import { getStepConfig } from './editor/stepConfig';
import { useFlowAutoLayout } from './editor/useFlowAutoLayout';

/* ── constants ───────────────────────────────────────────── */

const NODE_WIDTH = 220;
const HORIZONTAL_GAP = 80;

/* ── sidebar resize constants ────────────────────────────── */

const LS_RIGHT_W = 'flow-right-width';
const RIGHT_W_DEFAULT = 300;
const RIGHT_W_MIN = 240;
const RIGHT_W_MAX = 500;

const DEFAULT_EDGE_STYLE: React.CSSProperties = { stroke: PALETTE.orange, strokeWidth: 2 };

/** Stable nodeTypes / edgeTypes / edgeOptions — defined once at module level, never recreated. */
const NODE_TYPES = { recipeStep: RecipeNode };
const EDGE_TYPES = { insertable: InsertEdge };
const DEFAULT_EDGE_OPTIONS = { type: 'insertable', style: DEFAULT_EDGE_STYLE } as const;
const FIT_VIEW_OPTIONS = { padding: 0.2 } as const;
const FIT_VIEW_ANIMATE = { padding: 0.2, duration: 200 } as const;

/** Adaptive padding for single-node fitView: tighter on narrow canvases */
function nodeFitPadding(canvasEl: HTMLElement | null): number {
    const w = canvasEl?.clientWidth ?? 1200;
    if (w < 600) return 1;
    if (w < 900) return 2;
    return 3;
}
const DELETE_KEY_CODE = ['Backspace', 'Delete'];

/* ── helpers ─────────────────────────────────────────────── */

let nodeCounter = 0;
function generateId(): string {
    return `node_${Date.now()}_${++nodeCounter}`;
}

function createDefaultNodes(): RecipeFlowNode[] {
    return [
        {
            id: 'start',
            type: 'recipeStep',
            position: { x: 50, y: 200 },
            data: { stepType: 'start', label: "Los geht's!", description: '' },
        },
        {
            id: 'servieren',
            type: 'recipeStep',
            position: { x: 50 + NODE_WIDTH + HORIZONTAL_GAP, y: 200 },
            data: { stepType: 'servieren', label: 'Servieren', description: 'Guten Appetit!' },
        },
    ];
}

function createDefaultEdges(): Edge[] {
    return [
        {
            id: 'start-to-servieren',
            source: 'start',
            target: 'servieren',
            type: 'insertable',
            animated: true,
            style: { ...DEFAULT_EDGE_STYLE, strokeDasharray: '5 5' },
        },
    ];
}

function serializeNodes(nodes: RecipeFlowNode[]): FlowNodeSerialized[] {
    return nodes.map((n) => ({
        id: n.id,
        type: n.data.stepType,
        label: n.data.label,
        description: n.data.description,
        duration: n.data.duration,
        ingredientIds: n.data.ingredientIds,
        photoKey: n.data.photoKey,
        position: n.position,
    }));
}

function serializeEdges(edges: Edge[]): FlowEdgeSerialized[] {
    return edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
    }));
}

function deserializeNodes(nodes: FlowNodeSerialized[]): RecipeFlowNode[] {
    return nodes.map((n) => ({
        id: n.id,
        type: 'recipeStep' as const,
        position: n.position ?? { x: 0, y: 0 },
        data: {
            stepType: n.type,
            label: n.label,
            description: n.description,
            duration: n.duration,
            ingredientIds: n.ingredientIds,
            photoKey: n.photoKey,
        },
    }));
}

function deserializeEdges(edges: FlowEdgeSerialized[]): Edge[] {
    return edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'insertable',
        style: DEFAULT_EDGE_STYLE,
    }));
}

/* ── props ───────────────────────────────────────────────── */

export interface FlowEditorProps {
    availableIngredients?: AddedIngredient[];
    initialNodes?: FlowNodeSerialized[];
    initialEdges?: FlowEdgeSerialized[];
    onChange?: (nodes: FlowNodeSerialized[], edges: FlowEdgeSerialized[]) => void;
    onAddIngredientToRecipe?: (
        ing: import('@app/components/recipe/RecipeForm/data').IngredientSearchResult,
    ) => void;
    onAiApply?: (result: AIAnalysisResult, apply: ApplySelection) => void;
    recipeId?: string;
}

/* ── inner component (needs ReactFlowProvider above it) ── */

function FlowEditorInner({
    availableIngredients = [],
    initialNodes,
    initialEdges,
    onChange,
    onAddIngredientToRecipe,
    onAiApply,
    recipeId,
}: FlowEditorProps) {
    const { screenToFlowPosition, getNodes, getEdges, fitView } = useReactFlow();

    // Wrap xyflow imperative APIs in a ref — they return new function references every render,
    // so any useCallback that lists them as deps would change every render, causing
    // StoreUpdater.useEffect to fire → zustand setState → forceStoreRerender → infinite loop.
    const rfRef = useRef({ screenToFlowPosition, getNodes, getEdges, fitView });
    rfRef.current = { screenToFlowPosition, getNodes, getEdges, fitView };

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const [initialN] = useMemo(
        () => [
            initialNodes && initialNodes.length > 0
                ? deserializeNodes(initialNodes)
                : createDefaultNodes(),
        ],
        // Only compute initial state once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const [initialE] = useMemo(
        () => [
            initialEdges && initialEdges.length > 0
                ? deserializeEdges(initialEdges)
                : createDefaultEdges(),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialN);
    const [edges, setEdges, handleEdgesChange] = useEdgesState(initialE);

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [aiDialogOpen, setAiDialogOpen] = useState(false);
    const applyLayout = useFlowAutoLayout();

    /* ── sidebar resize / visibility ── */

    const [rightWidth, setRightWidth] = useState(RIGHT_W_DEFAULT);

    // Sync @mention ingredients from initial nodes into the recipe ingredient list.
    // Handles cases where step descriptions were pre-filled (AI import, etc.) with
    // @[Name](id) mentions referencing ingredients not yet in the recipe sidebar.
    useEffect(() => {
        if (!onAddIngredientToRecipe) return;
        const MENTION_RE = /@\[([^\]|]+)(?:\|[^\]]*)?\]\(([^)]+)\)/g;
        const recipeIds = new Set(availableIngredients.map((i) => i.id));
        const toAdd = new Map<string, string>(); // id → name
        for (const node of initialN) {
            const description = (node.data as RecipeNodeData).description ?? '';
            MENTION_RE.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = MENTION_RE.exec(description)) !== null) {
                const [, name, id] = match;
                if (!recipeIds.has(id) && !toAdd.has(id)) {
                    toAdd.set(id, name);
                }
            }
        }
        for (const [id, name] of toAdd) {
            onAddIngredientToRecipe({ id, name, category: null, units: [] });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Restore from localStorage after mount (avoids SSR/client hydration mismatch)
    useEffect(() => {
        const rw = Number(localStorage.getItem(LS_RIGHT_W)) || RIGHT_W_DEFAULT;
        setRightWidth(rw);
    }, []);

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(LS_RIGHT_W, String(rightWidth));
    }, [rightWidth]);

    // Ref so resize handler always read the current width without stale closures
    const rightWidthRef = useRef(rightWidth);
    rightWidthRef.current = rightWidth;

    const startRightResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = rightWidthRef.current;
        const onMove = (ev: MouseEvent) =>
            setRightWidth(
                Math.max(RIGHT_W_MIN, Math.min(RIGHT_W_MAX, startW + startX - ev.clientX)),
            );
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, []);

    /* ── derived: edge counts per node ── */

    const nodeOutgoingEdges = useMemo<Map<string, number>>(() => {
        const map = new Map<string, number>();
        for (const edge of edges) {
            map.set(edge.source, (map.get(edge.source) ?? 0) + 1);
        }
        return map;
    }, [edges]);

    const nodeIncomingEdges = useMemo<Map<string, number>>(() => {
        const map = new Map<string, number>();
        for (const edge of edges) {
            map.set(edge.target, (map.get(edge.target) ?? 0) + 1);
        }
        return map;
    }, [edges]);

    const selectedNode = useMemo(
        () => (selectedNodeId ? (nodes.find((n) => n.id === selectedNodeId) ?? null) : null),
        [nodes, selectedNodeId],
    );

    const validation = useMemo(
        () => validateFlow(serializeNodes(nodes), serializeEdges(edges), { scope: 'editor' }),
        [nodes, edges],
    );

    const validationIssuesByNode = useMemo(
        () => getValidationIssuesByNode(validation),
        [validation],
    );

    /* ── notify parent of changes ── */

    const notifyChange = useCallback((nextNodes: RecipeFlowNode[], nextEdges: Edge[]) => {
        onChangeRef.current?.(serializeNodes(nextNodes), serializeEdges(nextEdges));
    }, []);

    /** Apply layout to given nodes/edges, update state, notify parent, and fit view */
    const autoLayoutAndFit = useCallback(
        (nextNodes: RecipeFlowNode[], nextEdges: Edge[]) => {
            const laid = applyLayout(nextNodes, nextEdges);
            setNodes(laid);
            setEdges(nextEdges);
            notifyChange(laid, nextEdges);
            requestAnimationFrame(() => rfRef.current.fitView(FIT_VIEW_ANIMATE));
        },
        [applyLayout, setNodes, setEdges, notifyChange],
    );

    /* ── auto-layout on first mount when nodes have no position (e.g. imported recipes) ── */

    const didAutoLayout = useRef(false);

    useEffect(() => {
        if (didAutoLayout.current) return;
        if (!initialNodes || initialNodes.length === 0) return;

        // Detect nodes that were saved without position (imported from AI)
        const needsLayout = initialNodes.some((n) => !n.position);
        if (!needsLayout) return;

        didAutoLayout.current = true;

        // Small delay to allow ReactFlow to finish its initial render before fitView
        const timer = setTimeout(() => {
            autoLayoutAndFit(
                rfRef.current.getNodes() as RecipeFlowNode[],
                rfRef.current.getEdges(),
            );
        }, 50);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── xyflow callbacks ── */

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const hasRemoval = changes.some((c) => c.type === 'remove');
            handleEdgesChange(changes);
            if (hasRemoval) {
                // After edge removal, re-layout and notify
                queueMicrotask(() => {
                    const currentNodes = rfRef.current.getNodes() as RecipeFlowNode[];
                    const currentEdges = rfRef.current.getEdges();
                    const laid = applyLayout(currentNodes, currentEdges);
                    setNodes(laid);
                    notifyChange(laid, currentEdges);
                    requestAnimationFrame(() => rfRef.current.fitView(FIT_VIEW_ANIMATE));
                });
            } else {
                // Selection changes etc — just notify with latest store state
                queueMicrotask(() => {
                    notifyChange(
                        rfRef.current.getNodes() as RecipeFlowNode[],
                        rfRef.current.getEdges(),
                    );
                });
            }
        },
        [handleEdgesChange, applyLayout, setNodes, notifyChange],
    );

    const handleNodesChange: typeof onNodesChange = useCallback(
        (changes) => {
            onNodesChange(changes);
            // Read latest state from xyflow store after React processes the change
            queueMicrotask(() => {
                notifyChange(
                    rfRef.current.getNodes() as RecipeFlowNode[],
                    rfRef.current.getEdges(),
                );
            });
        },
        [onNodesChange, notifyChange],
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            const currentNodes = rfRef.current.getNodes() as RecipeFlowNode[];
            const currentEdges = rfRef.current.getEdges();
            const nextEdges = addEdge(
                { ...connection, type: 'insertable', style: DEFAULT_EDGE_STYLE },
                currentEdges,
            );
            autoLayoutAndFit(currentNodes, nextEdges);
        },
        [autoLayoutAndFit],
    );

    /* ── connection validation ── */

    const isValidConnection = useCallback((connection: Edge | Connection): boolean => {
        const { source, target } = connection;
        if (!source || !target) return false;
        if (source === target) return false;
        if (source === 'servieren') return false;
        if (target === 'start') return false;
        return true;
    }, []);

    /* ── node CRUD ── */

    const _addNewNode = useCallback(
        (stepType: StepType, position?: { x: number; y: number }) => {
            const _config = getStepConfig(stepType);
            const newId = generateId();
            const currentNodes = rfRef.current.getNodes() as RecipeFlowNode[];
            const currentEdges = rfRef.current.getEdges();

            const newNode: RecipeFlowNode = {
                id: newId,
                type: 'recipeStep',
                position: position ?? { x: 0, y: 0 },
                data: { stepType, label: '', description: '' },
            };

            const nextNodes = [...currentNodes, newNode] as RecipeFlowNode[];

            if (position) {
                // Drag-drop: no auto-wire, just place and layout
                autoLayoutAndFit(nextNodes, currentEdges);
                return;
            }

            // Palette click: auto-wire before servieren
            const edgeToServieren = currentEdges.find((e) => e.target === 'servieren');
            const predId = edgeToServieren?.source ?? null;
            const withoutOldServieren = predId
                ? currentEdges.filter((e) => !(e.source === predId && e.target === 'servieren'))
                : currentEdges;
            const nextEdges: Edge[] = [...withoutOldServieren];
            if (predId) {
                nextEdges.push({
                    id: `${predId}-${newId}`,
                    source: predId,
                    target: newId,
                    type: 'insertable',
                    style: DEFAULT_EDGE_STYLE,
                });
            }
            nextEdges.push({
                id: `${newId}-servieren`,
                source: newId,
                target: 'servieren',
                type: 'insertable',
                style: DEFAULT_EDGE_STYLE,
            });

            autoLayoutAndFit(nextNodes, nextEdges);
        },
        [autoLayoutAndFit],
    );

    const handleAddNodeAfter = useCallback(
        (parentNodeId: string, stepType: StepType) => {
            const _config = getStepConfig(stepType);
            const newId = generateId();
            const currentNodes = rfRef.current.getNodes() as RecipeFlowNode[];
            const currentEdges = rfRef.current.getEdges();

            const newNode: RecipeFlowNode = {
                id: newId,
                type: 'recipeStep',
                position: { x: 0, y: 0 },
                data: { stepType, label: '', description: '' },
            };

            const nextNodes = [...currentNodes, newNode] as RecipeFlowNode[];

            // Wire: parent → new, and if parent was connected to servieren, new → servieren
            const edgeFromParent = currentEdges.find(
                (e) => e.source === parentNodeId && e.target === 'servieren',
            );
            const nextEdges: Edge[] = edgeFromParent
                ? [
                      ...currentEdges.filter((e) => e.id !== edgeFromParent.id),
                      {
                          id: `${parentNodeId}-${newId}`,
                          source: parentNodeId,
                          target: newId,
                          type: 'insertable',
                          style: DEFAULT_EDGE_STYLE,
                      },
                      {
                          id: `${newId}-servieren`,
                          source: newId,
                          target: 'servieren',
                          type: 'insertable',
                          style: DEFAULT_EDGE_STYLE,
                      },
                  ]
                : [
                      ...currentEdges,
                      {
                          id: `${parentNodeId}-${newId}`,
                          source: parentNodeId,
                          target: newId,
                          type: 'insertable',
                          style: DEFAULT_EDGE_STYLE,
                      },
                  ];

            autoLayoutAndFit(nextNodes, nextEdges);
        },
        [autoLayoutAndFit],
    );

    /** Fork: always appends a new edge from parent without removing/rewiring anything */
    const handleForkNodeAfter = useCallback(
        (parentNodeId: string, stepType: StepType) => {
            const newId = generateId();
            const currentNodes = rfRef.current.getNodes() as RecipeFlowNode[];
            const currentEdges = rfRef.current.getEdges();

            const newNode: RecipeFlowNode = {
                id: newId,
                type: 'recipeStep',
                position: { x: 0, y: 0 },
                data: { stepType, label: '', description: '' },
            };

            const nextEdges: Edge[] = [
                ...currentEdges,
                {
                    id: `${parentNodeId}-${newId}`,
                    source: parentNodeId,
                    target: newId,
                    type: 'insertable',
                    style: DEFAULT_EDGE_STYLE,
                },
            ];

            autoLayoutAndFit([...currentNodes, newNode] as RecipeFlowNode[], nextEdges);
        },
        [autoLayoutAndFit],
    );

    const handleAddNodeBefore = useCallback(
        (childNodeId: string, stepType: StepType) => {
            const _config = getStepConfig(stepType);
            const newId = generateId();
            const currentNodes = rfRef.current.getNodes() as RecipeFlowNode[];
            const currentEdges = rfRef.current.getEdges();

            const newNode: RecipeFlowNode = {
                id: newId,
                type: 'recipeStep',
                position: { x: 0, y: 0 },
                data: { stepType, label: '', description: '' },
            };

            const nextNodes = [...currentNodes, newNode] as RecipeFlowNode[];

            // Rewire: find edge going into childNodeId, replace target with newId, add newId→childId
            const incomingEdge = currentEdges.find((e) => e.target === childNodeId);
            const nextEdges: Edge[] = incomingEdge
                ? [
                      ...currentEdges.filter((e) => e.id !== incomingEdge.id),
                      {
                          id: `${incomingEdge.source}-${newId}`,
                          source: incomingEdge.source,
                          target: newId,
                          type: 'insertable',
                          style: DEFAULT_EDGE_STYLE,
                      },
                      {
                          id: `${newId}-${childNodeId}`,
                          source: newId,
                          target: childNodeId,
                          type: 'insertable',
                          style: DEFAULT_EDGE_STYLE,
                      },
                  ]
                : [
                      ...currentEdges,
                      {
                          id: `${newId}-${childNodeId}`,
                          source: newId,
                          target: childNodeId,
                          type: 'insertable',
                          style: DEFAULT_EDGE_STYLE,
                      },
                  ];

            autoLayoutAndFit(nextNodes, nextEdges);
        },
        [autoLayoutAndFit],
    );

    const handleDeleteNode = useCallback(
        (nodeId: string) => {
            if (nodeId === 'start' || nodeId === 'servieren') return;
            setSelectedNodeId((prev) => (prev === nodeId ? null : prev));

            const currentNodes = rfRef.current.getNodes() as RecipeFlowNode[];
            const currentEdges = rfRef.current.getEdges();

            // Rewire: if the deleted node has exactly one incoming and one outgoing edge, connect them
            const incoming = currentEdges.filter((e) => e.target === nodeId);
            const outgoing = currentEdges.filter((e) => e.source === nodeId);
            const otherEdges = currentEdges.filter(
                (e) => e.source !== nodeId && e.target !== nodeId,
            );

            let nextEdges = otherEdges;
            if (incoming.length === 1 && outgoing.length === 1) {
                nextEdges = [
                    ...otherEdges,
                    {
                        id: `${incoming[0].source}-${outgoing[0].target}`,
                        source: incoming[0].source,
                        target: outgoing[0].target,
                        type: 'insertable',
                        style: DEFAULT_EDGE_STYLE,
                    },
                ];
            }

            const nextNodes = currentNodes.filter((n) => n.id !== nodeId);
            autoLayoutAndFit(nextNodes, nextEdges);
        },
        [autoLayoutAndFit],
    );

    const handleSelectNode = useCallback((nodeId: string) => {
        // Start and Servieren nodes are not editable
        if (nodeId === 'start' || nodeId === 'servieren') {
            setSelectedNodeId(null);
            return;
        }
        setSelectedNodeId(nodeId);
        requestAnimationFrame(() => {
            rfRef.current.fitView({
                nodes: [{ id: nodeId }],
                padding: nodeFitPadding(canvasRef.current),
                duration: 300,
            });
        });
    }, []);

    const handleUpdateNode = useCallback(
        (nodeId: string, updates: Partial<RecipeNodeData>) => {
            setNodes((nds) =>
                nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n)),
            );
            queueMicrotask(() => {
                notifyChange(
                    rfRef.current.getNodes() as RecipeFlowNode[],
                    rfRef.current.getEdges(),
                );
            });
        },
        [setNodes, notifyChange],
    );

    const handleCloseEditPanel = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    /* ── insert node onto edge ── */

    const handleInsertOnEdge = useCallback(
        (edgeId: string, sourceId: string, targetId: string, stepType: StepType) => {
            const _config = getStepConfig(stepType);
            const newId = generateId();
            const currentNodes = rfRef.current.getNodes() as RecipeFlowNode[];
            const currentEdges = rfRef.current.getEdges();

            const newNode: RecipeFlowNode = {
                id: newId,
                type: 'recipeStep',
                position: { x: 0, y: 0 },
                data: { stepType, label: '', description: '' },
            };

            const nextNodes = [...currentNodes, newNode] as RecipeFlowNode[];
            const nextEdges: Edge[] = [
                ...currentEdges.filter((e) => e.id !== edgeId),
                {
                    id: `${sourceId}-${newId}`,
                    source: sourceId,
                    target: newId,
                    type: 'insertable',
                    style: DEFAULT_EDGE_STYLE,
                },
                {
                    id: `${newId}-${targetId}`,
                    source: newId,
                    target: targetId,
                    type: 'insertable',
                    style: DEFAULT_EDGE_STYLE,
                },
            ];

            autoLayoutAndFit(nextNodes, nextEdges);
        },
        [autoLayoutAndFit],
    );

    /* ── auto-layout ── */

    const handleAutoLayout = useCallback(() => {
        const currentNodes = rfRef.current.getNodes() as RecipeFlowNode[];
        const currentEdges = rfRef.current.getEdges();
        const laid = applyLayout(currentNodes, currentEdges);
        setNodes(laid);
        notifyChange(laid, currentEdges);
        requestAnimationFrame(() => rfRef.current.fitView(FIT_VIEW_ANIMATE));
    }, [applyLayout, setNodes, notifyChange]);

    /* ── auto fitView on container resize (window resize / sidebar toggle) ── */

    const canvasRef = useRef<HTMLDivElement | null>(null);
    const canvasRefCallback: RefCallback<HTMLDivElement> = useCallback((el) => {
        canvasRef.current = el;
    }, []);

    // Track selected node id in a ref so the resize observer can read it without deps
    const selectedNodeIdRef = useRef(selectedNodeId);
    selectedNodeIdRef.current = selectedNodeId;

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;

        let timer: ReturnType<typeof setTimeout>;
        const ro = new ResizeObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const nodeId = selectedNodeIdRef.current;
                const p = nodeFitPadding(canvasRef.current);
                if (nodeId) {
                    rfRef.current.fitView({ nodes: [{ id: nodeId }], padding: p, duration: 300 });
                } else {
                    rfRef.current.fitView(FIT_VIEW_ANIMATE);
                }
            }, 250);
        });
        ro.observe(el);
        return () => {
            clearTimeout(timer);
            ro.disconnect();
        };
        // rfRef and selectedNodeIdRef are stable refs — intentionally excluded from deps
    }, []);

    /* ── context value (stable unless ingredients/callbacks change) ── */

    const contextValue = useMemo<FlowEditorContextValue>(
        () => ({
            availableIngredients,
            onSelectNode: handleSelectNode,
            onDeleteNode: handleDeleteNode,
            nodeOutgoingEdges,
            nodeIncomingEdges,
            onAddNodeAfter: handleAddNodeAfter,
            onAddNodeBefore: handleAddNodeBefore,
            onForkNodeAfter: handleForkNodeAfter,
            onAddIngredientToRecipe,
            onInsertOnEdge: handleInsertOnEdge,
            recipeId,
            validation,
            validationIssuesByNode,
        }),
        [
            availableIngredients,
            handleSelectNode,
            handleDeleteNode,
            nodeOutgoingEdges,
            nodeIncomingEdges,
            handleAddNodeAfter,
            handleAddNodeBefore,
            handleForkNodeAfter,
            onAddIngredientToRecipe,
            handleInsertOnEdge,
            recipeId,
            validation,
            validationIssuesByNode,
        ],
    );

    return (
        <FlowEditorContext.Provider value={contextValue}>
            <div className={editorContainerClass}>
                <div ref={canvasRefCallback} className={canvasContainerClass}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={handleNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        isValidConnection={isValidConnection}
                        nodeTypes={NODE_TYPES}
                        edgeTypes={EDGE_TYPES}
                        fitView
                        fitViewOptions={FIT_VIEW_OPTIONS}
                        minZoom={0.1}
                        maxZoom={2}
                        deleteKeyCode={DELETE_KEY_CODE}
                        zoomOnScroll={false}
                        panOnScroll={true}
                        edgesReconnectable
                        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                    >
                        <Background color={PALETTE.orange} gap={20} size={1} />
                        <Controls
                            className={controlsClass}
                            showZoom={true}
                            showFitView={true}
                            showInteractive={false}
                        />
                        <Panel
                            position="top-right"
                            className={css({ display: 'flex', gap: '2', alignItems: 'center' })}
                        >
                            <button
                                type="button"
                                className={aiButtonClass}
                                title="Kommt bald: KI-gestützte Rezeptkonvertierung"
                                onClick={() => setAiDialogOpen(true)}
                            >
                                <Sparkles
                                    className={css({
                                        width: '13px',
                                        height: '13px',
                                        flexShrink: '0',
                                    })}
                                />
                                Lass KI die Arbeit übernehmen
                            </button>
                            <button
                                type="button"
                                className={layoutButtonClass}
                                onClick={handleAutoLayout}
                            >
                                Layout aufräumen
                            </button>
                        </Panel>
                    </ReactFlow>
                    {validation.errors.length > 0 && (
                        <div className={validationPanelClass} role="status" aria-live="polite">
                            <div className={validationPanelHeaderClass}>
                                <div>
                                    <div className={validationPanelEyebrowClass}>Flow-Check</div>
                                    <div className={validationPanelSummaryClass}>
                                        {validation.summary ?? 'Bitte pruefe den Ablauf.'}
                                    </div>
                                </div>
                                <div className={validationPanelCountsClass}>
                                    {validation.counts.blocking > 0 && (
                                        <span className={validationCountErrorClass}>
                                            {validation.counts.blocking} Blocker
                                        </span>
                                    )}
                                    {validation.counts.warnings > 0 && (
                                        <span className={validationCountWarningClass}>
                                            {validation.counts.warnings} Hinweise
                                        </span>
                                    )}
                                </div>
                            </div>
                            {validation.blockingIssues.length > 0 && (
                                <div className={validationSectionClass}>
                                    <div className={validationSectionTitleClass}>
                                        Vor dem Veroeffentlichen beheben
                                    </div>
                                    {validation.blockingIssues.slice(0, 4).map((issue) => (
                                        <button
                                            key={issue.id}
                                            type="button"
                                            className={validationItemErrorClass}
                                            onClick={() =>
                                                issue.nodeId && handleSelectNode(issue.nodeId)
                                            }
                                            disabled={!issue.nodeId}
                                            title={issue.hint ?? issue.message}
                                        >
                                            <span className={validationItemTitleClass}>
                                                {issue.title}
                                            </span>
                                            <span className={validationItemTextClass}>
                                                {issue.message}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {validation.warningIssues.length > 0 && (
                                <div className={validationSectionClass}>
                                    <div className={validationSectionTitleClass}>
                                        Empfohlene Verbesserungen
                                    </div>
                                    {validation.warningIssues.slice(0, 3).map((issue) => (
                                        <button
                                            key={issue.id}
                                            type="button"
                                            className={validationItemWarningClass}
                                            onClick={() =>
                                                issue.nodeId && handleSelectNode(issue.nodeId)
                                            }
                                            disabled={!issue.nodeId}
                                            title={issue.hint ?? issue.message}
                                        >
                                            <span className={validationItemTitleClass}>
                                                {issue.title}
                                            </span>
                                            <span className={validationItemTextClass}>
                                                {issue.message}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* ── Right edit panel ── */}
                {selectedNode && (
                    <div style={{ width: rightWidth, flexShrink: 0, position: 'relative' }}>
                        <div className={rightResizeHandleClass} onMouseDown={startRightResize} />
                        <NodeEditPanel
                            key={selectedNode.id}
                            nodeId={selectedNode.id}
                            data={selectedNode.data as RecipeNodeData}
                            availableIngredients={availableIngredients}
                            onSave={(updates) => {
                                handleUpdateNode(selectedNode.id, updates);
                            }}
                            onClose={handleCloseEditPanel}
                            onDelete={() => handleDeleteNode(selectedNode.id)}
                            canDelete={
                                selectedNode.data.stepType !== 'start' &&
                                selectedNode.data.stepType !== 'servieren'
                            }
                        />
                    </div>
                )}
            </div>
            <AiConversionDialog
                open={aiDialogOpen}
                onClose={() => setAiDialogOpen(false)}
                onResult={(result, apply) => {
                    const newNodes: RecipeFlowNode[] = result.flowNodes.map((node) => ({
                        id: node.id,
                        type: 'recipeStep' as const,
                        position: { x: 0, y: 0 },
                        data: {
                            stepType: node.type as StepType,
                            label: node.label,
                            description: node.description,
                            duration: node.duration,
                            ingredientIds: node.ingredientIds,
                        },
                    }));

                    const newEdges: Edge[] = result.flowEdges.map((edge) => ({
                        id: edge.id,
                        source: edge.source,
                        target: edge.target,
                        type: 'insertable',
                        style: DEFAULT_EDGE_STYLE,
                    }));

                    // autoLayoutAndFit computes dagre positions, sets state, notifies parent, and fits view
                    autoLayoutAndFit(newNodes, newEdges);
                    // Notify parent about metadata to apply (title, description, tags, etc.)
                    onAiApply?.(result, apply);
                    setAiDialogOpen(false);
                }}
            />
        </FlowEditorContext.Provider>
    );
}

/* ── styles ──────────────────────────────────────────────── */

const editorContainerClass = css({
    display: 'flex',
    gap: '3',
    width: '100%',
    height: '100%',
    minHeight: '400px',
});

const rightResizeHandleClass = css({
    position: 'absolute',
    top: '0',
    bottom: '0',
    left: '-6px',
    width: '12px',
    cursor: 'col-resize',
    zIndex: '10',
    '&::before': {
        content: '""',
        display: 'block',
        width: '2px',
        height: '32px',
        borderRadius: 'full',
        mx: 'auto',
        backgroundColor: { base: 'rgba(224,123,83,0.0)', _dark: 'rgba(224,123,83,0.0)' },
        transition: 'background-color 0.15s ease',
    },
    _hover: {
        '&::before': {
            backgroundColor: { base: 'rgba(224,123,83,0.5)', _dark: 'rgba(224,123,83,0.4)' },
        },
    },
});

const canvasContainerClass = css({
    flex: '1',
    border: '1px solid rgba(224,123,83,0.4)',
    borderRadius: 'xl',
    backgroundColor: 'surface',
    overflow: 'hidden',
    position: 'relative',
});

const controlsClass = css({
    '& button': {
        backgroundColor: 'surface',
        border: '1px solid rgba(224,123,83,0.4)',
        borderRadius: 'md',
        color: 'text',
        _hover: { backgroundColor: 'accent.soft' },
    },
});

const layoutButtonClass = css({
    py: '2',
    px: '3',
    backgroundColor: 'surface',
    border: '1px solid rgba(224,123,83,0.4)',
    borderRadius: 'md',
    fontSize: 'sm',
    color: 'text',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        backgroundColor: 'accent.soft',
        borderColor: 'brand.primary',
    },
});

const aiButtonClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    py: '1.5',
    px: '3',
    borderRadius: 'full',
    fontSize: 'xs',
    fontWeight: '600',
    cursor: 'pointer',
    border: '1px solid rgba(147,51,234,0.35)',
    background: 'linear-gradient(135deg, rgba(147,51,234,0.07) 0%, rgba(224,123,83,0.07) 100%)',
    color: 'rgb(109,40,217)',
    letterSpacing: '0.01em',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(4px)',
    _hover: {
        background: 'linear-gradient(135deg, rgba(147,51,234,0.15) 0%, rgba(224,123,83,0.12) 100%)',
        borderColor: 'rgba(147,51,234,0.55)',
        boxShadow: {
            base: '0 2px 12px rgba(147,51,234,0.25)',
            _dark: '0 2px 12px rgba(147,51,234,0.2)',
        },
    },
});

const validationPanelClass = css({
    position: 'absolute',
    top: '16px',
    left: '16px',
    right: 'auto',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3',
    padding: '3',
    borderRadius: 'xl',
    backgroundColor: {
        base: 'rgba(255,255,255,0.95)',
        _dark: 'rgba(15,15,15,0.8)',
    },
    border: '1px solid rgba(224,123,83,0.5)',
    boxShadow: '0 10px 35px rgba(0,0,0,0.12)',
    pointerEvents: 'auto',
    zIndex: '10',
});

const validationPanelHeaderClass = css({
    display: 'flex',
    justifyContent: 'space-between',
    gap: '3',
    alignItems: 'flex-start',
});

const validationPanelEyebrowClass = css({
    fontSize: 'xs',
    fontWeight: '700',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'text.muted',
});

const validationPanelSummaryClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    color: 'text.primary',
});

const validationPanelCountsClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1',
    alignItems: 'flex-end',
});

const validationCountBaseClass = css({
    fontSize: 'xs',
    fontWeight: '600',
    padding: '0.75 1.5',
    borderRadius: 'full',
});

const validationCountErrorClass = cx(
    validationCountBaseClass,
    css({
        backgroundColor: 'rgba(239,68,68,0.14)',
        color: '#b91c1c',
    }),
);

const validationCountWarningClass = cx(
    validationCountBaseClass,
    css({
        backgroundColor: 'rgba(245,158,11,0.16)',
        color: '#b45309',
    }),
);

const validationSectionClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5',
});

const validationSectionTitleClass = css({
    fontSize: 'xs',
    fontWeight: '700',
    color: 'text.muted',
});

const validationItemBaseClass = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.5',
    width: '100%',
    textAlign: 'left',
    padding: '2.5',
    borderRadius: 'lg',
    border: '1px solid transparent',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
    _disabled: {
        cursor: 'default',
        opacity: 0.75,
    },
});

const validationItemErrorClass = cx(
    validationItemBaseClass,
    css({
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderColor: 'rgba(239,68,68,0.18)',
        _hover: {
            backgroundColor: 'rgba(239,68,68,0.12)',
        },
    }),
);

const validationItemWarningClass = cx(
    validationItemBaseClass,
    css({
        backgroundColor: 'rgba(245,158,11,0.08)',
        borderColor: 'rgba(245,158,11,0.18)',
        _hover: {
            backgroundColor: 'rgba(245,158,11,0.12)',
        },
    }),
);

const validationItemTitleClass = css({
    fontSize: 'xs',
    fontWeight: '700',
    backgroundColor: 'rgba(224,123,83,0.18)',
    color: 'text.primary',
    borderRadius: 'full',
    padding: '0.25 1.25',
});

const validationItemTextClass = css({
    fontSize: 'xs',
    color: 'text.secondary',
    lineHeight: '1.45',
});

/* ── public export (wraps in ReactFlowProvider) ─────────── */

export function FlowEditor(props: FlowEditorProps) {
    return (
        <ReactFlowProvider>
            <FlowEditorInner {...props} />
        </ReactFlowProvider>
    );
}
