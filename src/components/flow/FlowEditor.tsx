'use client';

import {
    Background,
    Controls,
    Panel,
    ReactFlow,
    ReactFlowProvider,
    type Edge,
    useEdgesState,
    useNodesState,
    useReactFlow,
} from '@xyflow/react';
import { useCallback, useMemo, useRef, type RefCallback } from 'react';
import '@xyflow/react/dist/style.css';

import { useFeatureFlag } from '@app/components/providers/FeatureFlagsProvider';
import type { AIAnalysisResult, ApplySelection } from '@app/lib/importer/ai-text-analysis';
import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

import { AiConversionDialog } from './editor/AiConversionDialog';
import type { RecipeFlowNode, RecipeNodeData, StepType } from './editor/editorTypes';
import { FlowEditorContext, type FlowEditorContextValue } from './editor/FlowEditorContext';
import { NodeEditPanel } from './editor/NodeEditPanel';
import {
    createDefaultEdges,
    createDefaultNodes,
    DEFAULT_EDGE_OPTIONS,
    DEFAULT_EDGE_STYLE,
    DELETE_KEY_CODE,
    deserializeEdges,
    deserializeNodes,
    EDGE_TYPES,
    FIT_VIEW_OPTIONS,
    NODE_TYPES,
} from './flowEditorConstants';
import type { FlowEditorProps } from './flowEditorConstants';
import { FlowToolbar } from './FlowToolbar';
import { FlowValidationPanel } from './FlowValidationPanel';
import type { RfRef } from './useFlowCallbacks';
import { useFlowCallbacks } from './useFlowCallbacks';

/* ── re-export props for consumers ───────────────────────── */

export type { FlowEditorProps } from './flowEditorConstants';

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
    // StoreUpdater.useEffect to fire -> zustand setState -> forceStoreRerender -> infinite loop.
    const rfRef = useRef<RfRef>({ screenToFlowPosition, getNodes, getEdges, fitView });
    rfRef.current = { screenToFlowPosition, getNodes, getEdges, fitView };

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

    const showAiButton = useFeatureFlag('aiRecipeConversion');

    const canvasRef = useRef<HTMLDivElement | null>(null);
    const canvasRefCallback: RefCallback<HTMLDivElement> = useCallback((el) => {
        canvasRef.current = el;
    }, []);

    const {
        /* state */
        selectedNode,
        aiDialogOpen,
        setAiDialogOpen,
        rightWidth,
        validation,
        validationIssuesByNode,
        nodeOutgoingEdges,
        nodeIncomingEdges,

        /* callbacks */
        handleNodesChange,
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
    } = useFlowCallbacks({
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
    });

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

    /* ── AI conversion result handler ── */

    const handleAiResult = useCallback(
        (result: AIAnalysisResult, apply: ApplySelection) => {
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
        },
        [autoLayoutAndFit, onAiApply, setAiDialogOpen],
    );

    return (
        <FlowEditorContext.Provider value={contextValue}>
            <div className={editorContainerClass}>
                <div
                    ref={canvasRefCallback}
                    className={canvasContainerClass}
                    data-tutorial="flow-canvas"
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
                            <FlowToolbar
                                showAiButton={showAiButton}
                                onAiClick={() => setAiDialogOpen(true)}
                                onAutoLayout={handleAutoLayout}
                            />
                        </Panel>
                    </ReactFlow>
                    <FlowValidationPanel validation={validation} onSelectNode={handleSelectNode} />
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
                onResult={handleAiResult}
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

/* ── public export (wraps in ReactFlowProvider) ─────────── */

export function FlowEditor(props: FlowEditorProps) {
    return (
        <ReactFlowProvider>
            <FlowEditorInner {...props} />
        </ReactFlowProvider>
    );
}
