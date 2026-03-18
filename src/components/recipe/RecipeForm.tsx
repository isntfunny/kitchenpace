'use client';

import { useOpenPanel } from '@openpanel/nextjs';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import type { EditRecipeData } from '@app/app/actions/recipes';

import { css } from 'styled-system/css';
import { stack } from 'styled-system/patterns';

const FlowEditor = dynamic(
    () => import('@app/components/flow/FlowEditor').then((m) => m.FlowEditor),
    { ssr: false },
);

const RecipeCreationTutorial = dynamic(
    () => import('./tutorial').then((m) => m.RecipeCreationTutorial),
    { ssr: false },
);

import { FlowEditorOverlay } from './FlowEditorOverlay';
import {
    GeneralInformationSection,
    TimeAndDifficultySection,
    CategorySelector,
    TagSelector,
    IngredientManager,
    SubmissionControls,
    ErrorBanner,
} from './RecipeForm/components';
import type { Category, Tag } from './RecipeForm/data';
import { RecipeFormSidebar } from './RecipeFormSidebar';
import { createRecipe, updateRecipe } from './recipeMutations';
import { completeRecipeCreationTutorial } from './tutorial/actions';
import {
    dispatchRecipeTutorialEvent,
    RECIPE_CREATION_TUTORIAL_CELEBRATION_KEY,
    RECIPE_CREATION_TUTORIAL_KEY,
    RECIPE_TUTORIAL_EVENTS,
} from './tutorial/shared';
import type { TagFacet } from './types';
import { useRecipeAutoSave } from './useRecipeAutoSave';
import { useRecipeFormState } from './useRecipeFormState';

const formStackClass = stack({ gap: '6' });

interface RecipeFormProps {
    categories: Category[];
    tags: Tag[];
    tagFacets?: TagFacet[];
    authorId: string;
    initialData?: EditRecipeData;
    layout?: 'stack' | 'sidebar';
    initialShouldShowTutorial?: boolean;
    isAdmin?: boolean;
}

export function RecipeForm({
    categories,
    tags,
    tagFacets,
    authorId,
    initialData,
    layout = 'stack',
    initialShouldShowTutorial = false,
    isAdmin = false,
}: RecipeFormProps) {
    const op = useOpenPanel();
    const state = useRecipeFormState({ categories, tags, tagFacets, initialData });

    // -- tutorial guard -- ref so the auto-save effect can read it without re-firing --
    const tutorialActiveRef = useRef(!state.isEditMode && initialShouldShowTutorial);

    const autoSave = useRecipeAutoSave({
        title: state.title,
        description: state.description,
        imageKey: state.imageKey,
        servings: state.servings,
        prepTime: state.prepTime,
        cookTime: state.cookTime,
        difficulty: state.difficulty,
        categoryIds: state.categoryIds,
        selectedTags: state.selectedTags,
        ingredients: state.ingredients,
        flowNodesRef: state.flowNodesRef,
        flowEdgesRef: state.flowEdgesRef,
        authorId,
        isAdmin,
        isPublished: state.saveStatus === 'PUBLISHED',
        tutorialActiveRef,
        initialId: initialData?.id ?? null,
        setImageKey: state.setImageKey,
    });

    const { autoSavedIdRef, savedRecipeId, autoSaveStatus, autoSaveLabel, buildPayload } = autoSave;

    // Block Enter key from submitting form during tutorial
    const handleFormKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (
            e.key === 'Enter' &&
            tutorialActiveRef.current &&
            (e.target as HTMLElement).tagName !== 'TEXTAREA'
        ) {
            e.preventDefault();
        }
    }, []);

    // -- submit --
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        state.setSaving(true);
        state.setError(null);

        try {
            if (!state.title.trim()) {
                state.setError('Bitte gib einen Titel ein.');
                return;
            }
            if (state.categoryIds.length === 0) {
                state.setError('Bitte wähle mindestens eine Kategorie aus.');
                return;
            }
            if (state.ingredients.length === 0) {
                state.setError('Bitte füge mindestens eine Zutat hinzu.');
                return;
            }

            if (
                state.saveStatus === 'PUBLISHED' &&
                state.flowNodesRef.current.length === 0 &&
                state.flowEdgesRef.current.length === 0
            ) {
                state.setError(
                    'Bitte erstelle zuerst einen Rezept-Flow mit mindestens einem Schritt, bevor du veröffentlichst.',
                );
                return;
            }

            if (state.saveStatus === 'PUBLISHED') {
                const { validateFlow, formatValidationErrors } =
                    await import('@app/lib/validation/flowValidation');
                const validation = validateFlow(
                    state.flowNodesRef.current,
                    state.flowEdgesRef.current,
                    { scope: 'publish' },
                );
                if (!validation.isValid) {
                    state.setError(formatValidationErrors(validation));
                    return;
                }
            }

            const payload = buildPayload(state.saveStatus);

            if (state.saveStatus === 'PUBLISHED') {
                op.track('recipe_published', {
                    is_edit: state.isEditMode,
                    has_image: Boolean(state.imageKey),
                    has_flow: state.flowNodesRef.current.length > 0,
                    step_count: state.flowNodesRef.current.length,
                    ingredient_count: state.ingredients.length,
                });
            }

            if (state.isEditMode || autoSavedIdRef.current) {
                const recipeId = (state.isEditMode ? initialData!.id : autoSavedIdRef.current)!;
                const recipe = await updateRecipe(recipeId, payload, authorId, isAdmin);
                window.location.href = `/recipe/${recipe.slug}`;
            } else {
                const recipe = await createRecipe(payload, authorId);
                window.location.href = `/recipe/${recipe.slug}`;
            }
        } catch (err) {
            console.error('Error saving recipe:', err);
            state.setError(
                err instanceof Error ? err.message : 'Fehler beim Speichern des Rezepts.',
            );
        } finally {
            state.setSaving(false);
        }
    };

    /* -- only load FlowEditor JS on desktop (mobile never shows it) -- */
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        setIsDesktop(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const flowEditorDisabled = !state.titleDone || !state.kategorieDone;

    const flowEditor = !isDesktop ? null : (
        <div className={css({ position: 'relative', width: '100%', height: '100%' })}>
            <FlowEditor
                availableIngredients={state.ingredients}
                initialNodes={state.initialNodes}
                initialEdges={state.initialEdges}
                onChange={state.handleFlowChange}
                onAddIngredientToRecipe={state.handleAddIngredient}
                onAiApply={state.handleAiApply}
                recipeId={savedRecipeId}
            />
            {flowEditorDisabled && <FlowEditorOverlay titleDone={state.titleDone} />}
        </div>
    );

    /* -- sidebar layout -- */
    const sidebarLayoutForm = (
        <RecipeFormSidebar
            title={state.title}
            onTitleChange={state.setTitle}
            description={state.description}
            onDescriptionChange={state.setDescription}
            imageKey={state.imageKey}
            onImageKeyChange={state.setImageKey}
            servings={state.servings}
            onServingsChange={state.setServings}
            prepTime={state.prepTime}
            onPrepTimeChange={state.setPrepTime}
            cookTime={state.cookTime}
            onCookTimeChange={state.setCookTime}
            difficulty={state.difficulty}
            onDifficultyChange={state.setDifficulty}
            categories={categories}
            categoryIds={state.categoryIds}
            onCategoryToggle={state.handleCategoryToggle}
            sortedTags={state.sortedTags}
            selectedTags={state.selectedTags}
            tagQuery={state.tagQuery}
            onTagQueryChange={state.setTagQuery}
            onTagSelectionChange={state.setSelectedTags}
            onCreateTag={state.findOrCreateTag}
            ingredients={state.ingredients}
            onAddIngredient={state.handleAddIngredient}
            onAddNewIngredient={state.handleAddNewIngredient}
            onUpdateIngredient={state.updateIngredient}
            onRemoveIngredient={state.handleRemoveIngredient}
            onReorderIngredients={state.handleReorderIngredients}
            onReplaceIngredient={state.handleReplaceIngredient}
            savedRecipeId={savedRecipeId}
            titleInputRef={state.titleInputRef}
            kategorieDone={state.kategorieDone}
            mandatoryMet={state.mandatoryMet}
            progressPct={state.progressPct}
            autoSaveLabel={autoSaveLabel}
            autoSaveStatus={autoSaveStatus}
            saving={state.saving}
            saveStatus={state.saveStatus}
            onStatusChange={(next) => state.setSaveStatus(next)}
            error={state.error}
            sidebarCollapsed={state.sidebarCollapsed}
            onSidebarCollapse={state.setSidebarCollapsed}
            onSubmit={handleSubmit}
            onKeyDown={handleFormKeyDown}
            flowEditor={flowEditor}
        />
    );

    /* -- stack layout (default) -- */
    const stackLayoutForm = (
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
            <div className={formStackClass}>
                <GeneralInformationSection
                    title={state.title}
                    onTitleChange={state.setTitle}
                    description={state.description}
                    onDescriptionChange={state.setDescription}
                    imageKey={state.imageKey}
                    onImageKeyChange={state.setImageKey}
                    showAutoSaveHint={true}
                    recipeId={savedRecipeId}
                    titleInputRef={state.titleInputRef}
                />
                <TimeAndDifficultySection
                    prepTime={state.prepTime}
                    onPrepTimeChange={state.setPrepTime}
                    cookTime={state.cookTime}
                    onCookTimeChange={state.setCookTime}
                    difficulty={state.difficulty}
                    onDifficultyChange={state.setDifficulty}
                />
                <CategorySelector
                    categories={categories}
                    selectedIds={state.categoryIds}
                    onToggle={state.handleCategoryToggle}
                />
                <div data-tutorial="tags">
                    <TagSelector
                        sortedTags={state.sortedTags}
                        selectedTags={state.selectedTags}
                        tagQuery={state.tagQuery}
                        onTagQueryChange={state.setTagQuery}
                        onSelectionChange={state.setSelectedTags}
                        onCreateTag={state.findOrCreateTag}
                    />
                </div>
                <IngredientManager
                    servings={state.servings}
                    onServingsChange={state.setServings}
                    ingredients={state.ingredients}
                    onAddIngredient={state.handleAddIngredient}
                    onAddNewIngredient={state.handleAddNewIngredient}
                    onUpdateIngredient={state.updateIngredient}
                    onRemoveIngredient={state.handleRemoveIngredient}
                    onServingsCustomTriggerClick={() =>
                        dispatchRecipeTutorialEvent(RECIPE_TUTORIAL_EVENTS.servingsCustomOpened)
                    }
                    onIngredientAmountFocus={() =>
                        dispatchRecipeTutorialEvent(RECIPE_TUTORIAL_EVENTS.ingredientAmountFocused)
                    }
                    onIngredientCommentClick={() =>
                        dispatchRecipeTutorialEvent(RECIPE_TUTORIAL_EVENTS.ingredientCommentClicked)
                    }
                />
                <div>
                    <h2
                        className={css({
                            fontSize: 'lg',
                            fontWeight: '600',
                            mb: '1',
                            color: 'text',
                        })}
                    >
                        Zubereitungsschritte
                    </h2>
                    <p className={css({ fontSize: 'sm', color: 'text.muted', mb: '4' })}>
                        Baue deinen Kochablauf Schritt für Schritt auf.
                    </p>
                    {flowEditor}
                </div>
                {state.error && <ErrorBanner message={state.error} />}
                <SubmissionControls
                    saving={state.saving}
                    saveStatus={state.saveStatus}
                    onStatusChange={(next) => state.setSaveStatus(next)}
                />
            </div>
        </form>
    );

    const layoutForm = layout === 'sidebar' ? sidebarLayoutForm : stackLayoutForm;
    const tutorialEligible = !state.isEditMode;

    const [showTutorial, setShowTutorial] = useState(initialShouldShowTutorial);

    useEffect(() => {
        if (!tutorialEligible) {
            setShowTutorial(false);
            return;
        }
        setShowTutorial(initialShouldShowTutorial);
    }, [initialShouldShowTutorial, tutorialEligible]);

    const handleTutorialComplete = useCallback(async () => {
        try {
            await completeRecipeCreationTutorial();
            window.localStorage.setItem(RECIPE_CREATION_TUTORIAL_KEY, 'done');
        } catch {
            // ignore localStorage failures and still hide tutorial
        }

        setShowTutorial(false);
        tutorialActiveRef.current = false;

        try {
            window.sessionStorage.setItem(
                RECIPE_CREATION_TUTORIAL_CELEBRATION_KEY,
                'finished-tutorial',
            );
        } catch {
            // ignore sessionStorage failures
        }

        // Redirect to the showcase recipe instead of creating a junk draft
        window.location.href = '/recipe/flammkuchen';
    }, []);

    return (
        <>
            {layoutForm}
            {tutorialEligible && showTutorial ? (
                <RecipeCreationTutorial
                    state={{
                        titleValue: state.title,
                        categoryCount: state.categoryIds.length,
                        ingredientCount: state.ingredients.length,
                        hasIngredientAmount: state.ingredients.some((i) => i.amount.trim() !== ''),
                        autoSaveLabel,
                        savedRecipeId,
                        isDesktop,
                        flow: state.tutorialFlowState,
                    }}
                    onFocusTitleField={state.focusTitleField}
                    onComplete={handleTutorialComplete}
                />
            ) : null}
        </>
    );
}
