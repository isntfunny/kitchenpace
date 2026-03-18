'use client';

import { ChefHat } from 'lucide-react';
import Link from 'next/link';

import { RecipeCard as SharedRecipeCard } from '@app/components/features/RecipeCard';
import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';
import { flex, grid } from 'styled-system/patterns';

import type { UserProfileData, UserProfileRecipe } from '../UserProfileClient';

// ── Pagination ──────────────────────────────────────────────────────────

function Pagination({
    currentPage,
    totalPages,
    baseUrl,
}: {
    currentPage: number;
    totalPages: number;
    baseUrl: string;
}) {
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    return (
        <div
            className={flex({
                justify: 'center',
                align: 'center',
                gap: '2',
                mt: '8',
            })}
        >
            {currentPage > 1 && (
                <Link
                    href={`${baseUrl}?page=${currentPage - 1}`}
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: 'lg',
                        bg: 'surface.card',
                        border: '1px solid',
                        borderColor: 'border',
                        color: 'text',
                        fontWeight: '500',
                        transition: 'all 150ms',
                        _hover: {
                            bg: 'accent.soft',
                            borderColor: 'primary',
                            color: 'primary',
                        },
                    })}
                >
                    ‹
                </Link>
            )}

            {getPageNumbers().map((page, idx) =>
                page === '...' ? (
                    <span key={`ellipsis-${idx}`} className={css({ color: 'text.muted', px: '2' })}>
                        …
                    </span>
                ) : (
                    <Link
                        key={page}
                        href={`${baseUrl}?page=${page}`}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '40px',
                            height: '40px',
                            px: '3',
                            borderRadius: 'lg',
                            bg: page === currentPage ? 'primary' : 'surface.card',
                            border: '1px solid',
                            borderColor: page === currentPage ? 'primary' : 'border',
                            color: page === currentPage ? 'white' : 'text',
                            fontWeight: page === currentPage ? '600' : '500',
                            transition: 'all 150ms',
                            _hover: {
                                bg: page === currentPage ? 'primary' : 'accent.soft',
                                borderColor: page === currentPage ? 'primary' : 'primary',
                                color: page === currentPage ? 'white' : 'primary',
                            },
                        })}
                    >
                        {page}
                    </Link>
                ),
            )}

            {currentPage < totalPages && (
                <Link
                    href={`${baseUrl}?page=${currentPage + 1}`}
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: 'lg',
                        bg: 'surface.card',
                        border: '1px solid',
                        borderColor: 'border',
                        color: 'text',
                        fontWeight: '500',
                        transition: 'all 150ms',
                        _hover: {
                            bg: 'accent.soft',
                            borderColor: 'primary',
                            color: 'primary',
                        },
                    })}
                >
                    ›
                </Link>
            )}
        </div>
    );
}

// ── Recipe Grid Section ─────────────────────────────────────────────────

function RecipeGridList({
    recipes,
    keyPrefix,
}: {
    recipes: UserProfileRecipe[];
    keyPrefix?: string;
}) {
    return (
        <div
            className={grid({
                columns: { base: 1, sm: 2, md: 3, xl: 4 },
                gap: '4',
            })}
        >
            {recipes.map((recipe) => (
                <SharedRecipeCard
                    key={keyPrefix ? `${keyPrefix}-${recipe.id}` : recipe.id}
                    recipe={{
                        ...recipe,
                        time: `${recipe.prepTime + recipe.cookTime} Min.`,
                    }}
                    categoryOnImage
                />
            ))}
        </div>
    );
}

interface ProfileRecipeGridProps {
    user: UserProfileData;
    recipes: UserProfileRecipe[];
}

export function ProfileRecipeGrid({ user, recipes }: ProfileRecipeGridProps) {
    return (
        <div id="recipes-section">
            <div
                className={flex({
                    justify: 'space-between',
                    align: 'center',
                    mb: '5',
                })}
            >
                <h2
                    className={css({
                        fontSize: 'lg',
                        fontWeight: '700',
                        color: 'text',
                        fontFamily: 'heading',
                    })}
                >
                    Rezepte
                </h2>
                {recipes.length > 0 && (
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'brand.primary',
                            bg: {
                                base: 'rgba(224,123,83,0.1)',
                                _dark: 'rgba(224,123,83,0.15)',
                            },
                            border: '1px solid',
                            borderColor: {
                                base: 'rgba(224,123,83,0.25)',
                                _dark: 'rgba(224,123,83,0.3)',
                            },
                            px: '3',
                            py: '1',
                            borderRadius: 'full',
                            fontWeight: '500',
                        })}
                    >
                        {user.recipeCount} insgesamt
                    </span>
                )}
            </div>

            {recipes.length > 0 ? (
                <>
                    <RecipeGridList recipes={recipes} />

                    {/* Pagination */}
                    {user.totalPages && user.totalPages > 1 && (
                        <Pagination
                            currentPage={user.currentPage ?? 1}
                            totalPages={user.totalPages}
                            baseUrl={`/user/${user.slug}`}
                        />
                    )}
                </>
            ) : (
                <div
                    className={css({
                        bg: 'surface.elevated',
                        borderRadius: 'xl',
                        p: '8',
                        textAlign: 'center',
                        border: '1px dashed',
                        borderColor: 'border',
                    })}
                >
                    <div
                        className={css({
                            fontSize: '3xl',
                            mb: '3',
                        })}
                    >
                        <ChefHat size={42} color={PALETTE.orange} />
                    </div>
                    <p className={css({ color: 'text.muted', fontSize: 'sm' })}>
                        {user.name} hat noch keine Rezepte veröffentlicht.
                    </p>
                </div>
            )}

            {/* Favorites Section */}
            {user.showFavorites !== false && user.favorites && user.favorites.length > 0 && (
                <div className={css({ mt: '10' })}>
                    <div
                        className={flex({
                            justify: 'space-between',
                            align: 'center',
                            mb: '5',
                        })}
                    >
                        <h2
                            className={css({
                                fontSize: 'lg',
                                fontWeight: '700',
                                color: 'text',
                                fontFamily: 'heading',
                            })}
                        >
                            Favoriten
                        </h2>
                        <span
                            className={css({
                                fontSize: 'sm',
                                color: 'text.muted',
                                bg: {
                                    base: 'gray.100',
                                    _dark: 'rgba(255,255,255,0.06)',
                                },
                                px: '3',
                                py: '1',
                                borderRadius: 'full',
                            })}
                        >
                            {user.favorites.length} gespeichert
                        </span>
                    </div>
                    <RecipeGridList recipes={user.favorites} keyPrefix="fav" />
                </div>
            )}

            {/* Cooked Section */}
            {user.showCooked !== false && user.cooked && user.cooked.length > 0 && (
                <div className={css({ mt: '10' })}>
                    <div
                        className={flex({
                            justify: 'space-between',
                            align: 'center',
                            mb: '5',
                        })}
                    >
                        <h2
                            className={css({
                                fontSize: 'lg',
                                fontWeight: '700',
                                color: 'text',
                                fontFamily: 'heading',
                            })}
                        >
                            Zubereitet
                        </h2>
                        <span
                            className={css({
                                fontSize: 'sm',
                                color: 'text.muted',
                                bg: {
                                    base: 'gray.100',
                                    _dark: 'rgba(255,255,255,0.06)',
                                },
                                px: '3',
                                py: '1',
                                borderRadius: 'full',
                            })}
                        >
                            {user.cooked.length} Rezepte
                        </span>
                    </div>
                    <RecipeGridList recipes={user.cooked} keyPrefix="cooked" />
                </div>
            )}
        </div>
    );
}
