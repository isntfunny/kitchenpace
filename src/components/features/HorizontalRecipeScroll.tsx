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
                    <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        variant={cardVariant ?? 'compact'}
                        categoryOnImage
                        categoryLink
                        hideCategory={hideCategory}
                        starRating
                    />
                ))}
            </CustomScrollbar>
        </div>
    );
}
