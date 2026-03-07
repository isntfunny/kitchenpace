'use client';

import { Clock, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { css, cx } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import { Badge } from '../atoms/Badge';
import { SmartImage } from '../atoms/SmartImage';

// ---------------------------------------------------------------------------
// Shared category color map (used by badge overlays and hover effects)
// ---------------------------------------------------------------------------

export const categoryColors: Record<string, string> = {
    Hauptgericht: '#e07b53',
    Beilage: '#00b894',
    Dessert: '#fd79a8',
    Frühstück: '#fdcb6e',
    Getränk: '#74b9ff',
    Vorspeise: '#a29bfe',
    Fingerfood: '#e17055',
    Brunch: '#fab1a0',
};

// ---------------------------------------------------------------------------
// Data shape — superset of all card consumers
// ---------------------------------------------------------------------------

export interface RecipeCardRecipe {
    id: string;
    slug: string;
    title: string;
    image: string | null;
    category: string;
    categorySlug?: string;
    rating?: number;
    time?: string;
    description?: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecipeCardProps {
    recipe: RecipeCardRecipe;
    /** "default" — full grid card; "compact" — small horizontal scroll item */
    variant?: 'default' | 'compact';
    /** Show category badge on image with colored background (default: false — shows in content) */
    categoryOnImage?: boolean;
    /** Make category badge a clickable link (requires categorySlug) */
    categoryLink?: boolean;
    /** Hide category badge entirely */
    hideCategory?: boolean;
    /** Show 5-star visual rating instead of single star + number */
    starRating?: boolean;
    /** Extra content rendered after the card footer (e.g. "Saved X ago" row) */
    footer?: ReactNode;
    /** Extra overlay on the image (e.g. status icon, time badge) */
    imageOverlay?: ReactNode;
    className?: string;
}

// ---------------------------------------------------------------------------
// Star rating sub-component
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
    return (
        <div className={css({ display: 'flex', gap: '1', alignItems: 'center' })}>
            <div className={css({ display: 'flex', gap: '0.5' })}>
                {[1, 2, 3, 4, 5].map((v) => (
                    <Star
                        key={v}
                        size={14}
                        className={css({
                            color: v <= Math.floor(rating) ? '#f8b500' : '#e0e0e0',
                        })}
                    />
                ))}
            </div>
            <span className={css({ fontSize: 'xs', color: 'text-muted' })}>{rating}</span>
        </div>
    );
}

function SingleStar({ rating }: { rating: number }) {
    return (
        <span className={flex({ align: 'center', gap: '1' })}>
            <Star size={14} className={css({ color: '#f8b500' })} />
            <span>{rating}</span>
        </span>
    );
}

// ---------------------------------------------------------------------------
// Category badge rendered on image overlay
// ---------------------------------------------------------------------------

function CategoryOverlay({
    recipe,
    link,
}: {
    recipe: RecipeCardRecipe;
    link?: boolean;
}) {
    const router = useRouter();
    const color = categoryColors[recipe.category] || '#e07b53';

    const badgeStyle = css({
        position: 'absolute',
        top: '2',
        left: '2',
        background: color,
        color: 'white',
        padding: '2px 10px',
        borderRadius: 'full',
        fontSize: '0.7rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 'wide',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        border: 'none',
        cursor: link ? 'pointer' : 'default',
        transition: 'all 150ms ease',
        _hover: link ? { opacity: 0.85, transform: 'scale(1.05)' } : {},
    });

    if (link && recipe.categorySlug) {
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    router.push(`/category/${recipe.categorySlug}`);
                }}
                className={badgeStyle}
            >
                {recipe.category}
            </button>
        );
    }

    return <span className={badgeStyle}>{recipe.category}</span>;
}

// ---------------------------------------------------------------------------
// RecipeCard
// ---------------------------------------------------------------------------

export function RecipeCard({
    recipe,
    variant = 'default',
    categoryOnImage = false,
    categoryLink = false,
    hideCategory = false,
    starRating = false,
    footer,
    imageOverlay,
    className,
}: RecipeCardProps) {
    const isCompact = variant === 'compact';
    const color = categoryColors[recipe.category] || '#e07b53';

    const card = (
        <div
            className={cx(
                css({
                    bg: 'surface.elevated',
                    borderRadius: 'xl',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'rgba(0,0,0,0.06)',
                    transition: 'all 200ms ease',
                    cursor: 'pointer',
                    _hover: {
                        transform: 'translateY(-4px)',
                        borderColor: color,
                        boxShadow: `0 12px 28px ${color}20`,
                    },
                }),
                isCompact && css({ flex: '0 0 auto', width: '200px' }),
                className,
            )}
        >
            {/* Image */}
            <div
                className={css({
                    position: 'relative',
                    aspectRatio: isCompact ? '16/10' : '16/10',
                    overflow: 'hidden',
                })}
            >
                <SmartImage
                    src={recipe.image ?? undefined}
                    alt={recipe.title}
                    fill
                    recipeId={recipe.id}
                    className={css({ objectFit: 'cover' })}
                />
                {!hideCategory && categoryOnImage && (
                    <CategoryOverlay recipe={recipe} link={categoryLink} />
                )}
                {imageOverlay}
            </div>

            {/* Content */}
            <div className={css({ p: isCompact ? '3' : '4' })}>
                {!hideCategory && !categoryOnImage && (
                    <div className={css({ mb: '2' })}>
                        <Badge>{recipe.category}</Badge>
                    </div>
                )}

                <h4
                    className={css({
                        fontWeight: isCompact ? '600' : '700',
                        fontFamily: 'heading',
                        color: 'text',
                        fontSize: isCompact ? 'sm' : 'base',
                        lineHeight: 'tight',
                        lineClamp: isCompact ? 1 : 2,
                        mb: isCompact ? '1' : undefined,
                    })}
                >
                    {recipe.title}
                </h4>

                {!isCompact && recipe.description && (
                    <p
                        className={css({
                            fontFamily: 'body',
                            fontSize: 'sm',
                            color: 'text-muted',
                            mt: '1',
                            lineClamp: 2,
                            lineHeight: '1.5',
                        })}
                    >
                        {recipe.description}
                    </p>
                )}

                {/* Meta row */}
                <div
                    className={flex({
                        justify: 'space-between',
                        align: 'center',
                        mt: isCompact ? undefined : '3',
                        fontFamily: 'body',
                        fontSize: isCompact ? '0.75rem' : 'sm',
                        color: 'text-muted',
                    })}
                >
                    {recipe.rating != null && recipe.rating > 0 && (
                        starRating ? (
                            <StarRating rating={recipe.rating} />
                        ) : (
                            <SingleStar rating={recipe.rating} />
                        )
                    )}
                    {recipe.time && (
                        <span className={flex({ align: 'center', gap: '1' })}>
                            {isCompact ? null : <Clock size={14} className={css({ color: '#636e72' })} />}
                            {recipe.time}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );

    if (footer) {
        return (
            <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
                <Link href={`/recipe/${recipe.slug}`} className={css({ textDecoration: 'none', color: 'inherit' })}>
                    {card}
                </Link>
                {footer}
            </div>
        );
    }

    return (
        <Link href={`/recipe/${recipe.slug}`} className={css({ textDecoration: 'none', color: 'inherit' })}>
            {card}
        </Link>
    );
}
