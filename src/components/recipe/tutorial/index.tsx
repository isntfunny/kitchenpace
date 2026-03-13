'use client';

import { OnboardingProvider } from '@onboardjs/react';
import type { StepComponentProps } from '@onboardjs/react';
import { useCallback, useMemo } from 'react';

import { TitleChallengeStep } from './components/TitleChallengeStep';
import { TutorialOverlay } from './components/TutorialOverlay';
import { WelcomeStep } from './components/WelcomeStep';
import { RECIPE_TUTORIAL_COMPONENT_KEYS, recipeTutorialSteps } from './steps';
import type { InputTutorialPayload, RecipeCreationTutorialProps } from './types';

export function RecipeCreationTutorial({
    targets,
    state,
    onFocusTitleField,
    onComplete,
}: RecipeCreationTutorialProps) {
    const InputChallengeComponent = useCallback(
        (props: StepComponentProps<InputTutorialPayload>) => (
            <TitleChallengeStep
                {...props}
                titleValue={state.titleValue}
                onFocusTitleField={onFocusTitleField}
            />
        ),
        [onFocusTitleField, state.titleValue],
    );

    const componentRegistry = useMemo(
        () => ({
            [RECIPE_TUTORIAL_COMPONENT_KEYS.welcome]: WelcomeStep,
            [RECIPE_TUTORIAL_COMPONENT_KEYS.inputChallenge]: InputChallengeComponent,
        }),
        [InputChallengeComponent],
    );

    return (
        <OnboardingProvider
            steps={recipeTutorialSteps}
            componentRegistry={componentRegistry}
            onFlowComplete={onComplete}
        >
            <TutorialOverlay targets={targets} />
        </OnboardingProvider>
    );
}
