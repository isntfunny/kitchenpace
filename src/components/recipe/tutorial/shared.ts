export const RECIPE_CREATION_TUTORIAL_KEY = 'kitchenpace:recipe-create-tutorial';
export const RECIPE_CREATION_TUTORIAL_CELEBRATION_KEY =
    'kitchenpace:recipe-create-tutorial:celebration';

export const RECIPE_TUTORIAL_TARGETS = {
    title: 'title',
    category: 'category',
    servingsBar: 'servings-bar',
    servingsCustomTrigger: 'servings-custom-trigger',
    ingredientSearch: 'ingredient-search',
    ingredientAmount: 'ingredient-amount',
    ingredientComment: 'ingredient-comment',
    ingredientOptional: 'ingredient-optional',
    draftSave: 'draft-save',
    autosaveBar: 'autosave-bar',
    flowCanvas: 'flow-canvas',
    flowStartNode: 'flow-start-node',
    flowEndNode: 'flow-end-node',
    flowAddButton: 'flow-add-button',
    flowPalette: 'flow-palette',
    flowBranchButton: 'flow-branch-button',
} as const;

export const RECIPE_TUTORIAL_EVENTS = {
    servingsCustomOpened: 'recipe-tutorial:servings-custom-opened',
    ingredientAmountFocused: 'recipe-tutorial:ingredient-amount-focused',
    ingredientCommentClicked: 'recipe-tutorial:ingredient-comment-clicked',
    flowAddButtonClicked: 'recipe-tutorial:flow-add-button-clicked',
} as const;

export type RecipeTutorialTargetId =
    (typeof RECIPE_TUTORIAL_TARGETS)[keyof typeof RECIPE_TUTORIAL_TARGETS];

export type RecipeTutorialEventName =
    (typeof RECIPE_TUTORIAL_EVENTS)[keyof typeof RECIPE_TUTORIAL_EVENTS];

export function dispatchRecipeTutorialEvent(name: RecipeTutorialEventName) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(name));
}
