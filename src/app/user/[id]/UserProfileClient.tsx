'use client';

import {
    Bookmark,
    Calendar,
    ChefHat,
    Check,
    Clipboard,
    Edit3,
    FileText,
    Flame,
    Handshake,
    MessageSquare,
    ShoppingCart,
    Star,
    UserPlus,
    Utensils,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useState, useTransition } from 'react';

import { toggleFollowAction } from '@app/app/actions/social';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { SparkleEffect } from '@app/components/atoms/SparkleEffect';
import { RecipeCard as SharedRecipeCard } from '@app/components/features/RecipeCard';
import { ReportButton } from '@app/components/features/ReportButton';
import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';
import { flex, grid } from 'styled-system/patterns';

// Pagination Component
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

export interface UserProfileRecipe {
    id: string;
    slug: string;
    title: string;
    description: string;
    image: string | null;
    category: string;
    rating: number;
    prepTime: number;
    cookTime: number;
}

export interface UserProfileActivity {
    id: string;
    type: string;
    timeAgo: string;
    targetId: string | null;
    targetType: string | null;
    recipeTitle: string | null;
    recipeSlug: string | null;
    metadata: Record<string, unknown> | null;
}

export interface UserProfileData {
    id: string;
    slug: string;
    name: string;
    avatar: string | null;
    bio: string | null;
    recipeCount: number;
    followerCount: number;
    showFollowerCount?: boolean;
    showFavorites?: boolean;
    recipes: UserProfileRecipe[];
    favorites?: UserProfileRecipe[];
    activities: UserProfileActivity[];
    currentPage?: number;
    totalPages?: number;
}

interface UserProfileClientProps {
    user: UserProfileData;
    viewer?: {
        id: string;
        isSelf: boolean;
        isFollowing: boolean;
    };
}

// Avatar size constant for consistent sizing
const AVATAR_SIZE = 180;

// Activity type configurations - supports {recipe} placeholder
const ACTIVITY_CONFIG: Record<string, { icon: ReactNode; template: string[]; bgCss: string }> = {
    RECIPE_CREATED: {
        icon: <Edit3 size={16} />,
        template: ['hat das Rezept', 'erstellt'],
        bgCss: css({ bg: { base: '#f3e8ff', _dark: 'rgba(168,85,247,0.15)' } }),
    },
    RECIPE_COOKED: {
        icon: <Flame size={16} />,
        template: ['hat', 'zubereitet'],
        bgCss: css({ bg: { base: '#fef3c7', _dark: 'rgba(245,158,11,0.15)' } }),
    },
    RECIPE_RATED: {
        icon: <Star size={16} />,
        template: ['hat', 'bewertet'],
        bgCss: css({ bg: { base: '#fef9c3', _dark: 'rgba(234,179,8,0.15)' } }),
    },
    RECIPE_COMMENTED: {
        icon: <MessageSquare size={16} />,
        template: ['hat', 'kommentiert'],
        bgCss: css({ bg: { base: '#fce7f3', _dark: 'rgba(236,72,153,0.15)' } }),
    },
    RECIPE_FAVORITED: {
        icon: <Bookmark size={16} />,
        template: ['hat', 'gespeichert'],
        bgCss: css({ bg: { base: '#dbeafe', _dark: 'rgba(59,130,246,0.15)' } }),
    },
    USER_FOLLOWED: {
        icon: <Handshake size={16} />,
        template: ['ist jetzt Follower'],
        bgCss: css({ bg: { base: '#d1fae5', _dark: 'rgba(52,211,153,0.15)' } }),
    },
    SHOPPING_LIST_CREATED: {
        icon: <ShoppingCart size={16} />,
        template: ['hat eine Einkaufsliste erstellt'],
        bgCss: css({ bg: { base: '#fef3c7', _dark: 'rgba(245,158,11,0.15)' } }),
    },
    MEAL_PLAN_CREATED: {
        icon: <Calendar size={16} />,
        template: ['hat einen Essensplan erstellt'],
        bgCss: css({ bg: { base: '#e0e7ff', _dark: 'rgba(99,102,241,0.15)' } }),
    },
};

export function UserProfileClient({ user, viewer }: UserProfileClientProps) {
    const router = useRouter();
    const { recipes, activities } = user;
    const [followerTotal, setFollowerTotal] = useState(user.followerCount);
    const [isFollowing, setIsFollowing] = useState(viewer?.isFollowing ?? false);
    const [isPending, startTransition] = useTransition();
    const viewerId = viewer?.id ?? null;
    const showFollowButton = !viewer?.isSelf;

    const requireAuth = () => {
        if (viewerId) {
            return true;
        }
        const callback = typeof window !== 'undefined' ? window.location.pathname : '/profile';
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
        return false;
    };

    const handleFollowToggle = () => {
        if (!showFollowButton) return;
        if (!requireAuth()) return;

        startTransition(async () => {
            try {
                const result = await toggleFollowAction(user.id);
                setIsFollowing(result.isFollowing);
                setFollowerTotal(result.followerCount);
            } catch (error) {
                console.error(error);
            }
        });
    };

    return (
        <div
            id="user-profile-page"
            className={css({
                minH: '100vh',
            })}
        >
            {/* ── Hero Banner ── */}
            <div
                className={css({
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '2xl',
                    mb: '6',
                })}
                style={{
                    background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.orange}cc, #c4623d)`,
                }}
            >
                {/* Decorative floating icons */}
                <motion.div
                    className={css({
                        position: 'absolute',
                        top: '-40px',
                        right: '-40px',
                        opacity: 0.12,
                        pointerEvents: 'none',
                    })}
                    animate={{ y: [0, -12, 0], rotate: [0, 4, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ChefHat size={200} color="white" />
                </motion.div>
                <motion.div
                    className={css({
                        position: 'absolute',
                        bottom: '-60px',
                        left: '22%',
                        opacity: 0.07,
                        pointerEvents: 'none',
                    })}
                    animate={{ y: [0, 10, 0], rotate: [0, -3, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <Utensils size={280} color="white" />
                </motion.div>

                <motion.div
                    className={css({
                        position: 'relative',
                        zIndex: 1,
                        px: { base: '5', md: '8' },
                        py: { base: '7', md: '10' },
                    })}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div
                        className={flex({
                            direction: { base: 'column', md: 'row' },
                            align: { base: 'center', md: 'flex-start' },
                            gap: { base: '5', md: '7' },
                        })}
                    >
                        {/* Avatar */}
                        <div
                            className={css({
                                position: 'relative',
                                flexShrink: 0,
                                width: `${AVATAR_SIZE}px`,
                                height: `${AVATAR_SIZE}px`,
                                borderRadius: '3xl',
                                overflow: 'hidden',
                                boxShadow:
                                    '0 0 0 4px rgba(255,255,255,0.4), 0 8px 32px rgba(0,0,0,0.25)',
                            })}
                        >
                            {user.avatar ? (
                                <SmartImage
                                    src={user.avatar}
                                    alt={user.name}
                                    aspect="1:1"
                                    fill
                                    className={css({ objectFit: 'cover', display: 'block' })}
                                />
                            ) : (
                                <div
                                    className={css({
                                        width: '100%',
                                        height: '100%',
                                        bg: 'rgba(255,255,255,0.2)',
                                        backdropFilter: 'blur(8px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '4xl',
                                        fontWeight: '700',
                                        color: 'white',
                                        fontFamily: 'heading',
                                    })}
                                >
                                    {user.name.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div
                            className={css({
                                flex: 1,
                                textAlign: { base: 'center', md: 'left' },
                            })}
                        >
                            <p
                                className={css({
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: 'xs',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.12em',
                                    mb: '2',
                                })}
                            >
                                Koch-Profil
                            </p>
                            <h1
                                className={css({
                                    fontSize: { base: '2xl', md: '3xl', lg: '4xl' },
                                    fontWeight: '800',
                                    fontFamily: 'heading',
                                    color: 'white',
                                    mb: '2',
                                    lineHeight: '1.15',
                                })}
                            >
                                {user.name}
                            </h1>
                            {user.bio && (
                                <motion.p
                                    className={css({
                                        color: 'rgba(255,255,255,0.85)',
                                        fontSize: { base: 'sm', md: 'base' },
                                        lineHeight: '1.6',
                                        mb: '5',
                                        maxW: { base: 'full', md: '500px' },
                                        mx: { base: 'auto', md: '0' },
                                    })}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.4 }}
                                >
                                    {user.bio}
                                </motion.p>
                            )}

                            {/* Stats + Follow */}
                            <div
                                className={flex({
                                    direction: { base: 'row', md: 'row' },
                                    align: 'center',
                                    justify: { base: 'center', md: 'flex-start' },
                                    gap: '3',
                                    mt: user.bio ? '0' : '4',
                                    flexWrap: 'wrap',
                                })}
                            >
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2',
                                        bg: 'rgba(255,255,255,0.18)',
                                        backdropFilter: 'blur(8px)',
                                        px: '3',
                                        py: '2',
                                        borderRadius: 'xl',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                    })}
                                >
                                    <ChefHat size={15} color="white" />
                                    <span
                                        className={css({
                                            fontWeight: '700',
                                            fontSize: 'sm',
                                            color: 'white',
                                        })}
                                    >
                                        {user.recipeCount}
                                    </span>
                                    <span
                                        className={css({
                                            fontSize: 'xs',
                                            color: 'rgba(255,255,255,0.7)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        })}
                                    >
                                        Rezepte
                                    </span>
                                </div>

                                {user.showFollowerCount !== false && (
                                    <div
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2',
                                            bg: 'rgba(255,255,255,0.18)',
                                            backdropFilter: 'blur(8px)',
                                            px: '3',
                                            py: '2',
                                            borderRadius: 'xl',
                                            border: '1px solid rgba(255,255,255,0.3)',
                                        })}
                                    >
                                        <Handshake size={15} color="white" />
                                        <span
                                            className={css({
                                                fontWeight: '700',
                                                fontSize: 'sm',
                                                color: 'white',
                                            })}
                                        >
                                            {followerTotal}
                                        </span>
                                        <span
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'rgba(255,255,255,0.7)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            })}
                                        >
                                            Follower
                                        </span>
                                    </div>
                                )}

                                {recipes.length > 0 && (
                                    <div
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2',
                                            bg: 'rgba(255,255,255,0.18)',
                                            backdropFilter: 'blur(8px)',
                                            px: '3',
                                            py: '2',
                                            borderRadius: 'xl',
                                            border: '1px solid rgba(255,255,255,0.3)',
                                        })}
                                    >
                                        <Star size={15} color="white" />
                                        <span
                                            className={css({
                                                fontWeight: '700',
                                                fontSize: 'sm',
                                                color: 'white',
                                            })}
                                        >
                                            {(
                                                recipes.reduce((sum, r) => sum + r.rating, 0) /
                                                recipes.length
                                            ).toFixed(1)}
                                        </span>
                                        <span
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'rgba(255,255,255,0.7)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            })}
                                        >
                                            Ø Rating
                                        </span>
                                    </div>
                                )}

                                {showFollowButton && (
                                    <SparkleEffect
                                        style={{ display: 'inline-flex', width: 'fit-content' }}
                                    >
                                        {(triggerSparkle) => (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!isFollowing) triggerSparkle();
                                                    handleFollowToggle();
                                                }}
                                                disabled={isPending}
                                                className={css({
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '2',
                                                    bg: isFollowing
                                                        ? 'rgba(255,255,255,0.2)'
                                                        : 'white',
                                                    border: '1px solid',
                                                    borderColor: isFollowing
                                                        ? 'rgba(255,255,255,0.4)'
                                                        : 'transparent',
                                                    borderRadius: 'lg',
                                                    px: '4',
                                                    py: '2',
                                                    fontWeight: '700',
                                                    fontSize: 'sm',
                                                    cursor: isPending ? 'not-allowed' : 'pointer',
                                                    opacity: isPending ? 0.7 : 1,
                                                    transition: 'all 150ms',
                                                    whiteSpace: 'nowrap',
                                                    _hover: {
                                                        bg: isFollowing
                                                            ? 'rgba(255,255,255,0.3)'
                                                            : 'rgba(255,255,255,0.9)',
                                                    },
                                                })}
                                                style={{
                                                    color: isFollowing ? 'white' : PALETTE.orange,
                                                }}
                                            >
                                                {isFollowing ? (
                                                    <Check size={14} />
                                                ) : (
                                                    <UserPlus size={14} />
                                                )}
                                                {isFollowing ? 'Folgst du' : 'Folgen'}
                                            </button>
                                        )}
                                    </SparkleEffect>
                                )}

                                {!viewer?.isSelf && (
                                    <ReportButton
                                        contentType="user"
                                        contentId={user.id}
                                        variant="icon"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Content */}
            <main
                className={css({
                    width: '100%',
                    px: { base: '4', md: '6' },
                    py: { base: '6', md: '8' },
                })}
            >
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: { base: '1fr', lg: '1fr 320px' },
                        gap: { base: '8', lg: '10' },
                        maxW: '1600px',
                        mx: 'auto',
                    })}
                >
                    {/* Recipes Section */}
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
                                        color: 'text.muted',
                                        bg: { base: 'gray.100', _dark: 'rgba(255,255,255,0.06)' },
                                        px: '3',
                                        py: '1',
                                        borderRadius: 'full',
                                    })}
                                >
                                    {user.recipeCount} insgesamt
                                </span>
                            )}
                        </div>

                        {recipes.length > 0 ? (
                            <>
                                <div
                                    className={grid({
                                        columns: { base: 1, sm: 2, md: 3, xl: 4 },
                                        gap: '4',
                                    })}
                                >
                                    {recipes.map((recipe) => (
                                        <SharedRecipeCard
                                            key={recipe.id}
                                            recipe={{
                                                ...recipe,
                                                time: `${recipe.prepTime + recipe.cookTime} Min.`,
                                            }}
                                            categoryOnImage
                                        />
                                    ))}
                                </div>

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
                        {user.showFavorites !== false &&
                            user.favorites &&
                            user.favorites.length > 0 && (
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
                                    <div
                                        className={grid({
                                            columns: { base: 1, sm: 2, md: 3, xl: 4 },
                                            gap: '4',
                                        })}
                                    >
                                        {user.favorites.map((recipe) => (
                                            <SharedRecipeCard
                                                key={`fav-${recipe.id}`}
                                                recipe={{
                                                    ...recipe,
                                                    time: `${recipe.prepTime + recipe.cookTime} Min.`,
                                                }}
                                                categoryOnImage
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                    </div>

                    {/* Activity Sidebar */}
                    <div>
                        <h2
                            className={css({
                                fontSize: 'lg',
                                fontWeight: '700',
                                color: 'text',
                                fontFamily: 'heading',
                                mb: '5',
                            })}
                        >
                            Aktivitäten
                        </h2>

                        {activities.length > 0 ? (
                            <div
                                className={css({
                                    bg: 'surface.elevated',
                                    borderRadius: 'xl',
                                    boxShadow: {
                                        base: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
                                        _dark: '0 1px 3px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)',
                                    },
                                    overflow: 'hidden',
                                })}
                            >
                                <div className={flex({ direction: 'column' })}>
                                    {activities.map((activity, index) => {
                                        const config = ACTIVITY_CONFIG[activity.type] ?? {
                                            icon: <Clipboard size={16} />,
                                            template: ['war aktiv'],
                                            bgCss: css({
                                                bg: {
                                                    base: '#f3f4f6',
                                                    _dark: 'rgba(255,255,255,0.06)',
                                                },
                                            }),
                                        };

                                        // Build the activity text
                                        // If template has 2 parts, recipe goes between them
                                        // If template has 1 part, it's a standalone action (no recipe)
                                        const hasRecipe =
                                            activity.recipeTitle && config.template.length === 2;

                                        return (
                                            <div
                                                key={activity.id}
                                                className={css({
                                                    p: '4',
                                                    borderBottom:
                                                        index < activities.length - 1
                                                            ? '1px solid'
                                                            : 'none',
                                                    borderColor: 'border.muted',
                                                    _hover: { bg: 'surface.muted' },
                                                    transition: 'background 0.15s',
                                                })}
                                            >
                                                <div
                                                    className={flex({
                                                        align: 'flex-start',
                                                        gap: '3',
                                                    })}
                                                >
                                                    <div
                                                        className={`${css({
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: 'lg',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 'lg',
                                                            flexShrink: 0,
                                                        })} ${config.bgCss}`}
                                                    >
                                                        {config.icon}
                                                    </div>
                                                    <div className={css({ flex: 1, minW: 0 })}>
                                                        <p
                                                            className={css({
                                                                fontSize: 'sm',
                                                                color: 'text',
                                                                lineHeight: '1.5',
                                                            })}
                                                        >
                                                            <span
                                                                className={css({
                                                                    fontWeight: '600',
                                                                })}
                                                            >
                                                                {user.name}
                                                            </span>{' '}
                                                            {hasRecipe ? (
                                                                <>
                                                                    {config.template[0]}{' '}
                                                                    <Link
                                                                        href={`/recipe/${activity.recipeSlug ?? activity.targetId}`}
                                                                        className={css({
                                                                            color: 'primary',
                                                                            fontWeight: '500',
                                                                            _hover: {
                                                                                textDecoration:
                                                                                    'underline',
                                                                            },
                                                                        })}
                                                                    >
                                                                        {activity.recipeTitle}
                                                                    </Link>{' '}
                                                                    {config.template[1]}
                                                                </>
                                                            ) : (
                                                                <span
                                                                    className={css({
                                                                        color: 'text-muted',
                                                                    })}
                                                                >
                                                                    {config.template[0]}
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p
                                                            className={css({
                                                                fontSize: 'xs',
                                                                color: 'text-muted',
                                                                mt: '1',
                                                            })}
                                                        >
                                                            {activity.timeAgo}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div
                                className={css({
                                    bg: 'surface.elevated',
                                    borderRadius: 'xl',
                                    p: '6',
                                    textAlign: 'center',
                                    border: '1px dashed',
                                    borderColor: 'border',
                                })}
                            >
                                <div
                                    className={css({
                                        fontSize: '2xl',
                                        mb: '2',
                                        color: 'foreground.muted',
                                    })}
                                >
                                    <FileText size={36} />
                                </div>
                                <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                                    Noch keine Aktivitäten.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
