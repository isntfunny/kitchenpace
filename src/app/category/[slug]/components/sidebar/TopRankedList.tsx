import { Star } from 'lucide-react';
import Link from 'next/link';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { SmartImage } from '@app/components/atoms/SmartImage';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TopRankedListProps {
    recipes: RecipeCardData[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TopRankedList({ recipes }: TopRankedListProps) {
    if (recipes.length === 0) return null;

    return (
        <div
            className={css({
                bg: 'surface.card',
                border: '1px solid',
                borderColor: 'border',
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                overflow: 'hidden',
            })}
        >
            <div
                className={css({
                    px: '4',
                    py: '3',
                    borderBottom: '1px solid',
                    borderColor: 'border',
                    fontWeight: '600',
                    fontSize: 'sm',
                    color: 'text.primary',
                })}
            >
                Top 5 Rezepte
            </div>
            <div className={flex({ direction: 'column', gap: '0' })}>
                {recipes.slice(0, 5).map((recipe, i) => (
                    <Link
                        key={recipe.id}
                        href={`/recipe/${recipe.slug}`}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                            px: '4',
                            py: '2.5',
                            borderBottom:
                                i < Math.min(recipes.length, 5) - 1 ? '1px solid' : 'none',
                            borderColor: 'border',
                            textDecoration: 'none',
                            transition: 'background 0.15s',
                            _hover: { bg: 'surface.hover' },
                        })}
                    >
                        {/* Rank number */}
                        <span
                            className={css({
                                fontSize: 'xs',
                                fontWeight: '700',
                                color: 'text.tertiary',
                                w: '4',
                                flexShrink: '0',
                                textAlign: 'center',
                            })}
                        >
                            {i + 1}
                        </span>

                        {/* Thumbnail */}
                        <div
                            className={css({
                                w: '8',
                                h: '8',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                flexShrink: '0',
                                bg: 'surface.subtle',
                            })}
                        >
                            <SmartImage
                                imageKey={recipe.imageKey}
                                alt={recipe.title}
                                aspect="1:1"
                                sizes="32px"
                                width={32}
                                height={32}
                            />
                        </div>

                        {/* Title + meta */}
                        <div
                            className={flex({
                                direction: 'column',
                                gap: '0.5',
                                flex: '1',
                                minW: '0',
                            })}
                        >
                            <span
                                className={css({
                                    fontSize: 'sm',
                                    fontWeight: '500',
                                    color: 'text.primary',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                })}
                            >
                                {recipe.title}
                            </span>
                            <div
                                className={flex({
                                    align: 'center',
                                    gap: '1',
                                })}
                            >
                                <Star
                                    size={10}
                                    className={css({ color: '#f59e0b', fill: '#f59e0b' })}
                                />
                                <span
                                    className={css({
                                        fontSize: 'xs',
                                        color: 'text.secondary',
                                    })}
                                >
                                    {recipe.rating.toFixed(1)}
                                    {recipe.ratingCount != null && recipe.ratingCount > 0 && (
                                        <> &middot; {recipe.ratingCount}x</>
                                    )}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
