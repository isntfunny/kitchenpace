'use client';

import type { Category, Tag } from '@app/components/recipe/RecipeForm/data';

import { ImportStepEdit } from './ImportStepEdit';
import { ImportStepPreview } from './ImportStepPreview';
import { ImportStepProcessing } from './ImportStepProcessing';
import { ImportStepUrl } from './ImportStepUrl';
import { useImportScraping } from './useImportScraping';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface ImportRecipeClientProps {
    categories: Category[];
    tags: Tag[];
    authorId: string;
}

export function ImportRecipeClient({ categories, tags, authorId }: ImportRecipeClientProps) {
    const {
        // Step state
        currentStep,
        url,
        setUrl,
        analyzedRecipe,
        error,
        saving,
        status,
        streamEvents,
        streamingBuffer,
        terminalRef,

        // Form state
        title,
        setTitle,
        description,
        setDescription,
        imageUrl,
        setImageUrl,
        servings,
        setServings,
        prepTime,
        setPrepTime,
        cookTime,
        setCookTime,
        difficulty,
        setDifficulty,
        categoryIds,
        setCategoryIds,
        ingredients,
        setIngredients,

        // Handlers
        startImport,
        handleContinueToEdit,
        handleBackToPreview,
        handleSave,
        resetImport,
    } = useImportScraping({ categories, tags, authorId });

    // ── URL Input Step ───────────────────────────────────────────────────────
    if (currentStep === 'url') {
        return (
            <ImportStepUrl
                url={url}
                onUrlChange={setUrl}
                onStartImport={startImport}
                error={error}
            />
        );
    }

    // ── Processing Steps (scraping / analyzing) ──────────────────────────────
    if (currentStep === 'scraping' || currentStep === 'analyzing') {
        return (
            <ImportStepProcessing
                currentStep={currentStep}
                status={status}
                streamEvents={streamEvents}
                streamingBuffer={streamingBuffer}
                terminalRef={terminalRef}
            />
        );
    }

    // ── Preview Step ─────────────────────────────────────────────────────────
    if (currentStep === 'preview' && analyzedRecipe) {
        return (
            <ImportStepPreview
                analyzedRecipe={analyzedRecipe}
                imageUrl={imageUrl}
                onImageUrlChange={setImageUrl}
                error={error}
                onContinueToEdit={handleContinueToEdit}
                onReset={resetImport}
            />
        );
    }

    // ── Edit Step ────────────────────────────────────────────────────────────
    if (currentStep === 'edit') {
        return (
            <ImportStepEdit
                categories={categories}
                analyzedRecipe={analyzedRecipe}
                error={error}
                saving={saving}
                title={title}
                onTitleChange={setTitle}
                description={description}
                onDescriptionChange={setDescription}
                servings={servings}
                onServingsChange={setServings}
                prepTime={prepTime}
                onPrepTimeChange={setPrepTime}
                cookTime={cookTime}
                onCookTimeChange={setCookTime}
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
                categoryIds={categoryIds}
                onCategoryIdsChange={setCategoryIds}
                ingredients={ingredients}
                onIngredientsChange={setIngredients}
                onBackToPreview={handleBackToPreview}
                onSave={handleSave}
            />
        );
    }

    return null;
}
