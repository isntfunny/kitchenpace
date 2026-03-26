import type { ReactNode } from 'react';

import { RecipeCard } from '@app/components/features/RecipeCard';
import type { RecipeCardData } from '@app/lib/recipe-card';

import { css } from 'styled-system/css';

import { articleProseClass } from './shared';

interface SidebarLayoutProps {
    mdxContent: ReactNode;
    sidebarRecipes: RecipeCardData[];
}

export function SidebarLayout({ mdxContent, sidebarRecipes }: SidebarLayoutProps) {
    return (
        <div
            className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', lg: '1fr 320px' },
                gap: '8',
                maxW: '1200px',
                mx: 'auto',
                px: '4',
                py: '8',
            })}
        >
            <article className={articleProseClass}>{mdxContent}</article>
            <aside className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                {sidebarRecipes.map((recipe) => (
                    <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        variant="compact"
                        categoryOnImage
                        starRating
                    />
                ))}
            </aside>
        </div>
    );
}
