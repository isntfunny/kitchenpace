'use client';

import { Loader2 } from 'lucide-react';

import type { Category, Tag } from '@app/components/recipe/RecipeForm/data';

import { css } from 'styled-system/css';

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
        analyzing,
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

    // ── Render: Analyzing next recipe ────────────────────────────────────────

    if (step === 'review' && analyzing && !currentReviewItem?.recipe) {
        return (
            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4',
                    py: '16',
                    color: 'text.dimmed',
                })}
            >
                <Loader2
                    size={32}
                    className={css({
                        color: 'palette.purple',
                        animation: 'spin 1s linear infinite',
                    })}
                />
                <p className={css({ fontSize: 'sm' })}>KI analysiert das nächste Rezept...</p>
            </div>
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
