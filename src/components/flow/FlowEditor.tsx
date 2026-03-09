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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';

import type { AddedIngredient } from '@app/components/recipe/RecipeForm/data';
import type { AIAnalysisResult, ApplySelection } from '@app/lib/importer/ai-text-analysis';
import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';

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
import { NodePalette } from './editor/NodePalette';
import { RecipeNode } from './editor/RecipeNode';
import { getStepConfig } from './editor/stepConfig';
import { useFlowAutoLayout } from './editor/useFlowAutoLayout';

/* ── constants ───────────────────────────────────────────── */

const NODE_WIDTH = 220;
const HORIZONTAL_GAP = 80;

const DEFAULT_EDGE_STYLE: React.CSSProperties = { stroke: PALETTE.orange, strokeWidth: 2 };

/** Stable nodeTypes / edgeTypes — defined once at module level, never recreated. */
const NODE_TYPES = { recipeStep: RecipeNode };
const EDGE_TYPES = { insertable: InsertEdge };

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
        photoUrl: n.data.photoUrl,
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
            photoUrl: n.photoUrl,
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
}

/* ── inner component (needs ReactFlowProvider above it) ── */

function FlowEditorInner({
    availableIngredients = [],
    initialNodes,
    initialEdges,
    onChange,
    onAddIngredientToRecipe,
    onAiApply,
}: FlowEditorProps) {
    const { screenToFlowPosition, getNodes, getEdges, fitView } = useReactFlow();
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
            requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
        },
        [applyLayout, setNodes, setEdges, notifyChange, fitView],
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
            autoLayoutAndFit(getNodes() as RecipeFlowNode[], getEdges());
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
                    const currentNodes = getNodes() as RecipeFlowNode[];
                    const currentEdges = getEdges();
                    const laid = applyLayout(currentNodes, currentEdges);
                    setNodes(laid);
                    notifyChange(laid, currentEdges);
                    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
                });
            } else {
                // Selection changes etc — just pass through
                queueMicrotask(() => {
                    setNodes((nds) => {
                        setEdges((eds) => {
                            notifyChange(nds as RecipeFlowNode[], eds);
                            return eds;
                        });
                        return nds;
                    });
                });
            }
        },
        [
            handleEdgesChange,
            getNodes,
            getEdges,
            applyLayout,
            setNodes,
            setEdges,
            notifyChange,
            fitView,
        ],
    );

    const handleNodesChange: typeof onNodesChange = useCallback(
        (changes) => {
            onNodesChange(changes);
            // Position changes are high-frequency — notify after the state update
            // We use a microtask to read the latest state after React processes the change
            queueMicrotask(() => {
                setNodes((currentNodes) => {
                    setEdges((currentEdges) => {
                        notifyChange(currentNodes as RecipeFlowNode[], currentEdges);
                        return currentEdges;
                    });
                    return currentNodes;
                });
            });
        },
        [onNodesChange, setNodes, setEdges, notifyChange],
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            const currentNodes = getNodes() as RecipeFlowNode[];
            const currentEdges = getEdges();
            const nextEdges = addEdge(
                { ...connection, type: 'insertable', style: DEFAULT_EDGE_STYLE },
                currentEdges,
            );
            autoLayoutAndFit(currentNodes, nextEdges);
        },
        [getNodes, getEdges, autoLayoutAndFit],
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

    const addNewNode = useCallback(
        (stepType: StepType, position?: { x: number; y: number }) => {
            const config = getStepConfig(stepType);
            const newId = generateId();
            const currentNodes = getNodes() as RecipeFlowNode[];
            const currentEdges = getEdges();

            const newNode: RecipeFlowNode = {
                id: newId,
                type: 'recipeStep',
                position: position ?? { x: 0, y: 0 },
                data: { stepType, label: `Neuer ${config.label}-Schritt`, description: '' },
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
        [getNodes, getEdges, autoLayoutAndFit],
    );

    const handleAddNodeAfter = useCallback(
        (parentNodeId: string, stepType: StepType) => {
            const config = getStepConfig(stepType);
            const newId = generateId();
            const currentNodes = getNodes() as RecipeFlowNode[];
            const currentEdges = getEdges();

            const newNode: RecipeFlowNode = {
                id: newId,
                type: 'recipeStep',
                position: { x: 0, y: 0 },
                data: { stepType, label: `Neuer ${config.label}-Schritt`, description: '' },
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
        [getNodes, getEdges, autoLayoutAndFit],
    );

    const handleAddNodeBefore = useCallback(
        (childNodeId: string, stepType: StepType) => {
            const config = getStepConfig(stepType);
            const newId = generateId();
            const currentNodes = getNodes() as RecipeFlowNode[];
            const currentEdges = getEdges();

            const newNode: RecipeFlowNode = {
                id: newId,
                type: 'recipeStep',
                position: { x: 0, y: 0 },
                data: { stepType, label: `Neuer ${config.label}-Schritt`, description: '' },
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
        [getNodes, getEdges, autoLayoutAndFit],
    );

    const handleDeleteNode = useCallback(
        (nodeId: string) => {
            if (nodeId === 'start' || nodeId === 'servieren') return;
            setSelectedNodeId((prev) => (prev === nodeId ? null : prev));

            const currentNodes = getNodes() as RecipeFlowNode[];
            const currentEdges = getEdges();

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
        [getNodes, getEdges, autoLayoutAndFit],
    );

    const handleSelectNode = useCallback((nodeId: string) => {
        setSelectedNodeId(nodeId);
    }, []);

    const handleUpdateNode = useCallback(
        (nodeId: string, updates: Partial<RecipeNodeData>) => {
            setNodes((nds) => {
                const next = nds.map((n) =>
                    n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n,
                );
                setEdges((eds) => {
                    notifyChange(next as RecipeFlowNode[], eds);
                    return eds;
                });
                return next;
            });
        },
        [setNodes, setEdges, notifyChange],
    );

    const handleCloseEditPanel = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    /* ── insert node onto edge ── */

    const handleInsertOnEdge = useCallback(
        (edgeId: string, sourceId: string, targetId: string, stepType: StepType) => {
            const config = getStepConfig(stepType);
            const newId = generateId();
            const currentNodes = getNodes() as RecipeFlowNode[];
            const currentEdges = getEdges();

            const newNode: RecipeFlowNode = {
                id: newId,
                type: 'recipeStep',
                position: { x: 0, y: 0 },
                data: { stepType, label: `Neuer ${config.label}-Schritt`, description: '' },
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
        [getNodes, getEdges, autoLayoutAndFit],
    );

    /* ── drag & drop from palette ── */

    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const stepType = event.dataTransfer.getData('application/step-type') as StepType;
            if (!stepType) return;
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            addNewNode(stepType, position);
        },
        [screenToFlowPosition, addNewNode],
    );

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    /* ── auto-layout ── */

    const handleAutoLayout = useCallback(() => {
        const currentNodes = getNodes() as RecipeFlowNode[];
        const currentEdges = getEdges();
        const laid = applyLayout(currentNodes, currentEdges);
        setNodes(laid);
        notifyChange(laid, currentEdges);
        requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
    }, [getNodes, getEdges, applyLayout, setNodes, notifyChange, fitView]);

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
            onAddIngredientToRecipe,
            onInsertOnEdge: handleInsertOnEdge,
        }),
        [
            availableIngredients,
            handleSelectNode,
            handleDeleteNode,
            nodeOutgoingEdges,
            nodeIncomingEdges,
            handleAddNodeAfter,
            handleAddNodeBefore,
            onAddIngredientToRecipe,
            handleInsertOnEdge,
        ],
    );

    return (
        <FlowEditorContext.Provider value={contextValue}>
            <div className={editorContainerClass}>
                <div className={paletteContainerClass}>
                    <NodePalette onAddNode={addNewNode} />
                </div>
                <div
                    className={canvasContainerClass}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
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
                        fitViewOptions={{ padding: 0.2 }}
                        minZoom={0.1}
                        maxZoom={2}
                        deleteKeyCode={['Backspace', 'Delete']}
                        edgesReconnectable
                        defaultEdgeOptions={{
                            type: 'insertable',
                            style: DEFAULT_EDGE_STYLE,
                        }}
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
                </div>
                {selectedNode && (
                    <NodeEditPanel
                        key={selectedNode.id}
                        nodeId={selectedNode.id}
                        data={selectedNode.data as RecipeNodeData}
                        availableIngredients={availableIngredients}
                        onSave={(updates) => {
                            handleUpdateNode(selectedNode.id, updates);
                            handleCloseEditPanel();
                        }}
                        onClose={handleCloseEditPanel}
                        onDelete={() => handleDeleteNode(selectedNode.id)}
                        canDelete={
                            selectedNode.data.stepType !== 'start' &&
                            selectedNode.data.stepType !== 'servieren'
                        }
                    />
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

const paletteContainerClass = css({
    flexShrink: '0',
});

const canvasContainerClass = css({
    flex: '1',
    border: '1px solid rgba(224,123,83,0.4)',
    borderRadius: 'xl',
    backgroundColor: 'surface',
    overflow: 'hidden',
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
        boxShadow: { base: '0 2px 12px rgba(147,51,234,0.25)', _dark: '0 2px 12px rgba(147,51,234,0.2)' },
    },
});

/* ── public export (wraps in ReactFlowProvider) ─────────── */

export function FlowEditor(props: FlowEditorProps) {
    return (
        <ReactFlowProvider>
            <FlowEditorInner {...props} />
        </ReactFlowProvider>
    );
}
