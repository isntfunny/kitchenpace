import type { Node } from '@xyflow/react';

export type StepType =
    | 'start'
    | 'schneiden'
    | 'kochen'
    | 'braten'
    | 'backen'
    | 'mixen'
    | 'warten'
    | 'wuerzen'
    | 'anrichten'
    | 'servieren';

/** Data stored inside each xyflow node — accessed via node.data */
export interface RecipeNodeData extends Record<string, unknown> {
    stepType: StepType;
    label: string;
    description: string;
    duration?: number;
    ingredientIds?: string[];
    /** S3 key for the per-step photo, persisted to DB */
    photoKey?: string;
    /** Full CDN URL for displaying the photo — derived from photoKey at upload time */
    photoUrl?: string;
}

/** The xyflow node type for recipe steps */
export type RecipeFlowNode = Node<RecipeNodeData, 'recipeStep'>;

/** Serialized format written to DB / passed to the parent form on submit */
export interface FlowNodeSerialized {
    id: string;
    type: StepType;
    label: string;
    description: string;
    duration?: number;
    ingredientIds?: string[];
    photoKey?: string;
    photoUrl?: string;
    position?: { x: number; y: number };
}

export interface FlowEdgeSerialized {
    id: string;
    source: string;
    target: string;
}
