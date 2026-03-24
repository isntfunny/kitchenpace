'use client';

import { AlertCircle, Flame, Ruler, Tag, Weight } from 'lucide-react';
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
    paddingY: '1.5',
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

const nameBlockStyle = css({
    flex: '1',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5',
    overflow: 'hidden',
});

const nameStyle = css({
    fontSize: 'sm',
    lineHeight: '1.3',
    color: 'foreground',
    truncate: true,
});

const unitLineStyle = css({
    fontSize: 'xs',
    lineHeight: '1.2',
    color: 'foreground.subtle',
    truncate: true,
});

const warningsStyle = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1',
    flexShrink: '0',
});

const recipeCountStyle = css({
    flexShrink: '0',
    fontSize: 'xs',
    color: 'foreground.muted',
    fontVariantNumeric: 'tabular-nums',
    minWidth: '24px',
    textAlign: 'right',
    alignSelf: 'flex-start',
    paddingTop: '1px',
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

        const unitShortNames = ingredient.ingredientUnits.map((iu) => iu.unit.shortName).join(', ');

        const hasNoKcal = ingredient.energyKcal === null;
        const hasNoUnits = ingredient.ingredientUnits.length === 0;
        const hasNoCategories = ingredient.categories.length === 0;
        const stkUnit = ingredient.ingredientUnits.find((iu) => iu.unit.shortName === 'Stk');
        const hasStkWithoutGrams =
            stkUnit !== undefined && (stkUnit.grams === null || stkUnit.grams === 0);

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
                <div className={nameBlockStyle}>
                    <span
                        className={cx(nameStyle, css({ fontWeight: isSelected ? '600' : '400' }))}
                    >
                        {ingredient.name}
                    </span>

                    {unitShortNames && <span className={unitLineStyle}>{unitShortNames}</span>}
                </div>

                <div className={warningsStyle}>
                    {ingredient.needsReview && (
                        <AlertCircle
                            size={11}
                            className={css({ color: 'status.warning', flexShrink: '0' })}
                        />
                    )}

                    {hasNoKcal && (
                        <span title="Keine Naehrwerte">
                            <Flame
                                size={11}
                                className={css({ color: 'status.danger', flexShrink: '0' })}
                            />
                        </span>
                    )}

                    {hasNoUnits && (
                        <span title="Keine Einheiten">
                            <Ruler
                                size={11}
                                className={css({ color: 'status.warning', flexShrink: '0' })}
                            />
                        </span>
                    )}

                    {hasNoCategories && (
                        <span title="Keine Kategorie">
                            <Tag
                                size={11}
                                className={css({ color: 'status.warning', flexShrink: '0' })}
                            />
                        </span>
                    )}

                    {hasStkWithoutGrams && (
                        <span title="Stueck ohne Grammangabe">
                            <Weight
                                size={11}
                                className={css({ color: 'status.warning', flexShrink: '0' })}
                            />
                        </span>
                    )}
                </div>

                <span className={recipeCountStyle}>{ingredient.recipeCount}</span>
            </button>
        );
    },
    (prev, next) =>
        prev.ingredient === next.ingredient &&
        prev.isSelected === next.isSelected &&
        prev.onSelect === next.onSelect,
);
