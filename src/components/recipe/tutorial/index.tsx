'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AUTO_ADVANCE_MS, TutorialOverlay } from './components/TutorialOverlay';
import { RECIPE_TUTORIAL_EVENTS } from './shared';
import { recipeTutorialSteps } from './steps';
import type { RecipeCreationTutorialProps, RecipeTutorialRuntimeFlags } from './types';

function isStepComplete(
    stepId: string,
    steps: typeof recipeTutorialSteps,
    state: RecipeCreationTutorialProps['state'],
    runtime: RecipeTutorialRuntimeFlags,
) {
    const step = steps.find((item) => item.id === stepId);
    if (!step) return false;

    if (step.kind === 'info') return true;

    if (step.kind === 'title-match') {
        return state.titleValue.trim().toLowerCase() === step.expectedValue?.trim().toLowerCase();
    }

    if (step.kind === 'state') {
        switch (step.stateKey) {
            case 'categorySelected':
                return state.categoryCount > 0;
            case 'ingredientAdded':
                return state.ingredientCount > 0;
            case 'ingredientAmountFilled':
                return state.hasIngredientAmount;
            case 'flowNodeCreated':
                return state.flow.nodeCount > 2;
            case 'flowBranchCreated':
                return state.flow.hasBranch;
            default:
                return false;
        }
    }

    if (step.kind === 'event') {
        switch (step.eventKey) {
            case 'servingsCustomOpened':
                return runtime.servingsCustomOpened;
            case 'ingredientCommentClicked':
                return runtime.ingredientCommentClicked;
            case 'flowAddButtonClicked':
                return runtime.flowAddButtonClicked;
            case 'nodeSelected':
                return runtime.nodeSelected;
            case 'branchButtonClicked':
                return runtime.branchButtonClicked;
            case 'edgeConnected':
                return runtime.edgeConnected;
            case 'descriptionMentionInserted':
                return runtime.descriptionMentionInserted;
            default:
                return false;
        }
    }

    return false;
}

export function RecipeCreationTutorial({
    state,
    onFocusTitleField,
    onComplete,
}: RecipeCreationTutorialProps) {
    const activeSteps = useMemo(
        () =>
            state.isDesktop
                ? recipeTutorialSteps
                : recipeTutorialSteps.filter((step) => !step.id.startsWith('flow-')),
        [state.isDesktop],
    );
    const [stepIndex, setStepIndex] = useState(0);
    const [runtime, setRuntime] = useState<RecipeTutorialRuntimeFlags>({
        servingsCustomOpened: false,
        ingredientCommentClicked: false,
        flowAddButtonClicked: false,
        nodeSelected: false,
        branchButtonClicked: false,
        edgeConnected: false,
        descriptionMentionInserted: false,
    });

    const step = activeSteps[stepIndex];
    const canContinue = useMemo(
        () => (step ? isStepComplete(step.id, activeSteps, state, runtime) : false),
        [activeSteps, runtime, state, step],
    );

    // Auto-advance after the user fulfils a non-info step
    const autoAdvancing = canContinue && step.kind !== 'info';

    useEffect(() => {
        if (!autoAdvancing) return;
        const timer = setTimeout(() => {
            const isLast = stepIndex === activeSteps.length - 1;
            if (isLast) {
                void onComplete();
            } else {
                setStepIndex((c) => c + 1);
            }
        }, AUTO_ADVANCE_MS);
        return () => clearTimeout(timer);
    }, [autoAdvancing, stepIndex, activeSteps.length, onComplete]);

    useEffect(() => {
        if (step.autoFocusAction === 'title') {
            onFocusTitleField();
        }
    }, [onFocusTitleField, step.autoFocusAction, step.id]);

    useEffect(() => {
        const handlers: Array<() => void> = [];

        const register = (
            eventName: string,
            updater: (prev: RecipeTutorialRuntimeFlags) => RecipeTutorialRuntimeFlags,
        ) => {
            const handler = () => setRuntime(updater);
            window.addEventListener(eventName, handler);
            handlers.push(() => window.removeEventListener(eventName, handler));
        };

        register(RECIPE_TUTORIAL_EVENTS.servingsCustomOpened, (prev) => ({
            ...prev,
            servingsCustomOpened: true,
        }));
        register(RECIPE_TUTORIAL_EVENTS.ingredientCommentClicked, (prev) => ({
            ...prev,
            ingredientCommentClicked: true,
        }));
        register(RECIPE_TUTORIAL_EVENTS.flowAddButtonClicked, (prev) => ({
            ...prev,
            flowAddButtonClicked: true,
        }));
        register(RECIPE_TUTORIAL_EVENTS.nodeSelected, (prev) => ({
            ...prev,
            nodeSelected: true,
        }));
        register(RECIPE_TUTORIAL_EVENTS.branchButtonClicked, (prev) => ({
            ...prev,
            branchButtonClicked: true,
        }));
        register(RECIPE_TUTORIAL_EVENTS.edgeConnected, (prev) => ({
            ...prev,
            edgeConnected: true,
        }));
        register(RECIPE_TUTORIAL_EVENTS.descriptionMentionInserted, (prev) => ({
            ...prev,
            descriptionMentionInserted: true,
        }));

        return () => {
            handlers.forEach((cleanup) => cleanup());
        };
    }, []);

    const handleContinue = useCallback(async () => {
        if (!canContinue) return;
        const isLast = stepIndex === activeSteps.length - 1;
        if (isLast) {
            await onComplete();
            return;
        }
        setStepIndex((current) => current + 1);
    }, [activeSteps.length, canContinue, onComplete, stepIndex]);

    if (!step) return null;

    return (
        <TutorialOverlay
            step={step}
            canContinue={canContinue}
            onContinue={() => void handleContinue()}
            autoAdvancing={autoAdvancing}
        />
    );
}
