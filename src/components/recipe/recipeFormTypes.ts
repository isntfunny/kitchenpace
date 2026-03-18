import type { FlowEdgeSerialized } from '../flow/editor/editorTypes';

export interface RecipeIngredientInput {
    ingredientId: string;
    ingredientName?: string; // For syncing missing ingredients
    amount: string;
    unit: string;
    notes?: string;
    isOptional: boolean;
}

/** Alias for FlowNodeSerialized with a looser `type` (accepts any string, not just StepType). */
export type FlowNodeInput = Omit<
    import('../flow/editor/editorTypes').FlowNodeSerialized,
    'type'
> & {
    type: string;
};

export type FlowEdgeInput = FlowEdgeSerialized;

export interface UpdateRecipeInput {
    title: string;
    description?: string;
    imageKey?: string;
    servings: number;
    prepTime: number;
    cookTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    categoryIds: string[];
    tagIds?: string[];
    ingredients: RecipeIngredientInput[];
    flowNodes?: FlowNodeInput[];
    flowEdges?: FlowEdgeInput[];
    status?: 'DRAFT' | 'PUBLISHED';
}

export interface CreateRecipeInput {
    title: string;
    description: string;
    imageKey?: string;
    servings: number;
    prepTime: number;
    cookTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    categoryIds: string[];
    tagIds?: string[];
    ingredients: RecipeIngredientInput[];
    flowNodes?: FlowNodeInput[];
    flowEdges?: FlowEdgeInput[];
    status?: 'DRAFT' | 'PUBLISHED';
}

export type RecipeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
