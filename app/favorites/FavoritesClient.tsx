'use client';

import Link from 'next/link';
import { useTransition } from 'react';

import { toggleFavoriteAction } from '@/app/actions/social';
import { Badge } from '@/components/atoms/Badge';
import { css } from 'styled-system/css';
import { flex, grid } from 'styled-system/patterns';

export interface FavoriteRecipeCard {
    id: string;
    slug: string;
    title: string;
    category: string;
    rating: number;
    time: string;
    image: string;
    description?: string;
    savedAt: Date | string;
}

interface FavoritesClientProps {
    initialFavorites: FavoriteRecipeCard[];
}

function formatTimeAgo(date: Date | string): string {
    const now = new Date();
    const saved = new Date(date);
    const diffMs = now.getTime() - saved.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return saved.toLocaleDateString('de-DE');
}

export function FavoritesClient({ initialFavorites }: FavoritesClientProps) {
    const [isPending, startTransition] = useTransition();
    const favorites = initialFavorites;

    const handleRemove = (recipeId: string) => {
        startTransition(async () => {
            try {
                await toggleFavoriteAction(recipeId);
            } catch (error) {
                console.error(error);
            }
        });
    };

    return (
        <div className={css({ minH: '100vh', bg: 'background' })}>
            <div
                className={css({
                    bg: 'linear-gradient(135deg, #fff7f0 0%, #ffede0 50%, #fff7f0 100%)',
                    pt: { base: '8', md: '12' },
                    pb: { base: '10', md: '14' },
                    borderBottom: '1px solid',
                    borderColor: 'gray.100',
                })}
            >
                <div
                    className={css({
                        maxW: '5xl',
                        mx: 'auto',
                        px: { base: '4', md: '6' },
                    })}
                >
                    <h1
                        className={css({
                            fontSize: { base: '2xl', md: '3xl' },
                            fontWeight: '800',
                            fontFamily: 'heading',
                            color: 'text',
                            mb: '2',
                        })}
                    >
                        Meine Favoriten
                    </h1>
                    <p
                        className={css({
                            color: 'text-muted',
                            fontSize: { base: 'sm', md: 'base' },
                        })}
                    >
                        {favorites.length}{' '}
                        {favorites.length === 1 ? 'gespeichertes Rezept' : 'gespeicherte Rezepte'}
                    </p>
                </div>
            </div>

            <main
                className={css({
                    maxW: '5xl',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: { base: '6', md: '8' },
                })}
            >
                {favorites.length > 0 ? (
                    <div
                        className={grid({
                            columns: { base: 1, sm: 2, lg: 3 },
                            gap: '6',
                        })}
                    >
                        {favorites.map((recipe) => (
                            <FavoriteCard
                                key={recipe.id}
                                recipe={recipe}
                                onRemove={() => handleRemove(recipe.id)}
                                isRemoving={isPending}
                            />
                        ))}
                    </div>
                ) : (
                    <div
                        className={css({
                            textAlign: 'center',
                            py: '16',
                            px: '4',
                            bg: 'surface.elevated',
                            borderRadius: '2xl',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                        })}
                    >
                        <div className={css({ fontSize: '4xl', mb: '4' })}>💝</div>
                        <h2
                            className={css({
                                fontSize: 'xl',
                                fontWeight: '700',
                                fontFamily: 'heading',
                                color: 'text',
                                mb: '2',
                            })}
                        >
                            Noch keine Favoriten
                        </h2>
                        <p className={css({ color: 'text-muted', mb: '6' })}>
                            Speichere Rezepte, die du später kochen möchtest.
                        </p>
                        <Link
                            href="/"
                            className={css({
                                display: 'inline-block',
                                px: '6',
                                py: '3',
                                bg: 'primary',
                                color: 'white',
                                borderRadius: 'lg',
                                fontWeight: '600',
                                textDecoration: 'none',
                                transition: 'all 150ms ease',
                                _hover: {
                                    bg: 'primary-dark',
                                },
                            })}
                        >
                            Rezepte entdecken
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}

function FavoriteCard({
    recipe,
    onRemove,
    isRemoving,
}: {
    recipe: FavoriteRecipeCard;
    onRemove: () => void;
    isRemoving: boolean;
}) {
    return (
        <div
            className={css({
                position: 'relative',
                bg: 'surface.elevated',
                borderRadius: 'xl',
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                transition: 'all 200ms ease',
                _hover: {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                },
            })}
        >
            <Link href={`/recipe/${recipe.slug}`} className={css({ textDecoration: 'none' })}>
                <div className={css({ position: 'relative', aspectRatio: '16/10' })}>
                    <img
                        src={recipe.image}
                        alt={recipe.title}
                        className={css({
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        })}
                    />
                    <div
                        className={css({
                            position: 'absolute',
                            top: '3',
                            left: '3',
                        })}
                    >
                        <Badge>{recipe.category}</Badge>
                    </div>
                </div>
            </Link>

            <div className={css({ p: '4' })}>
                <Link href={`/recipe/${recipe.slug}`} className={css({ textDecoration: 'none' })}>
                    <h3
                        className={css({
                            fontSize: 'base',
                            fontWeight: '700',
                            fontFamily: 'heading',
                            color: 'text',
                            mb: '1',
                            lineClamp: 1,
                        })}
                    >
                        {recipe.title}
                    </h3>
                </Link>
                <p
                    className={css({
                        fontSize: 'sm',
                        color: 'text-muted',
                        lineClamp: 2,
                        mb: '3',
                        lineHeight: '1.5',
                    })}
                >
                    {recipe.description}
                </p>

                <div
                    className={flex({
                        justify: 'space-between',
                        align: 'center',
                        fontSize: 'xs',
                        color: 'text-muted',
                    })}
                >
                    <div className={flex({ align: 'center', gap: '1' })}>
                        <span className={css({ color: '#f8b500' })}>★</span>
                        <span className={css({ fontWeight: '600' })}>
                            {recipe.rating.toFixed(1)}
                        </span>
                    </div>
                    <div className={flex({ align: 'center', gap: '1' })}>
                        <span>⏱</span>
                        <span>{recipe.time}</span>
                    </div>
                </div>

                <div
                    className={css({
                        mt: '3',
                        pt: '3',
                        borderTop: '1px solid',
                        borderColor: 'gray.100',
                    })}
                >
                    <div
                        className={flex({
                            justify: 'space-between',
                            align: 'center',
                        })}
                    >
                        <span className={css({ fontSize: 'xs', color: 'text-muted' })}>
                            Gespeichert {formatTimeAgo(recipe.savedAt)}
                        </span>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onRemove();
                            }}
                            disabled={isRemoving}
                            className={css({
                                fontSize: 'xs',
                                color: 'text-muted',
                                cursor: 'pointer',
                                bg: 'transparent',
                                border: 'none',
                                p: '0',
                                _hover: { color: 'red.500' },
                            })}
                        >
                            Entfernen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
