import type { RecipeCardData } from '@/app/actions/recipes';
import { css } from 'styled-system/css';

import { HorizontalRecipeScroll } from './HorizontalRecipeScroll';

interface RecipeScrollProps {
    title: string;
    recipes: RecipeCardData[];
}

export function RecipeScrollServer({ title, recipes }: RecipeScrollProps) {
    if (recipes.length === 0) {
        return (
            <div
                className={css({
                    p: '5',
                    borderRadius: '2xl',
                    bg: '#fffcf9',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    textAlign: 'center',
                })}
            >
                Keine Rezepte gefunden.
            </div>
        );
    }

    return <HorizontalRecipeScroll title={title} recipes={recipes} />;
}
