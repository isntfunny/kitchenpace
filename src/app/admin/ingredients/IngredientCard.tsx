'use client';

import { AlertCircle } from 'lucide-react';
import { memo } from 'react';

import { css, cx } from 'styled-system/css';

import { type Ingredient, pillStyle } from './ingredient-types';

const cardBase = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5',
    padding: '3',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border.muted',
    cursor: 'pointer',
    transition: 'all 0.15s',
    bg: 'surface',
    _hover: { bg: 'surface.elevated' },
});

const cardSelected = css({
    borderColor: 'brand.primary',
    bg: 'surface.elevated',
    boxShadow: {
        base: '0 0 0 1px rgba(224,123,83,0.3)',
        _dark: '0 0 0 1px rgba(224,123,83,0.4)',
    },
});

const cardNeedsReview = css({
    borderLeftWidth: '3px',
    borderLeftColor: 'status.warning',
});

const metaStyle = css({
    fontSize: 'xs',
    color: 'foreground.muted',
});

export const IngredientCard = memo(function IngredientCard({
    ingredient,
    isSelected,
    onClick,
}: {
    ingredient: Ingredient;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                cardBase,
                isSelected && cardSelected,
                ingredient.needsReview && !isSelected && cardNeedsReview,
            )}
        >
            {/* Name + review badge */}
            <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                <span
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '600',
                        color: 'foreground',
                        textAlign: 'left',
                        lineClamp: '1',
                    })}
                >
                    {ingredient.name}
                </span>
                {ingredient.needsReview && (
                    <AlertCircle
                        size={14}
                        className={css({ color: 'status.warning', flexShrink: '0' })}
                    />
                )}
            </div>

            {/* Aliases */}
            {ingredient.aliases.length > 0 && (
                <p
                    className={css({
                        fontSize: 'xs',
                        color: 'foreground.muted',
                        lineClamp: '1',
                        textAlign: 'left',
                    })}
                >
                    {ingredient.aliases.slice(0, 3).join(', ')}
                    {ingredient.aliases.length > 3 && ` +${ingredient.aliases.length - 3}`}
                </p>
            )}

            {/* Category pills */}
            {ingredient.categories.length > 0 && (
                <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '1' })}>
                    {ingredient.categories.slice(0, 2).map((cat) => (
                        <span
                            key={cat.id}
                            className={cx(
                                pillStyle,
                                css({ fontSize: '2xs', paddingX: '1.5', paddingY: '0' }),
                            )}
                        >
                            {cat.name}
                        </span>
                    ))}
                    {ingredient.categories.length > 2 && (
                        <span className={metaStyle}>+{ingredient.categories.length - 2}</span>
                    )}
                </div>
            )}

            {/* Stats row */}
            <div className={css({ display: 'flex', gap: '3', marginTop: '0.5' })}>
                <span className={metaStyle}>{ingredient.recipeCount} Rez.</span>
                <span className={metaStyle}>{ingredient.ingredientUnits.length} Einh.</span>
                <span className={metaStyle}>
                    {ingredient.energyKcal != null ? `${ingredient.energyKcal} kcal` : '–'}
                </span>
            </div>
        </button>
    );
});
