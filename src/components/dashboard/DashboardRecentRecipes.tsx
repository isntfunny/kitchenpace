'use client';

import { BookOpen, Calendar, CheckCircle, Heart, Sparkles } from 'lucide-react';
import { ReactNode, useState } from 'react';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import { RecipeCard, type RecipeCardRecipe } from '../features/RecipeCard';

interface DashboardRecipe extends RecipeCardRecipe {
    status?: 'cooked' | 'favorite' | 'planned' | 'new';
}

interface DashboardRecentRecipesProps {
    recipes: DashboardRecipe[];
}

const filters = [
    { id: 'all', label: 'Alle' },
    { id: 'cooked', label: 'Zubereitet' },
    { id: 'favorite', label: 'Favoriten' },
    { id: 'planned', label: 'Geplant' },
];

const statusIcons: Record<string, ReactNode> = {
    cooked: <CheckCircle size={14} color="#00b894" />,
    favorite: <Heart size={14} color="#fd79a8" />,
    planned: <Calendar size={14} color="#6c5ce7" />,
    new: <Sparkles size={14} color="#e07b53" />,
};

function StatusIcon({ status }: { status?: string }) {
    if (!status || !statusIcons[status]) return null;
    return (
        <span
            className={css({
                position: 'absolute',
                top: '3',
                right: '3',
                background: 'surface.elevated',
                width: '20px',
                height: '20px',
                borderRadius: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            })}
        >
            {statusIcons[status]}
        </span>
    );
}

function TimeBadge({ time }: { time?: string }) {
    if (!time) return null;
    return (
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
            {time}
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
                background: 'surface.elevated',
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
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        })}
                    >
                        <BookOpen size={22} color="#e07b53" />
                        <span>Meine Rezepte</span>
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
                    <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        categoryOnImage
                        starRating
                        imageOverlay={
                            <>
                                <StatusIcon status={recipe.status} />
                                <TimeBadge time={recipe.time} />
                            </>
                        }
                    />
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
                            color: '#636e72',
                        })}
                    >
                        <BookOpen size={48} />
                    </span>
                    <p>Keine Rezepte in dieser Kategorie</p>
                </div>
            )}
        </div>
    );
}
