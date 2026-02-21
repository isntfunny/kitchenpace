'use client';

import { useEffect, useState } from 'react';

import { getRecipes, type RecipeCardData } from './actions';
import { HorizontalRecipeScroll } from './HorizontalRecipeScroll';

interface RecipeScrollProps {
    title: string;
}

export function RecipeScrollServer({ title }: RecipeScrollProps) {
    const [recipes, setRecipes] = useState<RecipeCardData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getRecipes().then((data) => {
            setRecipes(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div
                style={{
                    padding: '2rem',
                    textAlign: 'center',
                    background: '#fffcf9',
                    borderRadius: '1rem',
                    marginTop: '1.5rem',
                }}
            >
                Lade Rezepte...
            </div>
        );
    }

    if (recipes.length === 0) {
        return (
            <div
                style={{
                    padding: '2rem',
                    textAlign: 'center',
                    background: '#fffcf9',
                    borderRadius: '1rem',
                    marginTop: '1.5rem',
                }}
            >
                Keine Rezepte gefunden.
            </div>
        );
    }

    return <HorizontalRecipeScroll recipes={recipes} title={title} />;
}
