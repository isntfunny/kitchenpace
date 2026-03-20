'use client';

import type { Category, Tag } from '@app/components/recipe/RecipeForm/data';

import { BulkDoneSummary } from './BulkDoneSummary';
import { BulkProgressTable } from './BulkProgressTable';
import { BulkReviewWizard } from './BulkReviewWizard';
import { BulkUrlInput } from './BulkUrlInput';
import { useBulkImport } from './useBulkImport';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface BulkImportClientProps {
    categories: Category[];
    tags: Tag[];
    authorId: string;
}

export function BulkImportClient({ tags: _tags, authorId }: BulkImportClientProps) {
    const {
        step,
        urlText,
        setUrlText,
        items,
        error,
        saving,
        validUrls,
        currentReviewItem,
        savedItems,
        skippedItems,
        failedItems,
        editTitle,
        setEditTitle,
        editServings,
        setEditServings,
        editDifficulty,
        setEditDifficulty,
        editImageUrl,
        setEditImageUrl,
        abortRef,
        startBulkImport,
        handleSaveAndNext,
        handleSkip,
        handleSkipAll,
        resetImport,
    } = useBulkImport({ authorId });

    // ── Render: URL Input ────────────────────────────────────────────────────

    if (step === 'urls') {
        return (
            <BulkUrlInput
                urlText={urlText}
                onUrlTextChange={setUrlText}
                validUrls={validUrls}
                error={error}
                onStart={startBulkImport}
            />
        );
    }

    // ── Render: Processing ───────────────────────────────────────────────────

    if (step === 'processing') {
        return <BulkProgressTable items={items} abortRef={abortRef} />;
    }

    // ── Render: Review Wizard ────────────────────────────────────────────────

    if (step === 'review' && currentReviewItem?.recipe) {
        return (
            <BulkReviewWizard
                items={items}
                currentReviewItem={currentReviewItem}
                savedItems={savedItems}
                skippedItems={skippedItems}
                error={error}
                saving={saving}
                editTitle={editTitle}
                onEditTitleChange={setEditTitle}
                editServings={editServings}
                onEditServingsChange={setEditServings}
                editDifficulty={editDifficulty}
                onEditDifficultyChange={setEditDifficulty}
                editImageUrl={editImageUrl}
                onEditImageUrlChange={setEditImageUrl}
                onSaveAndNext={handleSaveAndNext}
                onSkip={handleSkip}
                onSkipAll={handleSkipAll}
            />
        );
    }

    // ── Render: Done Summary ─────────────────────────────────────────────────

    // Also covers: step === 'review' but no reviewable items left
    if (step === 'done' || step === 'review') {
        return (
            <BulkDoneSummary
                savedItems={savedItems}
                skippedItems={skippedItems}
                failedItems={failedItems}
                onRestart={resetImport}
            />
        );
    }

    // Fallback — shouldn't reach here
    return null;
}
