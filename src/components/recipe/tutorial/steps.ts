import type { OnboardingStep } from '@onboardjs/react';

import type { InputTutorialPayload, WelcomeTutorialPayload } from './types';

export const RECIPE_TUTORIAL_COMPONENT_KEYS = {
    welcome: 'recipe-welcome',
    inputChallenge: 'recipe-input-challenge',
} as const;

export const recipeTutorialSteps: OnboardingStep[] = [
    {
        id: 'recipe-create-welcome',
        type: 'CUSTOM_COMPONENT',
        nextStep: 'recipe-title-challenge',
        payload: {
            componentKey: RECIPE_TUTORIAL_COMPONENT_KEYS.welcome,
            title: 'Willkommen im Rezept-Ersteller',
            description:
                'Hier passiert die Magie. Einmal fuehren wir dich durch die wichtigsten ersten Schritte.',
            primaryLabel: 'Los gehts',
        } satisfies WelcomeTutorialPayload,
    },
    {
        id: 'recipe-title-challenge',
        type: 'CUSTOM_COMPONENT',
        payload: {
            componentKey: RECIPE_TUTORIAL_COMPONENT_KEYS.inputChallenge,
            targetId: 'title',
            title: 'Titel',
            description: 'Klicke in das Titelfeld und schreibe dort exakt Flammkuchen hinein.',
            expectedValue: 'Flammkuchen',
            primaryLabel: 'Tutorial abschliessen',
        } satisfies InputTutorialPayload,
    },
];
