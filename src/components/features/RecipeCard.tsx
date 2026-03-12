'use client';

import { ChefHat, Clock, ListOrdered, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { PALETTE } from '@app/lib/palette';
import { css, cx } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import { Badge } from '../atoms/Badge';
import { SmartImage } from '../atoms/SmartImage';

// ---------------------------------------------------------------------------
// Shared category color map (used by badge overlays and hover effects)
// ---------------------------------------------------------------------------

export const categoryColors: Record<string, string> = {
    Hauptgericht: PALETTE.orange,
    Beilage: PALETTE.emerald,
    Dessert: PALETTE.pink,
    Frühstück: PALETTE.gold,
    Getränk: PALETTE.blue,
    Vorspeise: PALETTE.purple,
    Fingerfood: PALETTE.orange,
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
    categoryColor?: string;
    rating?: number;
    time?: string;
    description?: string;
    stepCount?: number;
    difficulty?: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecipeCardProps {
    recipe: RecipeCardRecipe;
    /** "default" — full grid card; "compact" — small horizontal scroll item; "list" — full-width horizontal row */
    variant?: 'default' | 'compact' | 'list';
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
                            color: v <= Math.floor(rating) ? 'palette.gold' : '#e0e0e0',
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
            <Star size={14} className={css({ color: 'palette.gold' })} />
            <span>{rating}</span>
        </span>
    );
}

// ---------------------------------------------------------------------------
// Category badge rendered on image overlay
// ---------------------------------------------------------------------------

function CategoryOverlay({ recipe, link }: { recipe: RecipeCardRecipe; link?: boolean }) {
    const router = useRouter();
    const color = recipe.categoryColor || categoryColors[recipe.category] || PALETTE.orange;

    const badgeStyle = css({
        position: 'absolute',
        top: '2',
        left: '2',
        color: 'white',
        padding: '2px 10px',
        borderRadius: 'full',
        fontSize: '0.7rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 'wide',
        boxShadow: { base: '0 2px 8px rgba(0,0,0,0.2)', _dark: '0 2px 8px rgba(0,0,0,0.5)' },
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
                style={{ background: color }}
            >
                {recipe.category}
            </button>
        );
    }

    return (
        <span className={badgeStyle} style={{ background: color }}>
            {recipe.category}
        </span>
    );
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
    const isList = variant === 'list';
    const color = recipe.categoryColor || categoryColors[recipe.category] || PALETTE.orange;

    if (isList) {
        const listCard = (
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
                        display: 'flex',
                        flexDirection: 'row',
                        _hover: {
                            borderColor: color,
                            boxShadow: `0 4px 16px ${color}18`,
                        },
                    }),
                    className,
                )}
            >
                <div
                    className={css({
                        position: 'relative',
                        flexShrink: '0',
                        width: '120px',
                        aspectRatio: '4/3',
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
                    {imageOverlay}
                </div>

                {/* Center: category + title + description */}
                <div
                    className={css({
                        flex: '1',
                        minWidth: '0',
                        px: '3.5',
                        py: '3',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '1',
                    })}
                >
                    {!hideCategory && (
                        <div className={css({ alignSelf: 'flex-start' })}>
                            <Badge>{recipe.category}</Badge>
                        </div>
                    )}
                    <h4
                        className={css({
                            fontWeight: '700',
                            fontFamily: 'heading',
                            color: 'text',
                            fontSize: 'sm',
                            lineHeight: 'tight',
                            lineClamp: 1,
                        })}
                    >
                        {recipe.title}
                    </h4>
                    {recipe.description && (
                        <p
                            className={css({
                                fontSize: 'xs',
                                color: 'text-muted',
                                lineClamp: 1,
                                lineHeight: '1.4',
                            })}
                        >
                            {recipe.description}
                        </p>
                    )}
                </div>

                {/* Right: meta column */}
                <div
                    className={css({
                        flexShrink: '0',
                        px: '3.5',
                        py: '3',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        gap: '2',
                        borderLeft: '1px solid',
                        borderColor: 'rgba(255,255,255,0.05)',
                        minWidth: '110px',
                    })}
                >
                    <span
                        className={flex({
                            align: 'center',
                            gap: '1',
                            fontSize: 'xs',
                            color: 'text-muted',
                        })}
                    >
                        <Star size={12} className={css({ color: 'palette.gold' })} />
                        {recipe.rating != null && recipe.rating > 0 ? recipe.rating : '—'}
                    </span>
                    {recipe.time && (
                        <span
                            className={flex({
                                align: 'center',
                                gap: '1',
                                fontSize: 'xs',
                                color: 'text-muted',
                            })}
                        >
                            <Clock size={12} />
                            {recipe.time}
                        </span>
                    )}
                    {recipe.stepCount != null && (
                        <span
                            className={flex({
                                align: 'center',
                                gap: '1',
                                fontSize: 'xs',
                                color: 'text-muted',
                            })}
                        >
                            <ListOrdered size={12} />
                            {recipe.stepCount}
                        </span>
                    )}
                    {recipe.difficulty && (
                        <span
                            className={flex({
                                align: 'center',
                                gap: '1',
                                fontSize: 'xs',
                                color: 'text-muted',
                            })}
                        >
                            <ChefHat size={12} />
                            {recipe.difficulty}
                        </span>
                    )}
                </div>
            </div>
        );

        if (footer) {
            return (
                <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
                    <Link
                        href={`/recipe/${recipe.slug}`}
                        className={css({ textDecoration: 'none', color: 'inherit' })}
                    >
                        {listCard}
                    </Link>
                    {footer}
                </div>
            );
        }

        return (
            <Link
                href={`/recipe/${recipe.slug}`}
                className={css({ textDecoration: 'none', color: 'inherit' })}
            >
                {listCard}
            </Link>
        );
    }

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
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
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
            <div
                className={css({
                    p: isCompact ? '3' : '4',
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                })}
            >
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
                        mt: 'auto',
                        pt: isCompact ? undefined : '3',
                        fontFamily: 'body',
                        fontSize: isCompact ? '0.75rem' : 'sm',
                        color: 'text-muted',
                    })}
                >
                    {starRating ? (
                        recipe.rating != null && recipe.rating > 0 ? (
                            <StarRating rating={recipe.rating} />
                        ) : (
                            <span className={flex({ align: 'center', gap: '1' })}>
                                <Star size={14} className={css({ color: 'palette.gold' })} />
                                <span className={css({ fontSize: 'xs', color: 'text-muted' })}>
                                    —
                                </span>
                            </span>
                        )
                    ) : recipe.rating != null && recipe.rating > 0 ? (
                        <SingleStar rating={recipe.rating} />
                    ) : (
                        <span className={flex({ align: 'center', gap: '1' })}>
                            <Star size={14} className={css({ color: 'palette.gold' })} />
                            <span>—</span>
                        </span>
                    )}
                    {!isCompact && recipe.stepCount != null && (
                        <span className={flex({ align: 'center', gap: '1' })}>
                            <ListOrdered size={14} className={css({ color: 'foreground.muted' })} />
                            {recipe.stepCount}
                        </span>
                    )}
                    {recipe.time && (
                        <span className={flex({ align: 'center', gap: '1' })}>
                            {isCompact ? null : (
                                <Clock size={14} className={css({ color: 'foreground.muted' })} />
                            )}
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
                <Link
                    href={`/recipe/${recipe.slug}`}
                    className={css({ textDecoration: 'none', color: 'inherit' })}
                >
                    {card}
                </Link>
                {footer}
            </div>
        );
    }

    return (
        <Link
            href={`/recipe/${recipe.slug}`}
            className={css({ textDecoration: 'none', color: 'inherit' })}
        >
            {card}
        </Link>
    );
}
