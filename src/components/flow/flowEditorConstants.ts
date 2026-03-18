import type { Edge } from '@xyflow/react';

import { PALETTE } from '@app/lib/palette';

import type { FlowEdgeSerialized, FlowNodeSerialized, RecipeFlowNode } from './editor/editorTypes';
import { InsertEdge } from './editor/InsertEdge';
import { RecipeNode } from './editor/RecipeNode';

/* ── constants ───────────────────────────────────────────── */

export const NODE_WIDTH = 220;
export const HORIZONTAL_GAP = 80;

/* ── sidebar resize constants ────────────────────────────── */

export const LS_RIGHT_W = 'flow-right-width';
export const RIGHT_W_DEFAULT = 300;
export const RIGHT_W_MIN = 240;
export const RIGHT_W_MAX = 500;

export const DEFAULT_EDGE_STYLE: React.CSSProperties = { stroke: PALETTE.orange, strokeWidth: 2 };

/** Stable nodeTypes / edgeTypes / edgeOptions — defined once at module level, never recreated. */
export const NODE_TYPES = { recipeStep: RecipeNode };
export const EDGE_TYPES = { insertable: InsertEdge };
export const DEFAULT_EDGE_OPTIONS = { type: 'insertable', style: DEFAULT_EDGE_STYLE } as const;
export const FIT_VIEW_OPTIONS = { padding: 0.2 } as const;
export const FIT_VIEW_ANIMATE = { padding: 0.2, duration: 200 } as const;

/** Adaptive padding for single-node fitView: tighter on narrow canvases */
export function nodeFitPadding(canvasEl: HTMLElement | null): number {
    const w = canvasEl?.clientWidth ?? 1200;
    if (w < 600) return 1;
    if (w < 900) return 2;
    return 3;
}

export const DELETE_KEY_CODE = ['Backspace', 'Delete'];

/* ── helpers ─────────────────────────────────────────────── */

let nodeCounter = 0;
export function generateId(): string {
    return `node_${Date.now()}_${++nodeCounter}`;
}

export function createDefaultNodes(): RecipeFlowNode[] {
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

export function createDefaultEdges(): Edge[] {
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

export function serializeNodes(nodes: RecipeFlowNode[]): FlowNodeSerialized[] {
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

export function serializeEdges(edges: Edge[]): FlowEdgeSerialized[] {
    return edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
    }));
}

export function deserializeNodes(nodes: FlowNodeSerialized[]): RecipeFlowNode[] {
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

export function deserializeEdges(edges: FlowEdgeSerialized[]): Edge[] {
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
    availableIngredients?: import('@app/components/recipe/RecipeForm/data').AddedIngredient[];
    initialNodes?: FlowNodeSerialized[];
    initialEdges?: FlowEdgeSerialized[];
    onChange?: (nodes: FlowNodeSerialized[], edges: FlowEdgeSerialized[]) => void;
    onAddIngredientToRecipe?: (
        ing: import('@app/components/recipe/RecipeForm/data').IngredientSearchResult,
    ) => void;
    onAiApply?: (
        result: import('@app/lib/importer/ai-text-analysis').AIAnalysisResult,
        apply: import('@app/lib/importer/ai-text-analysis').ApplySelection,
    ) => void;
    recipeId?: string;
}
