'use client';

import {
    Check,
    ExternalLink,
    ImageOff,
    Link2,
    Loader2,
    Network,
    SkipForward,
    XCircle,
    Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { css } from 'styled-system/css';

import {
    errorBannerClass,
    imageRemoveBtnClass,
    ingredientChipClass,
    moreChipClass,
    reviewActionsClass,
    reviewCardClass,
    reviewCounterClass,
    reviewDotClass,
    reviewFieldClass,
    reviewFieldLabelClass,
    reviewFieldSmallClass,
    reviewImageClass,
    reviewImageWrapperClass,
    reviewIngredientTagsClass,
    reviewIngredientsClass,
    reviewInputClass,
    reviewInputSmallClass,
    reviewProgressClass,
    reviewProgressDotsClass,
    reviewSelectClass,
    reviewSettingsRowClass,
    reviewSourceClass,
    reviewSourceLinkClass,
    reviewStatClass,
    reviewStatsRowClass,
    reviewTagsClass,
    skipAllButtonClass,
    skipButtonClass,
    tagChipClass,
} from './bulk-import-styles';
import type { BulkItem } from './bulk-import-types';
import { containerClass, primaryButtonClass } from './importStyles';

interface BulkReviewWizardProps {
    items: BulkItem[];
    currentReviewItem: BulkItem;
    savedItems: BulkItem[];
    skippedItems: BulkItem[];
    error: string | null;
    saving: boolean;

    // Edit fields
    editTitle: string;
    onEditTitleChange: (value: string) => void;
    editServings: number;
    onEditServingsChange: (value: number) => void;
    editDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
    onEditDifficultyChange: (value: 'EASY' | 'MEDIUM' | 'HARD') => void;
    editImageUrl: string;
    onEditImageUrlChange: (value: string) => void;

    // Actions
    onSaveAndNext: () => void;
    onSkip: () => void;
    onSkipAll: () => void;
}

export function BulkReviewWizard({
    items,
    currentReviewItem,
    savedItems,
    skippedItems,
    error,
    saving,
    editTitle,
    onEditTitleChange,
    editServings,
    onEditServingsChange,
    editDifficulty,
    onEditDifficultyChange,
    editImageUrl,
    onEditImageUrlChange,
    onSaveAndNext,
    onSkip,
    onSkipAll,
}: BulkReviewWizardProps) {
    const recipe = currentReviewItem.recipe!;
    const totalReviewable = items.filter((i) => i.status === 'done' && i.recipe).length;
    const alreadyReviewed = savedItems.length + skippedItems.length;
    const currentNum = alreadyReviewed + 1;

    return (
        <div className={containerClass}>
            {/* Progress indicator */}
            <div className={reviewProgressClass}>
                <span className={reviewCounterClass}>
                    Rezept {currentNum} von {totalReviewable}
                </span>
                <div className={reviewProgressDotsClass}>
                    {items
                        .filter((i) => i.status === 'done' && i.recipe)
                        .map((item, idx) => (
                            <div
                                key={item.url}
                                className={reviewDotClass(
                                    item.savedId
                                        ? 'saved'
                                        : item.skipped
                                          ? 'skipped'
                                          : idx === alreadyReviewed
                                            ? 'current'
                                            : 'pending',
                                )}
                            />
                        ))}
                </div>
                <button type="button" onClick={onSkipAll} className={skipAllButtonClass}>
                    Alle überspringen
                </button>
            </div>

            {error && (
                <div className={css({ mb: '4' })}>
                    <div className={errorBannerClass}>
                        <XCircle size={16} />
                        {error}
                    </div>
                </div>
            )}

            {/* Recipe preview card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentReviewItem.url}
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.3 }}
                    className={reviewCardClass}
                >
                    {/* Source URL */}
                    <div className={reviewSourceClass}>
                        <Link2 size={12} />
                        <a
                            href={currentReviewItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={reviewSourceLinkClass}
                        >
                            {(() => {
                                try {
                                    return new URL(currentReviewItem.url).hostname;
                                } catch {
                                    return currentReviewItem.url;
                                }
                            })()}
                            <ExternalLink size={10} />
                        </a>
                    </div>

                    {/* Image */}
                    {editImageUrl && (
                        <div className={reviewImageWrapperClass}>
                            <img
                                src={editImageUrl}
                                alt={editTitle}
                                className={reviewImageClass}
                                onError={() => onEditImageUrlChange('')}
                            />
                            <button
                                type="button"
                                onClick={() => onEditImageUrlChange('')}
                                className={imageRemoveBtnClass}
                                title="Bild entfernen"
                            >
                                <ImageOff size={14} />
                            </button>
                        </div>
                    )}

                    {/* Editable title */}
                    <div className={reviewFieldClass}>
                        <label className={reviewFieldLabelClass}>Titel</label>
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => onEditTitleChange(e.target.value)}
                            className={reviewInputClass}
                        />
                    </div>

                    {/* Stats row */}
                    <div className={reviewStatsRowClass}>
                        <div className={reviewStatClass}>
                            <Zap size={14} className={css({ color: 'palette.orange' })} />
                            <span>{recipe.ingredients.length} Zutaten</span>
                        </div>
                        <div className={reviewStatClass}>
                            <Network size={14} className={css({ color: 'palette.orange' })} />
                            <span>{recipe.flowNodes.length} Schritte</span>
                        </div>
                    </div>

                    {/* Quick settings row */}
                    <div className={reviewSettingsRowClass}>
                        <div className={reviewFieldSmallClass}>
                            <label className={reviewFieldLabelClass}>Portionen</label>
                            <input
                                type="number"
                                min={1}
                                max={99}
                                value={editServings}
                                onChange={(e) => onEditServingsChange(Number(e.target.value) || 1)}
                                className={reviewInputSmallClass}
                            />
                        </div>
                        <div className={reviewFieldSmallClass}>
                            <label className={reviewFieldLabelClass}>Schwierigkeit</label>
                            <select
                                value={editDifficulty}
                                onChange={(e) =>
                                    onEditDifficultyChange(
                                        e.target.value as 'EASY' | 'MEDIUM' | 'HARD',
                                    )
                                }
                                className={reviewSelectClass}
                            >
                                <option value="EASY">Einfach</option>
                                <option value="MEDIUM">Mittel</option>
                                <option value="HARD">Schwer</option>
                            </select>
                        </div>
                    </div>

                    {/* Ingredients preview */}
                    <div className={reviewIngredientsClass}>
                        <span className={reviewFieldLabelClass}>Zutaten</span>
                        <div className={reviewIngredientTagsClass}>
                            {recipe.ingredients.slice(0, 10).map((ing, idx) => (
                                <span key={idx} className={ingredientChipClass}>
                                    {ing.amount && `${ing.amount} `}
                                    {ing.name}
                                </span>
                            ))}
                            {recipe.ingredients.length > 10 && (
                                <span className={moreChipClass}>
                                    +{recipe.ingredients.length - 10} mehr
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Tags */}
                    {recipe.tags && recipe.tags.length > 0 && (
                        <div className={reviewTagsClass}>
                            {recipe.tags.map((tag) => (
                                <span key={tag} className={tagChipClass}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Action buttons */}
            <div className={reviewActionsClass}>
                <button type="button" onClick={onSkip} className={skipButtonClass}>
                    <SkipForward size={16} />
                    Überspringen
                </button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onSaveAndNext}
                    disabled={saving || !editTitle.trim()}
                    className={primaryButtonClass}
                >
                    {saving ? (
                        <>
                            <Loader2
                                size={18}
                                className={css({ animation: 'spin 1s linear infinite' })}
                            />
                            Speichern...
                        </>
                    ) : (
                        <>
                            <Check size={18} />
                            Speichern & Weiter
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    );
}
