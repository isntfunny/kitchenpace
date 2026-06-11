import Link from 'next/link';

import { RecipeCard } from '@app/components/features/RecipeCard';
import type { KeywordLandingData } from '@app/lib/keyword-landing';
import { KEYWORD_LANDING_LIMIT } from '@app/lib/keyword-landing';

import { css } from 'styled-system/css';

type Props = {
    data: KeywordLandingData;
    /** Rendered as the page h1, e.g. "Pasta Rezepte" or "Rezepte mit Kürbis" */
    heading: string;
    intro: string;
    /** Link target for browsing all matching recipes in the filter search */
    searchHref: string;
};

export function KeywordLandingContent({ data, heading, intro, searchHref }: Props) {
    const hasMore = data.totalCount > KEYWORD_LANDING_LIMIT;

    return (
        <div className={css({ maxW: '1200px', mx: 'auto', px: '4', py: '8' })}>
            <header className={css({ mb: '8' })}>
                <h1
                    className={css({
                        fontFamily: 'heading',
                        fontSize: { base: '3xl', md: '4xl' },
                        fontWeight: 'bold',
                        mb: '3',
                    })}
                >
                    {heading}
                </h1>
                <p className={css({ color: 'text-muted', fontSize: 'lg', maxW: '720px' })}>
                    {intro}
                </p>
            </header>

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
                {data.recipes.map((recipe) => (
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

            {hasMore && (
                <div className={css({ mt: '10', textAlign: 'center' })}>
                    <Link
                        href={searchHref}
                        className={css({
                            display: 'inline-block',
                            px: '6',
                            py: '3',
                            borderRadius: 'full',
                            bg: 'primary',
                            color: 'white',
                            fontWeight: 'semibold',
                            _hover: { opacity: 0.9 },
                        })}
                    >
                        Alle {data.totalCount} Rezepte in der Suche ansehen
                    </Link>
                </div>
            )}
        </div>
    );
}
