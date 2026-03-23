'use client';

import { AlertCircle } from 'lucide-react';
import { memo, useCallback } from 'react';

import { css, cx } from 'styled-system/css';

import { type Ingredient } from './ingredient-types';

const rowBase = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    width: '100%',
    height: '100%',
    paddingX: '3',
    bg: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.1s',
    textAlign: 'left',
    _hover: { bg: 'surface.muted' },
});

const rowSelected = css({
    bg: 'accent.soft',
    _hover: { bg: 'accent.soft' },
});

const rowNeedsReview = css({
    bg: { base: 'rgba(245,158,11,0.04)', _dark: 'rgba(245,158,11,0.06)' },
});

export const IngredientCard = memo(
    function IngredientCard({
        ingredient,
        isSelected,
        onSelect,
    }: {
        ingredient: Ingredient;
        isSelected: boolean;
        onSelect: (id: string) => void;
    }) {
        const handleClick = useCallback(() => onSelect(ingredient.id), [onSelect, ingredient.id]);

        return (
            <button
                type="button"
                onClick={handleClick}
                className={cx(
                    rowBase,
                    isSelected && rowSelected,
                    ingredient.needsReview && !isSelected && rowNeedsReview,
                )}
            >
                <span
                    className={css({
                        flex: '1',
                        minWidth: 0,
                        fontSize: 'sm',
                        fontWeight: isSelected ? '600' : '400',
                        color: 'foreground',
                        truncate: true,
                    })}
                >
                    {ingredient.name}
                </span>

                {ingredient.needsReview && (
                    <AlertCircle
                        size={11}
                        className={css({ color: 'status.warning', flexShrink: '0' })}
                    />
                )}

                <span
                    className={css({
                        flexShrink: '0',
                        fontSize: 'xs',
                        color: 'foreground.muted',
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: '24px',
                        textAlign: 'right',
                    })}
                >
                    {ingredient.recipeCount}
                </span>
            </button>
        );
    },
    (prev, next) =>
        prev.ingredient === next.ingredient &&
        prev.isSelected === next.isSelected &&
        prev.onSelect === next.onSelect,
);
