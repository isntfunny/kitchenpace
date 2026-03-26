'use client';

import * as React from 'react';

import { css } from 'styled-system/css';

import { CustomScrollbar } from './CustomScrollbar';
import { RecipeCard, type RecipeCardRecipe } from './RecipeCard';

interface HorizontalRecipeScrollProps {
    recipes: RecipeCardRecipe[];
    hideCategory?: boolean;
    cardVariant?: 'compact' | 'default';
}

export function HorizontalRecipeScroll({
    recipes,
    hideCategory,
    cardVariant,
}: HorizontalRecipeScrollProps) {
    return (
        <div>
            <CustomScrollbar
                className={css({
                    display: 'flex',
                    gap: '3',
                    pb: '2',
                })}
            >
                {recipes.map((recipe) => (
                    <div
                        key={recipe.id}
                        className={css({
                            flex: '0 0 auto',
                            width: cardVariant === 'default' ? '240px' : undefined,
                        })}
                    >
                        <RecipeCard
                            recipe={recipe}
                            variant={cardVariant ?? 'compact'}
                            categoryOnImage
                            categoryLink
                            hideCategory={hideCategory}
                            starRating
                        />
                    </div>
                ))}
            </CustomScrollbar>
        </div>
    );
}
