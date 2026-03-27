'use client';

import { Star, Trophy } from 'lucide-react';
import Link from 'next/link';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { Heading } from '@app/components/atoms/Typography';

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
                p: 'card',
                bg: 'surface',
                borderRadius: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div className={css({ mb: '2' })}>
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: { base: '#e17055', _dark: '#fab1a0' },
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    })}
                >
                    <Trophy size={18} />
                    <span>Top 5 Rezepte</span>
                </Heading>
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
                            py: '2',
                            borderRadius: 'lg',
                            textDecoration: 'none',
                            transition: 'background 0.15s',
                            _hover: { bg: 'surface.muted' },
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
                                    {recipe.rating > 0 ? recipe.rating.toFixed(1) : '—'}
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
