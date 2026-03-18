'use client';

import { Monitor, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

import {
    GeneralInformationSection,
    TimeAndDifficultySection,
    CategorySelector,
    TagSelector,
    IngredientManager,
    SubmissionControls,
    ErrorBanner,
} from './RecipeForm/components';
import type { AddedIngredient, Category, IngredientSearchResult } from './RecipeForm/data';
import {
    autoSaveBarClass,
    canvasAreaClass,
    progressBarWrapperClass,
    progressFillClass,
    progressTrackClass,
    sectionHeadingClass,
    sidebarClass,
    sidebarCollapsedClass,
    sidebarDividerClass,
    sidebarFooterClass,
    sidebarFormClass,
    sidebarReopenClass,
    sidebarSectionClass,
    sidebarSectionsClass,
    sidebarStickyHeaderClass,
    sidebarToggleClass,
    spinnerClass,
} from './recipeFormStyles';
import { dispatchRecipeTutorialEvent, RECIPE_TUTORIAL_EVENTS } from './tutorial/shared';
import type { AutoSaveStatus } from './useRecipeAutoSave';
import type { TagWithCount } from './useRecipeFormState';

export interface RecipeFormSidebarProps {
    // Form state
    title: string;
    onTitleChange: (value: string) => void;
    description: string;
    onDescriptionChange: (value: string) => void;
    imageKey: string;
    onImageKeyChange: (value: string) => void;
    servings: number;
    onServingsChange: (value: number) => void;
    prepTime: number;
    onPrepTimeChange: (value: number) => void;
    cookTime: number;
    onCookTimeChange: (value: number) => void;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    onDifficultyChange: (value: 'EASY' | 'MEDIUM' | 'HARD') => void;
    categories: Category[];
    categoryIds: string[];
    onCategoryToggle: (id: string, selected: boolean) => void;
    sortedTags: TagWithCount[];
    selectedTags: string[];
    tagQuery: string;
    onTagQueryChange: (value: string) => void;
    onTagSelectionChange: (value: string[]) => void;
    onCreateTag: typeof import('../recipe/createActions').findOrCreateTag;
    ingredients: AddedIngredient[];
    onAddIngredient: (ing: IngredientSearchResult) => void;
    onAddNewIngredient: (name: string) => Promise<void>;
    onUpdateIngredient: (index: number, changes: Partial<AddedIngredient>) => void;
    onRemoveIngredient: (index: number) => void;
    onReorderIngredients: (newOrder: AddedIngredient[]) => void;
    onReplaceIngredient: (index: number, replacement: IngredientSearchResult) => void;
    savedRecipeId: string | undefined;
    titleInputRef: React.RefObject<HTMLInputElement | null>;

    // Progress
    kategorieDone: boolean;
    mandatoryMet: boolean;
    progressPct: number;

    // Auto-save
    autoSaveLabel: string | null;
    autoSaveStatus: AutoSaveStatus;

    // Save/submit
    saving: boolean;
    saveStatus: 'DRAFT' | 'PUBLISHED';
    onStatusChange: (next: 'DRAFT' | 'PUBLISHED') => void;
    error: string | null;

    // Sidebar collapse
    sidebarCollapsed: boolean;
    onSidebarCollapse: (collapsed: boolean) => void;

    // Submit + key handler
    onSubmit: (e: FormEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;

    // Flow editor (rendered slot)
    flowEditor: ReactNode;
}

export function RecipeFormSidebar(props: RecipeFormSidebarProps) {
    const {
        title,
        onTitleChange,
        description,
        onDescriptionChange,
        imageKey,
        onImageKeyChange,
        servings,
        onServingsChange,
        prepTime,
        onPrepTimeChange,
        cookTime,
        onCookTimeChange,
        difficulty,
        onDifficultyChange,
        categories,
        categoryIds,
        onCategoryToggle,
        sortedTags,
        selectedTags,
        tagQuery,
        onTagQueryChange,
        onTagSelectionChange,
        onCreateTag,
        ingredients,
        onAddIngredient,
        onAddNewIngredient,
        onUpdateIngredient,
        onRemoveIngredient,
        onReorderIngredients,
        onReplaceIngredient,
        savedRecipeId,
        titleInputRef,
        kategorieDone,
        mandatoryMet,
        progressPct,
        autoSaveLabel,
        autoSaveStatus,
        saving,
        saveStatus,
        onStatusChange,
        error,
        sidebarCollapsed,
        onSidebarCollapse,
        onSubmit,
        onKeyDown,
        flowEditor,
    } = props;

    return (
        <form onSubmit={onSubmit} onKeyDown={onKeyDown} className={sidebarFormClass}>
            {/* Left: sidebar */}
            <div className={sidebarCollapsed ? sidebarCollapsedClass : sidebarClass}>
                {!sidebarCollapsed && (
                    <button
                        type="button"
                        className={sidebarToggleClass}
                        onClick={() => onSidebarCollapse(true)}
                        title="Sidebar einklappen"
                        data-tutorial="sidebar-collapse"
                    >
                        <PanelLeftClose className={css({ width: '16px', height: '16px' })} />
                    </button>
                )}

                {/* Mobile: flow editor not available banner */}
                <div
                    className={css({
                        display: { base: 'flex', md: 'none' },
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3',
                        m: '3',
                        p: '5',
                        borderRadius: '2xl',
                        textAlign: 'center',
                    })}
                    style={{
                        background: `linear-gradient(135deg, ${PALETTE.orange}15, ${PALETTE.gold}10)`,
                        border: `1px solid ${PALETTE.orange}30`,
                    }}
                >
                    <div
                        className={css({
                            width: '48px',
                            height: '48px',
                            borderRadius: 'full',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        })}
                        style={{
                            background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                        }}
                    >
                        <Monitor size={24} color="white" />
                    </div>
                    <div>
                        <p className={css({ fontWeight: '700', fontSize: 'sm', mb: '1' })}>
                            Flow-Editor nur am Desktop
                        </p>
                        <p
                            className={css({
                                fontSize: 'xs',
                                color: 'foreground.muted',
                                lineHeight: '1.6',
                            })}
                        >
                            Rezept-Flows kannst du nur am Computer erstellen. Hier kannst du Titel,
                            Zutaten und alle Details bearbeiten.
                        </p>
                    </div>
                </div>

                {/* Sticky header: autosave + progress */}
                <div
                    className={sidebarStickyHeaderClass}
                    ref={(el) => {
                        if (el && window.innerWidth < 768) {
                            const header = document.querySelector('header');
                            el.style.top = header ? `${header.offsetHeight}px` : '0px';
                        }
                    }}
                >
                    {/* Autosave bar */}
                    {autoSaveLabel && (
                        <div
                            className={autoSaveBarClass(autoSaveStatus)}
                            data-tutorial="autosave-bar"
                        >
                            {autoSaveStatus === 'saving' && <span className={spinnerClass} />}
                            {autoSaveLabel}
                        </div>
                    )}

                    {/* Progress bar */}
                    <div className={progressBarWrapperClass}>
                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: '1',
                            })}
                        >
                            <span
                                className={css({
                                    fontSize: '8px',
                                    fontWeight: '700',
                                    color: {
                                        base: 'rgba(0,0,0,0.5)',
                                        _dark: 'rgba(255,255,255,0.5)',
                                    },
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                })}
                            >
                                {progressPct}%
                            </span>
                            {progressPct >= 100 && (
                                <span
                                    className={css({
                                        fontSize: '8px',
                                        color: 'palette.emerald',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    })}
                                >
                                    Vollst&auml;ndig
                                </span>
                            )}
                            {mandatoryMet && progressPct < 100 && (
                                <span
                                    className={css({
                                        fontSize: '8px',
                                        color: 'palette.emerald',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    })}
                                >
                                    Bereit
                                </span>
                            )}
                        </div>
                        {/* Track with 60% milestone marker */}
                        <div className={progressTrackClass} style={{ position: 'relative' }}>
                            <div
                                className={progressFillClass}
                                style={{
                                    width: `${progressPct}%`,
                                    backgroundColor: mandatoryMet
                                        ? PALETTE.emerald
                                        : PALETTE.orange,
                                }}
                            />
                            {/* 60% milestone marker */}
                            <div
                                className={css({
                                    position: 'absolute',
                                    left: '60%',
                                    top: '-2px',
                                    bottom: '-2px',
                                    width: '1.5px',
                                    backgroundColor: {
                                        base: 'rgba(0,0,0,0.15)',
                                        _dark: 'rgba(255,255,255,0.15)',
                                    },
                                    borderRadius: '1px',
                                })}
                            />
                        </div>
                    </div>
                </div>

                {/* Flat scrollable sections */}
                <div className={sidebarSectionsClass}>
                    {/* Title */}
                    <div className={sidebarSectionClass}>
                        <GeneralInformationSection
                            title={title}
                            onTitleChange={onTitleChange}
                            description={description}
                            onDescriptionChange={onDescriptionChange}
                            imageKey={imageKey}
                            onImageKeyChange={onImageKeyChange}
                            showAutoSaveHint={false}
                            recipeId={savedRecipeId}
                            titleInputRef={titleInputRef}
                        />
                    </div>

                    <div className={sidebarDividerClass} />

                    {/* Categories -- required */}
                    <div className={sidebarSectionClass}>
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                mb: '2',
                            })}
                        >
                            {!kategorieDone && (
                                <span
                                    className={css({
                                        display: 'inline-block',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: 'full',
                                        background: 'palette.orange',
                                        flexShrink: 0,
                                        animation: 'pulse 2s ease-in-out infinite',
                                    })}
                                />
                            )}
                        </div>
                        <CategorySelector
                            categories={categories}
                            selectedIds={categoryIds}
                            onToggle={onCategoryToggle}
                        />
                    </div>

                    <div className={sidebarDividerClass} />

                    {/* Time, Difficulty */}
                    <div className={sidebarSectionClass}>
                        <div className={sectionHeadingClass}>Details</div>
                        <TimeAndDifficultySection
                            prepTime={prepTime}
                            onPrepTimeChange={onPrepTimeChange}
                            cookTime={cookTime}
                            onCookTimeChange={onCookTimeChange}
                            difficulty={difficulty}
                            onDifficultyChange={onDifficultyChange}
                        />
                    </div>

                    <div className={sidebarDividerClass} />

                    {/* Tags */}
                    <div className={sidebarSectionClass} data-tutorial="tags">
                        <TagSelector
                            sortedTags={sortedTags}
                            selectedTags={selectedTags}
                            tagQuery={tagQuery}
                            onTagQueryChange={onTagQueryChange}
                            onSelectionChange={onTagSelectionChange}
                            onCreateTag={onCreateTag}
                        />
                    </div>

                    <div className={sidebarDividerClass} />

                    {/* Ingredients */}
                    <div className={sidebarSectionClass}>
                        <IngredientManager
                            servings={servings}
                            onServingsChange={onServingsChange}
                            ingredients={ingredients}
                            onAddIngredient={onAddIngredient}
                            onAddNewIngredient={onAddNewIngredient}
                            onUpdateIngredient={onUpdateIngredient}
                            onRemoveIngredient={onRemoveIngredient}
                            onReorderIngredients={onReorderIngredients}
                            onReplaceIngredient={onReplaceIngredient}
                            onServingsCustomTriggerClick={() =>
                                dispatchRecipeTutorialEvent(
                                    RECIPE_TUTORIAL_EVENTS.servingsCustomOpened,
                                )
                            }
                            onIngredientAmountFocus={() =>
                                dispatchRecipeTutorialEvent(
                                    RECIPE_TUTORIAL_EVENTS.ingredientAmountFocused,
                                )
                            }
                            onIngredientCommentClick={() =>
                                dispatchRecipeTutorialEvent(
                                    RECIPE_TUTORIAL_EVENTS.ingredientCommentClicked,
                                )
                            }
                        />
                    </div>
                </div>

                {/* Sticky footer */}
                <div className={sidebarFooterClass}>
                    {error && <ErrorBanner message={error} />}
                    <SubmissionControls
                        saving={saving}
                        saveStatus={saveStatus}
                        onStatusChange={onStatusChange}
                    />
                </div>
            </div>

            {/* Right: flow editor canvas */}
            <div className={canvasAreaClass}>
                {sidebarCollapsed && (
                    <button
                        type="button"
                        className={sidebarReopenClass}
                        onClick={() => onSidebarCollapse(false)}
                        title="Sidebar oeffnen"
                    >
                        <PanelLeftOpen className={css({ width: '16px', height: '16px' })} />
                    </button>
                )}
                {flowEditor}
            </div>
        </form>
    );
}
