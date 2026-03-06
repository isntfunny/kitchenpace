'use client';

import { Star } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';
import { Heading, Text } from '../atoms/Typography';

import { CustomScrollbar } from './CustomScrollbar';

interface Recipe {
    id: string;
    slug: string;
    title: string;
    category: string;
    categorySlug?: string;
    rating: number;
    time: string;
    image: string | null;
}

interface HorizontalRecipeScrollProps {
    recipes: Recipe[];
    title: string;
}

const categoryColors: Record<string, string> = {
    Hauptgericht: '#e07b53',
    Beilage: '#00b894',
    Dessert: '#fd79a8',
    Frühstück: '#fdcb6e',
    Getränk: '#74b9ff',
    Vorspeise: '#a29bfe',
    Fingerfood: '#e17055',
    Brunch: '#fab1a0',
};

export function HorizontalRecipeScroll({ recipes, title }: HorizontalRecipeScrollProps) {
    return (
        <div
            className={css({
                p: '4',
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <Heading
                as="h2"
                size="lg"
                className={css({
                    mb: '3',
                    color: 'text',
                })}
            >
                {title}
            </Heading>

            <CustomScrollbar
                className={css({
                    display: 'flex',
                    gap: '3',
                    pb: '2',
                })}
            >
                {recipes.map((recipe) => {
                    const categoryColor = categoryColors[recipe.category] || '#e07b53';
                    return (
                        <a
                            key={recipe.id}
                            href={`/recipe/${recipe.slug}`}
                            className={css({
                                flex: '0 0 auto',
                                width: '200px',
                                bg: 'surface',
                                borderRadius: 'xl',
                                border: '2px solid',
                                borderColor: 'rgba(0,0,0,0.06)',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'all 200ms ease',
                                textDecoration: 'none',
                                display: 'block',
                                _hover: {
                                    transform: 'translateY(-4px)',
                                    borderColor: categoryColor,
                                    boxShadow: `0 12px 28px ${categoryColor}30`,
                                },
                            })}
                        >
                            <div
                                className={css({
                                    position: 'relative',
                                    aspectRatio: '16/10',
                                })}
                            >
                                <SmartImage
                                    src={recipe.image ?? undefined}
                                    alt={recipe.title}
                                    fill
                                    recipeId={recipe.id}
                                    className={css({ objectFit: 'cover' })}
                                />
                                <Link
                                    href={recipe.categorySlug ? `/category/${recipe.categorySlug}` : '#'}
                                    onClick={(e) => e.stopPropagation()}
                                    className={css({
                                        position: 'absolute',
                                        top: '2',
                                        left: '2',
                                        background: categoryColor,
                                        color: 'white',
                                        padding: '2px 10px',
                                        borderRadius: 'full',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: 'wide',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                        textDecoration: 'none',
                                        transition: 'all 150ms ease',
                                        _hover: { opacity: 0.85, transform: 'scale(1.05)' },
                                    })}
                                >
                                    {recipe.category}
                                </Link>
                            </div>
                            <div className={css({ p: '3' })}>
                                <Text size="sm" className={css({ fontWeight: '600', mb: '1' })}>
                                    {recipe.title}
                                </Text>
                                <div
                                    className={css({
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.75rem',
                                        color: 'text-muted',
                                        alignItems: 'center',
                                    })}
                                >
                                    <div className={css({ display: 'flex', gap: '2' })}>
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <Star
                                                key={value}
                                                size={14}
                                                className={css({
                                                    color:
                                                        value <= Math.floor(recipe.rating)
                                                            ? '#f8b500'
                                                            : '#e0e0e0',
                                                })}
                                            />
                                        ))}
                                    </div>
                                    <span>{recipe.time}</span>
                                </div>
                            </div>
                        </a>
                    );
                })}
            </CustomScrollbar>
        </div>
    );
}
