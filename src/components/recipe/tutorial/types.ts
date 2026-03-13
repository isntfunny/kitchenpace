import type { RecipeTutorialTargetId } from './shared';

export interface RecipeTutorialFlowState {
    nodeCount: number;
    hasBranch: boolean;
}

export interface RecipeTutorialState {
    titleValue: string;
    categoryCount: number;
    ingredientCount: number;
    hasIngredientAmount: boolean;
    autoSaveLabel: string | null;
    savedRecipeId?: string;
    isDesktop: boolean;
    flow: RecipeTutorialFlowState;
}

export interface RecipeCreationTutorialProps {
    state: RecipeTutorialState;
    onFocusTitleField: () => void;
    onComplete: () => Promise<void> | void;
}

export type RecipeTutorialStepKind = 'info' | 'title-match' | 'state' | 'event';

export interface RecipeTutorialStep {
    id: string;
    kind: RecipeTutorialStepKind;
    title: string;
    description: string;
    primaryLabel: string;
    targetId?: RecipeTutorialTargetId;
    expectedValue?: string;
    stateKey?:
        | 'categorySelected'
        | 'ingredientAdded'
        | 'ingredientAmountFilled'
        | 'flowNodeCreated'
        | 'flowBranchCreated';
    eventKey?:
        | 'servingsCustomOpened'
        | 'ingredientCommentClicked'
        | 'flowAddButtonClicked'
        | 'descriptionMentionInserted';
    accentTargetId?: RecipeTutorialTargetId;
    allowTargetInteraction?: boolean;
    autoFocusAction?: 'title';
    accentLabel?: string;
}

export interface RecipeTutorialRuntimeFlags {
    servingsCustomOpened: boolean;
    ingredientCommentClicked: boolean;
    flowAddButtonClicked: boolean;
    descriptionMentionInserted: boolean;
}
