'use client';

import { Star } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';

import { categoryColors } from '@app/components/features/RecipeCard';
import { css } from 'styled-system/css';

import type { Recipe } from '../data';

import { RecipeMetaStats } from './RecipeMetaStats';

type StarBurst = {
    id: number;
    starIndex: number;
    sparks: Array<{
        id: number;
        x: string;
        y: string;
        dx: number;
        dy: number;
        color: string;
        size: number;
        duration: number;
        delay: number;
    }>;
};

type RecipeSummaryCardProps = {
    recipe: Recipe;
    categoryHref: string;
    isDraft: boolean;
    starValues: readonly number[];
    activeStarValue: number;
    isRatingPending: boolean;
    ratingCount: number;
    averageRating: number;
    starBursts: StarBurst[];
    onTagClick: (tag: string) => void;
    onRatingSelect: (value: number) => void;
};

export function RecipeSummaryCard({
    recipe,
    categoryHref,
    isDraft,
    starValues,
    activeStarValue,
    isRatingPending,
    ratingCount,
    averageRating,
    starBursts,
    onTagClick,
    onRatingSelect,
}: RecipeSummaryCardProps) {
    return (
        <div
            className={css({
                bg: 'surface',
                borderRadius: '2xl',
                p: '5',
                boxShadow: 'shadow.medium',
                mb: '4',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3',
                    flexWrap: 'wrap',
                    fontSize: 'sm',
                    fontFamily: 'body',
                    color: 'text-muted',
                    mb: '3',
                })}
            >
                <Link
                    href={categoryHref}
                    className={css({
                        textDecoration: 'none',
                        _hover: { opacity: 0.85 },
                    })}
                >
                    <span
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: '2.5',
                            py: '0.5',
                            fontSize: 'xs',
                            fontWeight: '600',
                            borderRadius: 'full',
                            fontFamily: 'body',
                            color: 'white',
                            transition: 'opacity 150ms',
                        })}
                        style={{
                            backgroundColor:
                                recipe.categoryColor ||
                                categoryColors[recipe.category] ||
                                '#e07b53',
                        }}
                    >
                        {recipe.category}
                    </span>
                </Link>
                <span>{recipe.difficulty}</span>
            </div>

            <p
                className={css({
                    fontFamily: 'body',
                    color: 'text',
                    lineHeight: 'relaxed',
                    fontSize: { base: 'md', md: 'lg' },
                    mb: '3',
                })}
            >
                {recipe.description}
            </p>

            {recipe.tags.length > 0 && (
                <div
                    className={css({
                        display: 'flex',
                        gap: '2',
                        flexWrap: 'wrap',
                        mb: '3',
                    })}
                >
                    {recipe.tags.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => onTagClick(tag)}
                            className={css({
                                fontSize: 'xs',
                                color: 'text-muted',
                                fontFamily: 'body',
                                cursor: 'pointer',
                                px: '2.5',
                                py: '1',
                                borderRadius: 'full',
                                bg: 'light',
                                transition: 'all 150ms ease',
                                _hover: { color: 'primary' },
                            })}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

            <div className={css({ h: '1px', bg: 'border', mb: '3' })} />

            <RecipeMetaStats prepTime={recipe.prepTime} cookTime={recipe.cookTime} />

            {!isDraft && <div className={css({ h: '1px', bg: 'border', mb: '3' })} />}
            {!isDraft && (
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5',
                        mb: '3',
                    })}
                >
                    {starValues.map((value) => (
                        <div
                            key={value}
                            style={{
                                position: 'relative',
                                display: 'inline-flex',
                                overflow: 'visible',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => onRatingSelect(value)}
                                disabled={isRatingPending}
                                className={css({
                                    padding: 0,
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    transition: 'transform 150ms ease',
                                    _hover: { transform: 'scale(1.2)' },
                                    display: 'inline-flex',
                                })}
                            >
                                <Star
                                    size={22}
                                    fill={
                                        value <= activeStarValue
                                            ? 'var(--colors-palette-gold, #d9ad36)'
                                            : 'none'
                                    }
                                    className={css({
                                        color:
                                            value <= activeStarValue
                                                ? 'palette.gold'
                                                : 'text-muted',
                                        opacity: value <= activeStarValue ? 1 : 0.35,
                                    })}
                                />
                            </button>
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    pointerEvents: 'none',
                                    overflow: 'visible',
                                    zIndex: 10,
                                }}
                            >
                                <AnimatePresence>
                                    {starBursts
                                        .filter((burst) => burst.starIndex === value)
                                        .map((burst) =>
                                            burst.sparks.map((spark) => (
                                                <motion.div
                                                    key={`${burst.id}-${spark.id}`}
                                                    style={{
                                                        position: 'absolute',
                                                        left: spark.x,
                                                        top: spark.y,
                                                        width: spark.size,
                                                        height: spark.size,
                                                        borderRadius: '50%',
                                                        background: spark.color,
                                                        boxShadow: `0 0 ${spark.size * 2}px ${spark.color}`,
                                                        translateX: '-50%',
                                                        translateY: '-50%',
                                                    }}
                                                    initial={{
                                                        opacity: 1,
                                                        x: 0,
                                                        y: 0,
                                                        scale: 1,
                                                    }}
                                                    animate={{
                                                        x: spark.dx,
                                                        y: spark.dy,
                                                        opacity: [1, 1, 0],
                                                        scale: [1, 1.4, 0],
                                                    }}
                                                    transition={{
                                                        duration: spark.duration,
                                                        delay: spark.delay,
                                                        ease: 'easeOut',
                                                        opacity: { times: [0, 0.35, 1] },
                                                        scale: { times: [0, 0.25, 1] },
                                                    }}
                                                />
                                            )),
                                        )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ))}
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'text-muted',
                            fontFamily: 'body',
                            ml: '1',
                        })}
                    >
                        {ratingCount > 0
                            ? `${averageRating.toFixed(1)} (${ratingCount})`
                            : 'Bewerten'}
                    </span>
                </div>
            )}
        </div>
    );
}
