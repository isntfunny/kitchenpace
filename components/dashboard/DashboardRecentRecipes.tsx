'use client';

import { useState } from 'react';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import { SmartImage } from '../atoms/SmartImage';

interface Recipe {
    id: string;
    slug: string;
    title: string;
    image: string;
    rating: number;
    time: string;
    category: string;
    status?: 'cooked' | 'favorite' | 'planned' | 'new';
}

interface DashboardRecentRecipesProps {
    recipes: Recipe[];
}

const categoryColors: Record<string, string> = {
    Hauptgericht: '#e07b53',
    Beilage: '#00b894',
    Dessert: '#fd79a8',
    Frühstück: '#fdcb6e',
    Getränk: '#74b9ff',
    Vorspeise: '#a29bfe',
};

const filters = [
    { id: 'all', label: 'Alle' },
    { id: 'cooked', label: 'Gekocht' },
    { id: 'favorite', label: 'Favoriten' },
    { id: 'planned', label: 'Geplant' },
];

function RecipeCard({ recipe }: { recipe: Recipe }) {
    const color = categoryColors[recipe.category] || '#e07b53';
    const statusIcons = {
        cooked: '✓',
        favorite: '❤️',
        planned: '📅',
        new: '🆕',
    };

    return (
        <div
            className={css({
                background: 'white',
                borderRadius: 'xl',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.06)',
                transition: 'all 200ms ease',
                cursor: 'pointer',
                _hover: {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 28px ${color}20`,
                    borderColor: color,
                },
            })}
        >
            <div
                className={css({
                    position: 'relative',
                    aspectRatio: '4/3',
                })}
            >
                <SmartImage
                    src={recipe.image}
                    alt={recipe.title}
                    fill
                    className={css({ objectFit: 'cover' })}
                />
                <div
                    className={css({
                        position: 'absolute',
                        top: '3',
                        left: '3',
                        display: 'flex',
                        gap: '2',
                    })}
                >
                    <span
                        className={css({
                            background: color,
                            color: 'white',
                            padding: '1px 8px',
                            borderRadius: 'full',
                            fontSize: '0.65rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: 'wide',
                        })}
                    >
                        {recipe.category}
                    </span>
                    {recipe.status && (
                        <span
                            className={css({
                                background: 'white',
                                color: 'text',
                                width: '20px',
                                height: '20px',
                                borderRadius: 'full',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.65rem',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            })}
                        >
                            {statusIcons[recipe.status]}
                        </span>
                    )}
                </div>
                <div
                    className={css({
                        position: 'absolute',
                        bottom: '3',
                        right: '3',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: 'full',
                        fontSize: '0.7rem',
                        fontWeight: '500',
                    })}
                >
                    {recipe.time}
                </div>
            </div>
            <div
                className={css({
                    padding: '4',
                })}
            >
                <h4
                    className={css({
                        fontWeight: '600',
                        color: 'text',
                        fontSize: 'md',
                        mb: '2',
                        lineHeight: 'tight',
                    })}
                >
                    {recipe.title}
                </h4>
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                        })}
                    >
                        <span
                            className={css({
                                color: '#f8b500',
                                fontSize: 'sm',
                            })}
                        >
                            {'★'.repeat(Math.floor(recipe.rating))}
                            {'☆'.repeat(5 - Math.floor(recipe.rating))}
                        </span>
                        <span
                            className={css({
                                fontSize: 'xs',
                                color: 'text-muted',
                            })}
                        >
                            {recipe.rating}
                        </span>
                    </div>
                    <button
                        className={css({
                            fontSize: 'lg',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            opacity: 0.5,
                            transition: 'opacity 150ms ease',
                            _hover: {
                                opacity: 1,
                            },
                        })}
                    >
                        ♡
                    </button>
                </div>
            </div>
        </div>
    );
}

export function DashboardRecentRecipes({ recipes }: DashboardRecentRecipesProps) {
    const [activeFilter, setActiveFilter] = useState('all');

    const filteredRecipes =
        activeFilter === 'all' ? recipes : recipes.filter((r) => r.status === activeFilter);

    return (
        <div
            className={css({
                background: 'white',
                borderRadius: '2xl',
                padding: '6',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.06)',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: '5',
                    flexWrap: 'wrap',
                    gap: '3',
                })}
            >
                <div>
                    <h3
                        className={css({
                            fontSize: 'xl',
                            fontWeight: '700',
                            color: 'text',
                        })}
                    >
                        Meine Rezepte 📖
                    </h3>
                    <p
                        className={css({
                            fontSize: 'sm',
                            color: 'text-muted',
                            mt: '1',
                        })}
                    >
                        {filteredRecipes.length} Rezepte gefunden
                    </p>
                </div>
                <button
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '600',
                        color: 'primary',
                        background: 'rgba(224,123,83,0.1)',
                        border: 'none',
                        px: '4',
                        py: '2',
                        borderRadius: 'lg',
                        cursor: 'pointer',
                        _hover: {
                            background: 'rgba(224,123,83,0.2)',
                        },
                    })}
                >
                    Alle ansehen →
                </button>
            </div>

            <div
                className={css({
                    display: 'flex',
                    gap: '2',
                    mb: '5',
                    overflowX: 'auto',
                    paddingBottom: '2',
                })}
            >
                {filters.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        className={css({
                            fontSize: 'sm',
                            fontWeight: '500',
                            px: '4',
                            py: '2',
                            borderRadius: 'full',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 150ms ease',
                            background:
                                activeFilter === filter.id
                                    ? 'linear-gradient(135deg, #e07b53, #f8b500)'
                                    : 'rgba(0,0,0,0.04)',
                            color: activeFilter === filter.id ? 'white' : 'text-muted',
                            _hover: {
                                background:
                                    activeFilter === filter.id
                                        ? 'linear-gradient(135deg, #e07b53, #f8b500)'
                                        : 'rgba(0,0,0,0.08)',
                            },
                        })}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            <div
                className={grid({
                    columns: { base: 1, sm: 2, lg: 3 },
                    gap: '4',
                })}
            >
                {filteredRecipes.slice(0, 6).map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
            </div>

            {filteredRecipes.length === 0 && (
                <div
                    className={css({
                        textAlign: 'center',
                        py: '8',
                        color: 'text-muted',
                    })}
                >
                    <span
                        className={css({
                            fontSize: '3xl',
                            display: 'block',
                            mb: '2',
                        })}
                    >
                        📖
                    </span>
                    <p>Keine Rezepte in dieser Kategorie</p>
                </div>
            )}
        </div>
    );
}
