'use client';

import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getRandomFilteredRecipe } from '@app/app/actions/category';
import type { RecipeCardData } from '@app/app/actions/recipes';
import { SmartImage } from '@app/components/atoms/SmartImage';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface RandomRecipeSpotlightProps {
    categorySlug?: string;
    tagSlugs?: string[];
}

function SkeletonSpotlight() {
    return (
        <div
            className={css({
                borderRadius: '2xl',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #ede7f6, #d1c4e9)',
                p: '4',
                display: 'flex',
                gap: '4',
                alignItems: 'center',
                minH: '100px',
            })}
        >
            <div
                className={css({
                    width: '80px',
                    height: '80px',
                    borderRadius: 'xl',
                    flexShrink: 0,
                    bg: 'rgba(255,255,255,0.35)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                })}
            />
            <div className={css({ flex: 1, display: 'flex', flexDirection: 'column', gap: '2' })}>
                <div
                    className={css({
                        h: '12px',
                        w: '40%',
                        borderRadius: 'md',
                        bg: 'rgba(255,255,255,0.35)',
                        animation: 'pulse 1.5s ease-in-out infinite',
                    })}
                />
                <div
                    className={css({
                        h: '16px',
                        w: '70%',
                        borderRadius: 'md',
                        bg: 'rgba(255,255,255,0.45)',
                        animation: 'pulse 1.5s ease-in-out infinite',
                    })}
                />
                <div
                    className={css({
                        h: '10px',
                        w: '55%',
                        borderRadius: 'md',
                        bg: 'rgba(255,255,255,0.3)',
                        animation: 'pulse 1.5s ease-in-out infinite',
                    })}
                />
            </div>
            <div
                className={css({
                    width: '72px',
                    height: '36px',
                    borderRadius: 'lg',
                    flexShrink: 0,
                    bg: 'rgba(255,255,255,0.35)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                })}
            />
        </div>
    );
}

export function RandomRecipeSpotlight({ categorySlug, tagSlugs }: RandomRecipeSpotlightProps) {
    const [recipe, setRecipe] = useState<RecipeCardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [spinning, setSpinning] = useState(false);

    async function loadRandom() {
        setSpinning(true);
        try {
            const result = await getRandomFilteredRecipe({ categorySlug, tagSlugs });
            setRecipe(result);
        } catch {
            // silently fail — no recipe shown
        } finally {
            setLoading(false);
            setSpinning(false);
        }
    }

    useEffect(() => {
        loadRandom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categorySlug, tagSlugs?.join('|')]);

    if (loading) return <SkeletonSpotlight />;
    if (!recipe) return null;

    return (
        <div
            className={css({
                borderRadius: '2xl',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #ede7f6, #d1c4e9)',
                p: '4',
            })}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, x: 30, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -30, scale: 0.97 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={flex({
                        direction: { base: 'column', sm: 'row' },
                        align: { base: 'flex-start', sm: 'center' },
                        gap: '4',
                    })}
                >
                    {/* Image or dice placeholder */}
                    <div
                        className={css({
                            width: { base: '100%', sm: '80px' },
                            height: { base: '120px', sm: '80px' },
                            borderRadius: 'xl',
                            overflow: 'hidden',
                            flexShrink: 0,
                            position: 'relative',
                            bg: 'rgba(255,255,255,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                        })}
                    >
                        {recipe.imageKey ? (
                            <SmartImage
                                imageKey={recipe.imageKey}
                                recipeId={recipe.id}
                                alt={recipe.title}
                                aspect="1:1"
                                sizes="80px"
                                fill
                                className={css({
                                    objectFit: 'cover',
                                    width: '100%',
                                    height: '100%',
                                })}
                            />
                        ) : (
                            '🎲'
                        )}
                    </div>

                    {/* Recipe info */}
                    <div className={css({ flex: 1, minW: 0 })}>
                        <div
                            className={css({
                                fontSize: '0.65rem',
                                fontWeight: '600',
                                color: '#7c3aed',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                mb: '1',
                            })}
                        >
                            Zufaelliger Fund
                        </div>
                        <Link
                            href={`/recipe/${recipe.slug}`}
                            className={css({
                                fontSize: { base: 'md', sm: 'lg' },
                                fontWeight: '700',
                                color: '#3b0764',
                                textDecoration: 'none',
                                lineHeight: '1.3',
                                overflow: 'hidden',
                                display: '-webkit-box',
                                lineClamp: '2',
                                mb: '1.5',
                                _hover: { textDecoration: 'underline' },
                            })}
                        >
                            {recipe.title}
                        </Link>
                        <div
                            className={flex({
                                align: 'center',
                                gap: '3',
                                wrap: 'wrap',
                            })}
                        >
                            {recipe.rating > 0 && (
                                <span
                                    className={css({
                                        fontSize: '0.72rem',
                                        color: '#7c3aed',
                                        fontWeight: '600',
                                    })}
                                >
                                    ★ {recipe.rating.toFixed(1)}
                                </span>
                            )}
                            <span className={css({ fontSize: '0.72rem', color: '#5b21b6' })}>
                                {recipe.time}
                            </span>
                            {recipe.difficulty && (
                                <span className={css({ fontSize: '0.72rem', color: '#5b21b6' })}>
                                    {recipe.difficulty}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Refresh button */}
                    <button
                        onClick={loadRandom}
                        disabled={spinning}
                        className={css({
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5',
                            px: '3',
                            py: '2',
                            borderRadius: 'lg',
                            border: '2px solid #7c3aed',
                            bg: 'white',
                            color: '#7c3aed',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 180ms ease',
                            _hover: { bg: '#7c3aed', color: 'white' },
                            _disabled: { opacity: 0.6, cursor: 'not-allowed' },
                            alignSelf: { base: 'flex-end', sm: 'center' },
                        })}
                        aria-label="Neues zufaelliges Rezept laden"
                    >
                        {spinning ? (
                            <Loader2
                                size={14}
                                className={css({ animation: 'spin 0.7s linear infinite' })}
                            />
                        ) : (
                            '🎲'
                        )}
                        Neues
                    </button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
