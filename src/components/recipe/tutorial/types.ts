import type { RecipeTutorialTargetId } from './shared';

export interface RecipeTutorialFlowState {
    nodeCount: number;
    hasBranch: boolean;
}

export interface RecipeTutorialState {
    titleValue: string;
    categoryCount: number;
    ingredientCount: number;
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
        | 'autosaveVisible'
        | 'flowNodeCreated'
        | 'flowBranchCreated';
    eventKey?:
        | 'servingsCustomOpened'
        | 'ingredientAmountFocused'
        | 'ingredientCommentClicked'
        | 'flowAddButtonClicked';
    allowTargetInteraction?: boolean;
    autoFocusAction?: 'title';
    accentLabel?: string;
}

export interface RecipeTutorialRuntimeFlags {
    servingsCustomOpened: boolean;
    ingredientAmountFocused: boolean;
    ingredientCommentClicked: boolean;
    flowAddButtonClicked: boolean;
}
