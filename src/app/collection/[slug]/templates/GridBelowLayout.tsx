import type { ReactNode } from 'react';

import { RecipeCard } from '@app/components/features/RecipeCard';
import type { RecipeCardData } from '@app/lib/recipe-card';

import { css, cx } from 'styled-system/css';

import { articleProseClass } from './shared';

interface GridBelowLayoutProps {
    mdxContent: ReactNode;
    recipes: RecipeCardData[];
}

export function GridBelowLayout({ mdxContent, recipes }: GridBelowLayoutProps) {
    return (
        <div className={css({ maxW: '1200px', mx: 'auto', px: '4', py: '8' })}>
            <article className={cx(articleProseClass, css({ maxW: '768px', mx: 'auto', mb: '8' }))}>
                {mdxContent}
            </article>
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: {
                        base: '1fr',
                        sm: 'repeat(2, 1fr)',
                        lg: 'repeat(3, 1fr)',
                    },
                    gap: '6',
                })}
            >
                {recipes.map((recipe) => (
                    <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        variant="default"
                        categoryOnImage
                        categoryLink
                        starRating
                    />
                ))}
            </div>
        </div>
    );
}
