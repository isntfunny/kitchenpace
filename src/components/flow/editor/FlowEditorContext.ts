'use client';

import { createContext, useContext } from 'react';

import type {
    AddedIngredient,
    IngredientSearchResult,
} from '@app/components/recipe/RecipeForm/data';

import type { StepType } from './editorTypes';

export interface FlowEditorContextValue {
    availableIngredients: AddedIngredient[];
    onSelectNode: (nodeId: string) => void;
    onDeleteNode: (nodeId: string) => void;
    nodeOutgoingEdges: Map<string, number>;
    nodeIncomingEdges: Map<string, number>;
    onAddNodeAfter: (parentNodeId: string, stepType: StepType) => void;
    onAddNodeBefore?: (childNodeId: string, stepType: StepType) => void;
    /** Fork: add a new node on a brand-new edge without rewiring existing edges */
    onForkNodeAfter?: (parentNodeId: string, stepType: StepType) => void;
    /** Add a DB ingredient to the recipe (called when user @-mentions it in a step) */
    onAddIngredientToRecipe?: (ing: IngredientSearchResult) => void;
    /** Insert a new node onto an existing edge, splitting it into two edges */
    onInsertOnEdge?: (edgeId: string, source: string, target: string, stepType: StepType) => void;
    /** Recipe ID — passed from RecipeForm, used by QRUploadButton in NodeEditPanel */
    recipeId?: string;
}

export const FlowEditorContext = createContext<FlowEditorContextValue | null>(null);

export function useFlowEditor(): FlowEditorContextValue {
    const ctx = useContext(FlowEditorContext);
    if (!ctx) {
        throw new Error('useFlowEditor must be used within a FlowEditorContext.Provider');
    }
    return ctx;
}
