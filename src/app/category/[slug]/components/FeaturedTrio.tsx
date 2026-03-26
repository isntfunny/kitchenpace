import { motion } from 'motion/react';
import Link from 'next/link';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { SmartImage } from '@app/components/atoms/SmartImage';

import { css } from 'styled-system/css';

interface FeaturedTrioProps {
    recipes: RecipeCardData[];
    categoryColor: string;
}

function formatRating(rating: number): string {
    if (!rating) return '';
    return `★ ${rating.toFixed(1)}`;
}

export function FeaturedTrio({ recipes, categoryColor }: FeaturedTrioProps) {
    if (recipes.length === 0) return null;

    const displayed = recipes.slice(0, 3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className={css({
                display: 'grid',
                gridTemplateColumns: {
                    base: 'repeat(3, minmax(140px, 1fr))',
                    xs: 'repeat(3, minmax(140px, 1fr))',
                },
                gap: '3',
                overflowX: { base: 'auto', sm: 'visible' },
                pb: { base: '2', sm: '0' },
                scrollSnapType: { base: 'x mandatory', sm: 'none' },
                // Allow horizontal scroll on very small screens
                '@media (max-width: 480px)': {
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                },
            })}
        >
            {displayed.map((recipe, i) => (
                <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.35 }}
                    className={css({
                        scrollSnapAlign: 'start',
                        flexShrink: 0,
                        '@media (max-width: 480px)': {
                            width: '140px',
                        },
                    })}
                >
                    <Link
                        href={`/recipe/${recipe.slug}`}
                        className={css({
                            display: 'block',
                            position: 'relative',
                            borderRadius: 'xl',
                            overflow: 'hidden',
                            height: { base: '120px', sm: '180px' },
                            textDecoration: 'none',
                            cursor: 'pointer',
                            _hover: {
                                transform: 'scale(1.02)',
                                transition: 'transform 200ms ease',
                            },
                            transition: 'transform 200ms ease',
                        })}
                    >
                        {/* Background image or gradient */}
                        <div
                            className={css({
                                position: 'absolute',
                                inset: 0,
                            })}
                            style={{
                                background: `linear-gradient(135deg, ${categoryColor}cc, ${categoryColor}88)`,
                            }}
                        >
                            {recipe.imageKey && (
                                <SmartImage
                                    imageKey={recipe.imageKey}
                                    recipeId={recipe.id}
                                    alt={recipe.title}
                                    aspect="3:4"
                                    sizes="(max-width: 480px) 140px, (max-width: 768px) 33vw, 280px"
                                    fill
                                    className={css({
                                        objectFit: 'cover',
                                        width: '100%',
                                        height: '100%',
                                    })}
                                />
                            )}
                        </div>

                        {/* Dark overlay for text readability */}
                        <div
                            className={css({
                                position: 'absolute',
                                inset: 0,
                                background:
                                    'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.75) 100%)',
                                zIndex: 1,
                            })}
                        />

                        {/* Cook count badge — top left */}
                        {(recipe.cookCount ?? 0) > 0 && (
                            <div
                                className={css({
                                    position: 'absolute',
                                    top: '6px',
                                    left: '6px',
                                    zIndex: 2,
                                    bg: 'rgba(0,0,0,0.55)',
                                    backdropFilter: 'blur(6px)',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    fontWeight: '600',
                                    px: '2',
                                    py: '0.5',
                                    borderRadius: 'full',
                                    lineHeight: '1.4',
                                    whiteSpace: 'nowrap',
                                })}
                            >
                                🍳 {recipe.cookCount}x
                            </div>
                        )}

                        {/* Bottom info */}
                        <div
                            className={css({
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                zIndex: 2,
                                px: '2.5',
                                py: '2',
                            })}
                        >
                            <div
                                className={css({
                                    fontSize: { base: '0.7rem', sm: '0.8rem' },
                                    fontWeight: '700',
                                    color: 'white',
                                    lineHeight: '1.3',
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    lineClamp: '2',
                                    mb: '1',
                                })}
                            >
                                {recipe.title}
                            </div>
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.5',
                                    flexWrap: 'wrap',
                                })}
                            >
                                {recipe.rating > 0 && (
                                    <span
                                        className={css({
                                            fontSize: '0.6rem',
                                            color: 'rgba(255,220,80,1)',
                                            fontWeight: '600',
                                        })}
                                    >
                                        {formatRating(recipe.rating)}
                                    </span>
                                )}
                                <span
                                    className={css({
                                        fontSize: '0.6rem',
                                        color: 'rgba(255,255,255,0.8)',
                                    })}
                                >
                                    {recipe.time}
                                </span>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            ))}
        </motion.div>
    );
}
