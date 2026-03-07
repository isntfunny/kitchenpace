import type { RecipeCardData } from '@app/app/actions/recipes';
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
                    bg: 'surface',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    textAlign: 'center',
                })}
            >
                Keine Rezepte gefunden.
            </div>
        );
    }

    return (
        <section
            className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '3',
                p: '4',
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <h2
                className={css({
                    fontFamily: 'heading',
                    fontSize: { base: 'xl', md: '2xl' },
                    color: 'foreground',
                    lineHeight: '1.2',
                })}
            >
                {title}
            </h2>
            <HorizontalRecipeScroll recipes={recipes} />
        </section>
    );
}
