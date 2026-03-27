import type { ReactNode } from 'react';

import { FeaturedTrio } from '@app/app/category/[slug]/components/FeaturedTrio';
import type { RecipeCardData } from '@app/lib/recipe-card';

import { css } from 'styled-system/css';

import { articleProseClass } from './shared';

interface HeroPicksLayoutProps {
    mdxContent: ReactNode;
    heroRecipes: RecipeCardData[];
}

export function HeroPicksLayout({ mdxContent, heroRecipes }: HeroPicksLayoutProps) {
    return (
        <div className={css({ maxW: '1200px', mx: 'auto', px: '4', py: '8' })}>
            {heroRecipes.length > 0 && (
                <div className={css({ mb: '8' })}>
                    <FeaturedTrio recipes={heroRecipes} categoryColor="#f97316" />
                </div>
            )}
            <article className={articleProseClass}>{mdxContent}</article>
        </div>
    );
}
