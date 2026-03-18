'use client';

import { ArrowRight, Check, ChefHat, Loader2 } from 'lucide-react';

import { CategorySelector } from '@app/components/recipe/RecipeForm/components/CategorySelector';
import { ErrorBanner } from '@app/components/recipe/RecipeForm/components/ErrorBanner';
import { GeneralInformationSection } from '@app/components/recipe/RecipeForm/components/GeneralInformationSection';
import { IngredientManager } from '@app/components/recipe/RecipeForm/components/IngredientManager';
import { SubmissionControls } from '@app/components/recipe/RecipeForm/components/SubmissionControls';
import { TimeAndDifficultySection } from '@app/components/recipe/RecipeForm/components/TimeAndDifficultySection';
import type { Category, AddedIngredient } from '@app/components/recipe/RecipeForm/data';

import type { AnalyzedRecipe } from './actions';
import {
    backButtonClass,
    editActionsClass,
    editContainerClass,
    editFormClass,
    editHeaderClass,
    editSubtitleClass,
    editTitleClass,
    flowNoteClass,
    flowNoteIconClass,
    formDividerClass,
    formSectionClass,
    saveButtonClass,
    spinningIconSmallClass,
} from './import-styles-edit';
import { rotate180Class } from './import-styles-edit';
import { buttonIconClass, errorWrapperClass } from './import-styles-url';

interface ImportStepEditProps {
    categories: Category[];
    analyzedRecipe: AnalyzedRecipe | null;
    error: string | null;
    saving: boolean;

    // Form state
    title: string;
    onTitleChange: (v: string) => void;
    description: string;
    onDescriptionChange: (v: string) => void;
    servings: number;
    onServingsChange: (v: number) => void;
    prepTime: number;
    onPrepTimeChange: (v: number) => void;
    cookTime: number;
    onCookTimeChange: (v: number) => void;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    onDifficultyChange: (v: 'EASY' | 'MEDIUM' | 'HARD') => void;
    categoryIds: string[];
    onCategoryIdsChange: (ids: string[]) => void;
    ingredients: AddedIngredient[];
    onIngredientsChange: (ings: AddedIngredient[]) => void;

    // Handlers
    onBackToPreview: () => void;
    onSave: () => void;
}

export function ImportStepEdit({
    categories,
    analyzedRecipe,
    error,
    saving,
    title,
    onTitleChange,
    description,
    onDescriptionChange,
    servings,
    onServingsChange,
    prepTime,
    onPrepTimeChange,
    cookTime,
    onCookTimeChange,
    difficulty,
    onDifficultyChange,
    categoryIds,
    onCategoryIdsChange,
    ingredients,
    onIngredientsChange,
    onBackToPreview,
    onSave,
}: ImportStepEditProps) {
    return (
        <div className={editContainerClass}>
            <div className={editHeaderClass}>
                <button type="button" onClick={onBackToPreview} className={backButtonClass}>
                    <ArrowRight className={rotate180Class} />
                    Zurück zur Vorschau
                </button>
                <h1 className={editTitleClass}>Rezept bearbeiten</h1>
                <p className={editSubtitleClass}>Überprüfe und passe das importierte Rezept an</p>
            </div>

            {error && (
                <div className={errorWrapperClass}>
                    <ErrorBanner message={error} />
                </div>
            )}

            <div className={editFormClass}>
                {/* General Info */}
                <div className={formSectionClass}>
                    <GeneralInformationSection
                        title={title}
                        onTitleChange={onTitleChange}
                        description={description}
                        onDescriptionChange={onDescriptionChange}
                        showAutoSaveHint={false}
                    />
                </div>

                <div className={formDividerClass} />

                {/* Time & Difficulty */}
                <div className={formSectionClass}>
                    <TimeAndDifficultySection
                        prepTime={prepTime}
                        onPrepTimeChange={onPrepTimeChange}
                        cookTime={cookTime}
                        onCookTimeChange={onCookTimeChange}
                        difficulty={difficulty}
                        onDifficultyChange={onDifficultyChange}
                    />
                </div>

                <div className={formDividerClass} />

                {/* Categories */}
                <div className={formSectionClass}>
                    <CategorySelector
                        categories={categories}
                        selectedIds={categoryIds}
                        onToggle={(id, selected) => {
                            onCategoryIdsChange(
                                selected
                                    ? [...categoryIds, id]
                                    : categoryIds.filter((c) => c !== id),
                            );
                        }}
                    />
                </div>

                <div className={formDividerClass} />

                {/* Ingredients */}
                <div className={formSectionClass}>
                    <IngredientManager
                        servings={servings}
                        onServingsChange={onServingsChange}
                        ingredients={ingredients}
                        onAddIngredient={() => {}}
                        onAddNewIngredient={async () => {}}
                        onUpdateIngredient={(idx, changes) => {
                            const next = [...ingredients];
                            next[idx] = { ...next[idx], ...changes };
                            onIngredientsChange(next);
                        }}
                        onRemoveIngredient={(idx) => {
                            onIngredientsChange(ingredients.filter((_, i) => i !== idx));
                        }}
                        onReorderIngredients={onIngredientsChange}
                    />
                </div>

                <div className={formDividerClass} />

                {/* Flow Preview Note */}
                <div className={flowNoteClass}>
                    <ChefHat className={flowNoteIconClass} />
                    <div>
                        <strong>Zubereitungsfluss</strong>
                        <p>
                            Die KI hat {analyzedRecipe?.flowNodes.length || 0} Schritte erkannt. Du
                            kannst den Flow im nächsten Schritt anpassen.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className={editActionsClass}>
                    <SubmissionControls
                        saving={saving}
                        saveStatus="DRAFT"
                        onStatusChange={() => {}}
                    />
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className={saveButtonClass}
                    >
                        {saving ? (
                            <>
                                <Loader2 className={spinningIconSmallClass} />
                                Wird gespeichert...
                            </>
                        ) : (
                            <>
                                <Check className={buttonIconClass} />
                                Speichern & Bearbeiten
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
