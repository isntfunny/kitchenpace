'use client';

import { ArrowRight, Brain, ChefHat, Edit3, ImageOff, Network, X, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { ErrorBanner } from '@app/components/recipe/RecipeForm/components/ErrorBanner';

import type { AnalyzedRecipe } from './actions';
import { SuccessBanner } from './components/SuccessBanner';
import {
    cardIconClass,
    imagePreviewClass,
    imagePreviewHeaderClass,
    imagePreviewImgClass,
    imageRemoveButtonClass,
    ingredientTagClass,
    ingredientsListClass,
    ingredientsPreviewClass,
    ingredientsPreviewTitleClass,
    moreTagClass,
    previewActionsClass,
    previewCardClass,
    previewCardLabelClass,
    previewCardValueClass,
    previewCardsClass,
} from './import-styles-preview';
import {
    buttonIconClass,
    buttonIconRightClass,
    buttonIconSmallClass,
    errorWrapperClass,
    secondaryButtonClass,
} from './import-styles-url';
import { containerClass, primaryButtonClass } from './importStyles';

interface ImportStepPreviewProps {
    analyzedRecipe: AnalyzedRecipe;
    imageUrl: string;
    onImageUrlChange: (url: string) => void;
    error: string | null;
    onContinueToEdit: () => void;
    onReset: () => void;
}

export function ImportStepPreview({
    analyzedRecipe,
    imageUrl,
    onImageUrlChange,
    error,
    onContinueToEdit,
    onReset,
}: ImportStepPreviewProps) {
    return (
        <div className={containerClass}>
            <SuccessBanner
                title="Rezept erfolgreich importiert!"
                subtitle="Du kannst das Rezept jetzt überprüfen und bearbeiten"
            />

            {error && (
                <div className={errorWrapperClass}>
                    <ErrorBanner message={error} />
                </div>
            )}

            {/* Animated Stats Cards */}
            <motion.div
                className={previewCardsClass}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                {[
                    { label: 'Titel', value: analyzedRecipe.title, icon: ChefHat },
                    {
                        label: 'Zutaten',
                        value: `${analyzedRecipe.ingredients.length} erkannt`,
                        icon: Zap,
                    },
                    {
                        label: 'Schritte',
                        value: `${analyzedRecipe.flowNodes.length} Schritte`,
                        icon: Network,
                    },
                    {
                        label: 'Schwierigkeit',
                        value:
                            analyzedRecipe.difficulty === 'EASY'
                                ? 'Einfach'
                                : analyzedRecipe.difficulty === 'MEDIUM'
                                  ? 'Mittel'
                                  : 'Schwer',
                        icon: Brain,
                    },
                ].map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + idx * 0.1 }}
                        className={previewCardClass}
                    >
                        <div className={previewCardLabelClass}>{stat.label}</div>
                        <div className={previewCardValueClass}>
                            <stat.icon size={14} className={cardIconClass} />
                            {stat.value}
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Image Preview with opt-out */}
            {imageUrl && (
                <motion.div
                    className={imagePreviewClass}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                >
                    <div className={imagePreviewHeaderClass}>
                        <h3 className={ingredientsPreviewTitleClass}>Rezeptbild</h3>
                        <button
                            type="button"
                            onClick={() => onImageUrlChange('')}
                            className={imageRemoveButtonClass}
                            title="Bild entfernen"
                        >
                            <ImageOff size={14} />
                            Entfernen
                        </button>
                    </div>
                    <img
                        src={imageUrl}
                        alt={analyzedRecipe.title}
                        className={imagePreviewImgClass}
                        onError={() => onImageUrlChange('')}
                    />
                </motion.div>
            )}

            {/* Ingredients Preview with staggered animation */}
            <motion.div
                className={ingredientsPreviewClass}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
            >
                <h3 className={ingredientsPreviewTitleClass}>Erkannte Zutaten</h3>
                <div className={ingredientsListClass}>
                    {analyzedRecipe.ingredients.slice(0, 8).map((ing, idx) => (
                        <motion.span
                            key={idx}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.9 + idx * 0.05 }}
                            className={ingredientTagClass}
                        >
                            {ing.amount && `${ing.amount} `}
                            {ing.name}
                        </motion.span>
                    ))}
                    {analyzedRecipe.ingredients.length > 8 && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 }}
                            className={moreTagClass}
                        >
                            +{analyzedRecipe.ingredients.length - 8} mehr
                        </motion.span>
                    )}
                </div>
            </motion.div>

            {/* Actions with motion */}
            <motion.div
                className={previewActionsClass}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
            >
                <button type="button" onClick={onReset} className={secondaryButtonClass}>
                    <X className={buttonIconSmallClass} />
                    Abbrechen
                </button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onContinueToEdit}
                    className={primaryButtonClass}
                >
                    <Edit3 className={buttonIconClass} />
                    Bearbeiten
                    <ArrowRight className={buttonIconRightClass} />
                </motion.button>
            </motion.div>
        </div>
    );
}
