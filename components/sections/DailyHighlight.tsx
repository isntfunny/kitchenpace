'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { css } from 'styled-system/css';

import { Heading, Text } from '../atoms/Typography';
import { getFeaturedRecipe, type RecipeCardData } from '../features/actions';

export function DailyHighlight() {
    const [recipe, setRecipe] = useState<RecipeCardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getFeaturedRecipe().then((data) => {
            setRecipe(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <section
                className={css({
                    p: '5',
                    borderRadius: '2xl',
                    bg: '#fffcf9',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    minH: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                })}
            >
                Lädt...
            </section>
        );
    }

    if (!recipe) {
        return (
            <section
                className={css({
                    p: '5',
                    borderRadius: '2xl',
                    bg: '#fffcf9',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                })}
            >
                <div
                    className={css({
                        borderRadius: '2xl',
                        overflow: 'hidden',
                    })}
                >
                    <div
                        className={css({
                            position: 'relative',
                            aspectRatio: '16/9',
                            borderRadius: '2xl',
                            overflow: 'hidden',
                        })}
                    >
                        <Image
                            src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"
                            alt="Daily Highlight"
                            fill
                            sizes="(max-width: 768px) 100vw, 600px"
                            className={css({ objectFit: 'cover' })}
                        />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            className={css({
                p: '5',
                borderRadius: '2xl',
                bg: '#fffcf9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <a href={`/recipe/${recipe.id}`} className={css({ textDecoration: 'none' })}>
                <div
                    className={css({
                        borderRadius: '2xl',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 200ms ease',
                        _hover: { transform: 'scale(1.01)' },
                    })}
                >
                    <div
                        className={css({
                            position: 'relative',
                            aspectRatio: '16/9',
                            borderRadius: '2xl',
                            overflow: 'hidden',
                        })}
                    >
                        <Image
                            src={recipe.image}
                            alt={recipe.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 600px"
                            className={css({ objectFit: 'cover' })}
                        />
                        <div
                            className={css({
                                position: 'absolute',
                                bottom: '4',
                                left: '4',
                                display: 'inline-flex',
                                bg: '#e07b53',
                                borderRadius: 'full',
                                padding: '4px 12px',
                                fontSize: 'xs',
                                fontWeight: '600',
                                color: 'white',
                            })}
                        >
                            🔥 Tageshighlight
                        </div>
                    </div>
                    <div className={css({ mt: '4' })}>
                        <Heading
                            as="h2"
                            size="lg"
                            className={css({
                                color: 'text',
                            })}
                        >
                            {recipe.title}
                        </Heading>
                        <Text size="md" color="muted" className={css({ mt: '2', maxW: '40ch' })}>
                            {recipe.description || `${recipe.time} · ${recipe.category}`}
                        </Text>
                    </div>
                </div>
            </a>
        </section>
    );
}
