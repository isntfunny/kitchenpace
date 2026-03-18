'use client';

import { useEffect, useState } from 'react';

import { HorizontalRecipeScroll } from '@app/components/features/HorizontalRecipeScroll';
import type { RecipeCardData } from '@app/lib/recipe-card';

import { css } from 'styled-system/css';

interface SimilarRecipesProps {
    recipeId: string;
}

interface SimilarRecipeDto {
    id: string;
    slug: string;
    title: string;
    category: string;
    rating: number;
    time: string;
    imageKey: string | null;
    description: string;
    difficulty?: string;
}

export function SimilarRecipes({ recipeId }: SimilarRecipesProps) {
    const [recipes, setRecipes] = useState<RecipeCardData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const res = await fetch(`/api/recipe/${recipeId}/similar?limit=8`);
                if (!res.ok || cancelled) return;
                const json = (await res.json()) as { data: SimilarRecipeDto[] };

                if (!cancelled && json.data.length > 0) {
                    setRecipes(
                        json.data.map((r) => ({
                            id: r.id,
                            slug: r.slug,
                            title: r.title,
                            category: r.category,
                            rating: r.rating,
                            time: r.time,
                            image: r.imageKey
                                ? `/api/thumbnail?type=recipe&id=${encodeURIComponent(r.id)}`
                                : null,
                            imageKey: r.imageKey,
                            description: r.description,
                            difficulty: r.difficulty,
                        })),
                    );
                }
            } catch {
                // Silently fail — similar recipes are optional
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
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
