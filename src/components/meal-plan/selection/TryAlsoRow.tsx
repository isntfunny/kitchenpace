'use client';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { RecipeCard, type RecipeCardSelection } from '@app/components/features/RecipeCard';
import { RecipeCardSkeleton } from '@app/components/features/RecipeCardSkeleton';

import { css } from 'styled-system/css';

type TryAlsoRowProps = {
    /** null while loading */
    cards: RecipeCardData[] | null;
    renderSelection: (recipe: RecipeCardData) => RecipeCardSelection | undefined;
};

const track = css({
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: { base: '78%', sm: '46%', lg: '30%' },
    gap: '4',
    overflowX: 'auto',
    scrollSnapType: 'x mandatory',
    pb: '2',
    '& > *': { scrollSnapAlign: 'start' },
});

/** "Probier auch mal": well rated main dishes far from the usual, scrolling sideways. */
export function TryAlsoRow({ cards, renderSelection }: TryAlsoRowProps) {
    if (cards && cards.length === 0) return null;
    return (
        <section aria-labelledby="try-also-title" className={css({ mt: '6' })}>
            <div className={css({ display: 'flex', alignItems: 'baseline', gap: '3', mb: '3' })}>
                <h3 id="try-also-title" className={css({ fontSize: 'lg', fontWeight: '700' })}>
                    Probier auch mal
                </h3>
                <span className={css({ fontSize: 'sm', color: 'text.muted' })}>
                    Gut bewertet, weit weg von deinem Üblichen
                </span>
            </div>
            <div className={track}>
                {cards
                    ? cards.map((recipe) => (
                          <RecipeCard
                              key={recipe.id}
                              recipe={recipe}
                              categoryOnImage
                              selection={renderSelection(recipe)}
                          />
                      ))
                    : Array.from({ length: 3 }).map((_, index) => (
                          <RecipeCardSkeleton key={index} />
                      ))}
            </div>
        </section>
    );
}
