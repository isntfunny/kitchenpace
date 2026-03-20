'use client';

import { useEffect, useState } from 'react';

import { fetchSimilarRecipes } from '@app/app/actions/recipes';
import { HorizontalRecipeScroll } from '@app/components/features/HorizontalRecipeScroll';
import type { RecipeCardData } from '@app/lib/recipe-card';

import { css } from 'styled-system/css';

interface SimilarRecipesProps {
    recipeId: string;
}

export function SimilarRecipes({ recipeId }: SimilarRecipesProps) {
    const [recipes, setRecipes] = useState<RecipeCardData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        fetchSimilarRecipes(recipeId, 8)
            .then((data) => {
                if (!cancelled && data.length > 0) setRecipes(data);
            })
            .catch(() => {
                // Silently fail — similar recipes are optional
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [recipeId]);

    if (loading || recipes.length === 0) return null;

    return (
        <section className={css({ mt: '10' })}>
            <h3
                className={css({
                    fontFamily: 'heading',
                    fontSize: 'lg',
                    fontWeight: '700',
                    color: 'text',
                    mb: '4',
                })}
            >
                Ähnliche Rezepte
            </h3>
            <HorizontalRecipeScroll recipes={recipes} />
        </section>
    );
}
