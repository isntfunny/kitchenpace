import type { RefObject } from 'react';

export const RECIPE_CREATION_TUTORIAL_KEY = 'kitchenpace:recipe-create-tutorial';

export const RECIPE_TUTORIAL_TARGETS = {
    title: 'title',
} as const;

export type RecipeTutorialTargetId =
    (typeof RECIPE_TUTORIAL_TARGETS)[keyof typeof RECIPE_TUTORIAL_TARGETS];

export interface RecipeTutorialTargets {
    title: RefObject<HTMLInputElement | null>;
}

export interface RecipeTutorialState {
    titleValue: string;
}

export interface RecipeCreationTutorialProps {
    targets: RecipeTutorialTargets;
    state: RecipeTutorialState;
    onFocusTitleField: () => void;
    onComplete: () => void;
}

export interface BaseTutorialPayload {
    componentKey: string;
    title: string;
    description: string;
    primaryLabel: string;
    targetId?: RecipeTutorialTargetId;
}

export type WelcomeTutorialPayload = BaseTutorialPayload;

export interface InputTutorialPayload extends BaseTutorialPayload {
    expectedValue: string;
}
