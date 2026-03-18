'use client';

import {
    addEdge,
    type Connection,
    type Edge,
    type EdgeChange,
    type OnNodesChange,
    useReactFlow,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';

import type { AddedIngredient } from '@app/components/recipe/RecipeForm/data';
import {
    dispatchRecipeTutorialEvent,
    RECIPE_TUTORIAL_EVENTS,
} from '@app/components/recipe/tutorial/shared';
import { getValidationIssuesByNode, validateFlow } from '@app/lib/validation/flowValidation';

import type {
    FlowEdgeSerialized,
    FlowNodeSerialized,
    RecipeFlowNode,
    RecipeNodeData,
    StepType,
} from './editor/editorTypes';
import { useFlowAutoLayout } from './editor/useFlowAutoLayout';
import {
    DEFAULT_EDGE_STYLE,
    FIT_VIEW_ANIMATE,
    LS_RIGHT_W,
    nodeFitPadding,
    RIGHT_W_DEFAULT,
    RIGHT_W_MAX,
    RIGHT_W_MIN,
    serializeEdges,
    serializeNodes,
} from './flowEditorConstants';
import { useFlowNodeCrud } from './useFlowNodeCrud';

/* ── types ───────────────────────────────────────────────── */

/** Ref wrapper for xyflow imperative APIs to avoid re-render issues */
export interface RfRef {
    screenToFlowPosition: ReturnType<typeof useReactFlow>['screenToFlowPosition'];
    getNodes: ReturnType<typeof useReactFlow>['getNodes'];
    getEdges: ReturnType<typeof useReactFlow>['getEdges'];
    fitView: ReturnType<typeof useReactFlow>['fitView'];
}

export interface UseFlowCallbacksArgs {
    rfRef: MutableRefObject<RfRef>;
    nodes: RecipeFlowNode[];
    edges: Edge[];
    setNodes: (updater: RecipeFlowNode[] | ((nds: RecipeFlowNode[]) => RecipeFlowNode[])) => void;
    setEdges: (updater: Edge[] | ((eds: Edge[]) => Edge[])) => void;
    onNodesChange: OnNodesChange<RecipeFlowNode>;
    handleEdgesChange: (changes: EdgeChange[]) => void;
    onChange?: (nodes: FlowNodeSerialized[], edges: FlowEdgeSerialized[]) => void;
    initialNodes?: FlowNodeSerialized[];
    initialN: RecipeFlowNode[];
    availableIngredients: AddedIngredient[];
    onAddIngredientToRecipe?: (
        ing: import('@app/components/recipe/RecipeForm/data').IngredientSearchResult,
    ) => void;
    canvasRef: MutableRefObject<HTMLDivElement | null>;
}

export interface UseFlowCallbacksReturn {
    /* state */
    selectedNodeId: string | null;
    selectedNode: RecipeFlowNode | null;
    aiDialogOpen: boolean;
    setAiDialogOpen: (open: boolean) => void;
    rightWidth: number;
    validation: ReturnType<typeof validateFlow>;
    validationIssuesByNode: ReturnType<typeof getValidationIssuesByNode>;
    nodeOutgoingEdges: Map<string, number>;
    nodeIncomingEdges: Map<string, number>;

    /* callbacks */
    handleNodesChange: OnNodesChange<RecipeFlowNode>;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    isValidConnection: (connection: Edge | Connection) => boolean;
    handleSelectNode: (nodeId: string) => void;
    handleDeleteNode: (nodeId: string) => void;
    handleUpdateNode: (nodeId: string, updates: Partial<RecipeNodeData>) => void;
    handleCloseEditPanel: () => void;
    handleAddNodeAfter: (parentNodeId: string, stepType: StepType) => void;
    handleForkNodeAfter: (parentNodeId: string, stepType: StepType) => void;
    handleAddNodeBefore: (childNodeId: string, stepType: StepType) => void;
    handleInsertOnEdge: (
        edgeId: string,
        sourceId: string,
        targetId: string,
        stepType: StepType,
    ) => void;
    handleAutoLayout: () => void;
    autoLayoutAndFit: (nextNodes: RecipeFlowNode[], nextEdges: Edge[]) => void;
    startRightResize: (e: React.MouseEvent) => void;
}

/* ── hook ────────────────────────────────────────────────── */

export function useFlowCallbacks({
    rfRef,
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    handleEdgesChange,
    onChange,
    initialNodes,
    initialN,
    availableIngredients,
    onAddIngredientToRecipe,
    canvasRef,
}: UseFlowCallbacksArgs): UseFlowCallbacksReturn {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [aiDialogOpen, setAiDialogOpen] = useState(false);
    const applyLayout = useFlowAutoLayout();

    /* ── sidebar resize / visibility ── */

    const [rightWidth, setRightWidth] = useState(RIGHT_W_DEFAULT);

    // Sync @mention ingredients from initial nodes into the recipe ingredient list.
    useEffect(() => {
        if (!onAddIngredientToRecipe) return;
        const MENTION_RE = /@\[([^\]|]+)(?:\|[^\]]*)?\]\(([^)]+)\)/g;
        const recipeIds = new Set(availableIngredients.map((i) => i.id));
        const toAdd = new Map<string, string>(); // id -> name
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
            onAddIngredientToRecipe({ id, name, pluralName: null, categories: [], units: [] });
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

    // Ref so resize handler always reads the current width without stale closures
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
        [applyLayout, setNodes, setEdges, notifyChange, rfRef],
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
                // Selection changes etc -- just notify with latest store state
                queueMicrotask(() => {
                    notifyChange(
                        rfRef.current.getNodes() as RecipeFlowNode[],
                        rfRef.current.getEdges(),
                    );
                });
            }
        },
        [handleEdgesChange, applyLayout, setNodes, notifyChange, rfRef],
    );

    const handleNodesChangeWrapped: typeof onNodesChange = useCallback(
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
        [onNodesChange, notifyChange, rfRef],
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
            dispatchRecipeTutorialEvent(RECIPE_TUTORIAL_EVENTS.edgeConnected);
        },
        [autoLayoutAndFit, rfRef],
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

    /* ── node CRUD (delegated to useFlowNodeCrud) ── */

    const {
        handleAddNodeAfter,
        handleForkNodeAfter,
        handleAddNodeBefore,
        handleDeleteNode,
        handleSelectNode,
        handleUpdateNode,
        handleCloseEditPanel,
        handleInsertOnEdge,
    } = useFlowNodeCrud({
        rfRef,
        setNodes,
        setSelectedNodeId,
        autoLayoutAndFit,
        notifyChange,
        canvasRef,
    });

    /* ── auto-layout ── */

    const handleAutoLayout = useCallback(() => {
        const currentNodes = rfRef.current.getNodes() as RecipeFlowNode[];
        const currentEdges = rfRef.current.getEdges();
        const laid = applyLayout(currentNodes, currentEdges);
        setNodes(laid);
        notifyChange(laid, currentEdges);
        requestAnimationFrame(() => rfRef.current.fitView(FIT_VIEW_ANIMATE));
    }, [applyLayout, setNodes, notifyChange, rfRef]);

    /* ── auto fitView on container resize (window resize / sidebar toggle) ── */

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
        // rfRef, canvasRef, and selectedNodeIdRef are stable refs — intentionally excluded from deps
    }, [canvasRef, rfRef]);

    return {
        /* state */
        selectedNodeId,
        selectedNode,
        aiDialogOpen,
        setAiDialogOpen,
        rightWidth,
        validation,
        validationIssuesByNode,
        nodeOutgoingEdges,
        nodeIncomingEdges,

        /* callbacks */
        handleNodesChange: handleNodesChangeWrapped,
        onEdgesChange,
        onConnect,
        isValidConnection,
        handleSelectNode,
        handleDeleteNode,
        handleUpdateNode,
        handleCloseEditPanel,
        handleAddNodeAfter,
        handleForkNodeAfter,
        handleAddNodeBefore,
        handleInsertOnEdge,
        handleAutoLayout,
        autoLayoutAndFit,
        startRightResize,
    };
}
