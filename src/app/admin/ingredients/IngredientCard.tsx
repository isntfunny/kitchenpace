'use client';

import { AlertCircle } from 'lucide-react';
import { memo } from 'react';

import { css, cx } from 'styled-system/css';

import { type Ingredient } from './ingredient-types';

const rowBase = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    width: '100%',
    paddingX: '3',
    paddingY: '2.5',
    bg: 'transparent',
    border: 'none',
    borderLeft: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.1s',
    textAlign: 'left',
    _hover: { bg: 'surface.elevated' },
});

const rowSelected = css({
    bg: 'accent.soft',
    borderLeftColor: 'brand.primary',
    _hover: { bg: 'accent.soft' },
});

const rowNeedsReview = css({
    borderLeftColor: 'status.warning',
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
                rowBase,
                isSelected && rowSelected,
                ingredient.needsReview && !isSelected && rowNeedsReview,
            )}
        >
            {/* Left: Name + meta */}
            <div className={css({ flex: '1', minWidth: 0 })}>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
                    <span
                        className={css({
                            fontSize: 'sm',
                            fontWeight: isSelected ? '600' : '500',
                            color: 'foreground',
                            truncate: true,
                        })}
                    >
                        {ingredient.name}
                    </span>
                    {ingredient.needsReview && (
                        <AlertCircle
                            size={12}
                            className={css({ color: 'status.warning', flexShrink: '0' })}
                        />
                    )}
                </div>
                {ingredient.aliases.length > 0 && (
                    <span
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            truncate: true,
                            display: 'block',
                        })}
                    >
                        {ingredient.aliases.slice(0, 2).join(', ')}
                    </span>
                )}
            </div>

            {/* Right: Stats */}
            <div
                className={css({
                    display: 'flex',
                    gap: '2',
                    flexShrink: '0',
                    fontSize: 'xs',
                    color: 'foreground.muted',
                    fontVariantNumeric: 'tabular-nums',
                })}
            >
                <span>{ingredient.recipeCount}</span>
                <span className={css({ color: 'border' })}>·</span>
                <span>{ingredient.energyKcal != null ? `${ingredient.energyKcal}` : '–'}</span>
            </div>
        </button>
    );
});
