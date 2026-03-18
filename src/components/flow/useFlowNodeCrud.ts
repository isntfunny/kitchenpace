'use client';

import type { Edge } from '@xyflow/react';
import { useCallback, type MutableRefObject } from 'react';

import type { RecipeFlowNode, RecipeNodeData, StepType } from './editor/editorTypes';
import { getStepConfig } from './editor/stepConfig';
import { DEFAULT_EDGE_STYLE, generateId, nodeFitPadding } from './flowEditorConstants';
import type { RfRef } from './useFlowCallbacks';

/* ── types ───────────────────────────────────────────────── */

export interface UseFlowNodeCrudArgs {
    rfRef: MutableRefObject<RfRef>;
    setNodes: (updater: RecipeFlowNode[] | ((nds: RecipeFlowNode[]) => RecipeFlowNode[])) => void;
    setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    autoLayoutAndFit: (nextNodes: RecipeFlowNode[], nextEdges: Edge[]) => void;
    notifyChange: (nextNodes: RecipeFlowNode[], nextEdges: Edge[]) => void;
    canvasRef: MutableRefObject<HTMLDivElement | null>;
}

export interface UseFlowNodeCrudReturn {
    handleAddNodeAfter: (parentNodeId: string, stepType: StepType) => void;
    handleForkNodeAfter: (parentNodeId: string, stepType: StepType) => void;
    handleAddNodeBefore: (childNodeId: string, stepType: StepType) => void;
    handleDeleteNode: (nodeId: string) => void;
    handleSelectNode: (nodeId: string) => void;
    handleUpdateNode: (nodeId: string, updates: Partial<RecipeNodeData>) => void;
    handleCloseEditPanel: () => void;
    handleInsertOnEdge: (
        edgeId: string,
        sourceId: string,
        targetId: string,
        stepType: StepType,
    ) => void;
}

/* ── hook ────────────────────────────────────────────────── */

export function useFlowNodeCrud({
    rfRef,
    setNodes,
    setSelectedNodeId,
    autoLayoutAndFit,
    notifyChange,
    canvasRef,
}: UseFlowNodeCrudArgs): UseFlowNodeCrudReturn {
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

            // Wire: parent -> new, and if parent was connected to servieren, new -> servieren
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
        [autoLayoutAndFit, rfRef],
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
        [autoLayoutAndFit, rfRef],
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

            // Rewire: find edge going into childNodeId, replace target with newId, add newId->childId
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
        [autoLayoutAndFit, rfRef],
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
        [autoLayoutAndFit, rfRef, setSelectedNodeId],
    );

    const handleSelectNode = useCallback(
        (nodeId: string) => {
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
        },
        [rfRef, canvasRef, setSelectedNodeId],
    );

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
        [setNodes, notifyChange, rfRef],
    );

    const handleCloseEditPanel = useCallback(() => {
        setSelectedNodeId(null);
    }, [setSelectedNodeId]);

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
        [autoLayoutAndFit, rfRef],
    );

    return {
        handleAddNodeAfter,
        handleForkNodeAfter,
        handleAddNodeBefore,
        handleDeleteNode,
        handleSelectNode,
        handleUpdateNode,
        handleCloseEditPanel,
        handleInsertOnEdge,
    };
}
