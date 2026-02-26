'use client';

import {
    Bookmark,
    Calendar,
    ChefHat,
    Clipboard,
    Edit3,
    Flame,
    FileText,
    Handshake,
    MessageSquare,
    ShoppingCart,
    Star,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useState, useTransition } from 'react';

import { toggleFollowAction } from '@/app/actions/social';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { css } from 'styled-system/css';
import { flex, grid } from 'styled-system/patterns';

export interface UserProfileRecipe {
    id: string;
    title: string;
    description: string;
    image: string;
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
    name: string;
    avatar: string | null;
    bio: string | null;
    recipeCount: number;
    followerCount: number;
    recipes: UserProfileRecipe[];
    activities: UserProfileActivity[];
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
const AVATAR_SIZE = 140;

// Activity type configurations - supports {recipe} placeholder
const ACTIVITY_CONFIG: Record<string, { icon: ReactNode; template: string[]; bgColor: string }> = {
    RECIPE_CREATED: {
        icon: <Edit3 size={16} />,
        template: ['hat das Rezept', 'erstellt'],
        bgColor: '#f3e8ff',
    },
    RECIPE_COOKED: {
        icon: <Flame size={16} />,
        template: ['hat', 'gekocht'],
        bgColor: '#fef3c7',
    },
    RECIPE_RATED: {
        icon: <Star size={16} />,
        template: ['hat', 'bewertet'],
        bgColor: '#fef9c3',
    },
    RECIPE_COMMENTED: {
        icon: <MessageSquare size={16} />,
        template: ['hat', 'kommentiert'],
        bgColor: '#fce7f3',
    },
    RECIPE_FAVORITED: {
        icon: <Bookmark size={16} />,
        template: ['hat', 'gespeichert'],
        bgColor: '#dbeafe',
    },
    USER_FOLLOWED: {
        icon: <Handshake size={16} />,
        template: ['ist jetzt Follower'],
        bgColor: '#d1fae5',
    },
    SHOPPING_LIST_CREATED: {
        icon: <ShoppingCart size={16} />,
        template: ['hat eine Einkaufsliste erstellt'],
        bgColor: '#fef3c7',
    },
    MEAL_PLAN_CREATED: {
        icon: <Calendar size={16} />,
        template: ['hat einen Essensplan erstellt'],
        bgColor: '#e0e7ff',
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
        <div className={css({ minH: '100vh', bg: 'background' })}>
            {/* Profile Header */}
            <div
                className={css({
                    bg: 'linear-gradient(135deg, #fff7f0 0%, #ffede0 50%, #fff7f0 100%)',
                    pt: { base: '6', md: '10' },
                    pb: { base: '8', md: '12' },
                    borderBottom: '1px solid',
                    borderColor: 'gray.100',
                })}
            >
                <div
                    className={css({
                        maxW: '1000px',
                        mx: 'auto',
                        px: { base: '4', md: '6' },
                    })}
                >
                    <div
                        className={flex({
                            direction: { base: 'column', md: 'row' },
                            align: { base: 'center', md: 'flex-start' },
                            gap: { base: '6', md: '8' },
                        })}
                    >
                        {/* Avatar Container - Fixed 1:1 ratio circle */}
                        <div
                            className={css({
                                position: 'relative',
                                flexShrink: 0,
                            })}
                        >
                            <div
                                className={css({
                                    width: `${AVATAR_SIZE}px`,
                                    height: `${AVATAR_SIZE}px`,
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: '4px solid white',
                                    boxShadow:
                                        '0 8px 24px rgba(224, 123, 83, 0.2), 0 2px 8px rgba(0,0,0,0.08)',
                                    bg: 'white',
                                })}
                            >
                                {user.avatar ? (
                                    <Image
                                        src={user.avatar}
                                        alt={user.name}
                                        fill
                                        className={css({
                                            objectFit: 'cover',
                                            display: 'block',
                                        })}
                                    />
                                ) : (
                                    <div
                                        className={css({
                                            width: '100%',
                                            height: '100%',
                                            background:
                                                'linear-gradient(135deg, #e07b53 0%, #c4623d 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '3xl',
                                            fontWeight: '700',
                                            color: 'white',
                                            fontFamily: 'heading',
                                        })}
                                    >
                                        {user.name.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            {/* Online indicator or badge could go here */}
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
                                    color: 'primary',
                                    fontSize: 'xs',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
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
                                    color: 'text',
                                    mb: '3',
                                    lineHeight: '1.2',
                                })}
                            >
                                {user.name}
                            </h1>
                            {user.bio && (
                                <p
                                    className={css({
                                        color: 'text-muted',
                                        fontSize: { base: 'sm', md: 'base' },
                                        lineHeight: '1.7',
                                        mb: '5',
                                        maxW: { base: 'full', md: '500px' },
                                        mx: { base: 'auto', md: '0' },
                                    })}
                                >
                                    {user.bio}
                                </p>
                            )}

                            {/* Stats Row */}
                            <div
                                className={flex({
                                    gap: { base: '6', md: '8' },
                                    justify: { base: 'center', md: 'flex-start' },
                                    flexWrap: 'wrap',
                                })}
                            >
                                <StatItem value={user.recipeCount} label="Rezepte" />
                                <StatItem value={followerTotal} label="Follower" />
                                {recipes.length > 0 && (
                                    <StatItem
                                        value={
                                            recipes.reduce((sum, r) => sum + r.rating, 0) /
                                            recipes.length
                                        }
                                        label="⭐ Ø Rating"
                                        isDecimal
                                    />
                                )}
                            </div>

                            {showFollowButton && (
                                <div
                                    className={css({
                                        mt: '5',
                                        display: 'flex',
                                        gap: '3',
                                        justifyContent: { base: 'center', md: 'flex-start' },
                                    })}
                                >
                                    <Button
                                        type="button"
                                        variant={isFollowing ? 'secondary' : 'primary'}
                                        onClick={handleFollowToggle}
                                        disabled={isPending}
                                    >
                                        {isFollowing ? '✓ Folgst du' : '+ Folgen'}
                                    </Button>
                                    {viewerId && (
                                        <Link href="/profile">
                                            <Button type="button" variant="ghost">
                                                Mein Profil
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main
                className={css({
                    maxW: '1000px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: { base: '6', md: '8' },
                })}
            >
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: { base: '1fr', lg: '1fr 320px' },
                        gap: { base: '8', lg: '10' },
                    })}
                >
                    {/* Recipes Section */}
                    <div>
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
                                        color: 'text-muted',
                                        bg: 'gray.100',
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
                            <div
                                className={grid({
                                    columns: { base: 1, sm: 2 },
                                    gap: '4',
                                })}
                            >
                                {recipes.map((recipe) => (
                                    <RecipeCard key={recipe.id} recipe={recipe} />
                                ))}
                            </div>
                        ) : (
                            <div
                                className={css({
                                    bg: 'surface.elevated',
                                    borderRadius: 'xl',
                                    p: '8',
                                    textAlign: 'center',
                                    border: '1px dashed',
                                    borderColor: 'gray.200',
                                })}
                            >
                                <div
                                    className={css({
                                        fontSize: '3xl',
                                        mb: '3',
                                    })}
                                >
                                    <ChefHat size={42} color="#e07b53" />
                                </div>
                                <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                                    {user.name} hat noch keine Rezepte veröffentlicht.
                                </p>
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
                                    boxShadow:
                                        '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
                                    overflow: 'hidden',
                                })}
                            >
                                <div className={flex({ direction: 'column' })}>
                                    {activities.map((activity, index) => {
                                        const config = ACTIVITY_CONFIG[activity.type] ?? {
                                            icon: <Clipboard size={16} />,
                                            template: ['war aktiv'],
                                            bgColor: '#f3f4f6',
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
                                                    borderColor: 'gray.100',
                                                    _hover: { bg: 'gray.50' },
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
                                                        className={css({
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: 'lg',
                                                            bg: config.bgColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 'lg',
                                                            flexShrink: 0,
                                                        })}
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
                                    borderColor: 'gray.200',
                                })}
                            >
                                <div
                                    className={css({ fontSize: '2xl', mb: '2', color: '#4a5568' })}
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

// Stat Item Component
function StatItem({
    value,
    label,
    isDecimal = false,
}: {
    value: number;
    label: string;
    isDecimal?: boolean;
}) {
    return (
        <div
            className={css({
                textAlign: 'center',
            })}
        >
            <div
                className={css({
                    fontSize: { base: 'xl', md: '2xl' },
                    fontWeight: '800',
                    color: 'text',
                    fontFamily: 'heading',
                })}
            >
                {isDecimal ? value.toFixed(1) : value}
            </div>
            <div
                className={css({
                    fontSize: 'xs',
                    color: 'text-muted',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                })}
            >
                {label}
            </div>
        </div>
    );
}

// Recipe Card Component
function RecipeCard({ recipe }: { recipe: UserProfileRecipe }) {
    const totalTime = recipe.prepTime + recipe.cookTime;

    return (
        <Link
            href={`/recipe/${recipe.id}`}
            className={css({
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                bg: 'surface.elevated',
                borderRadius: 'xl',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                _hover: {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)',
                },
            })}
        >
            {/* Recipe Image */}
            <div
                className={css({
                    position: 'relative',
                    aspectRatio: '16/10',
                    overflow: 'hidden',
                })}
            >
                <Image
                    src={recipe.image}
                    alt={recipe.title}
                    fill
                    className={css({
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

            {/* Recipe Content */}
            <div className={css({ p: '4' })}>
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

                {/* Recipe Meta */}
                <div
                    className={flex({
                        justify: 'space-between',
                        align: 'center',
                        fontSize: 'xs',
                        color: 'text-muted',
                    })}
                >
                    <div
                        className={flex({
                            align: 'center',
                            gap: '1',
                        })}
                    >
                        <span className={css({ color: '#f8b500' })}>★</span>
                        <span className={css({ fontWeight: '600' })}>
                            {recipe.rating.toFixed(1)}
                        </span>
                    </div>
                    <div className={flex({ align: 'center', gap: '1' })}>
                        <span>⏱</span>
                        <span>{totalTime} Min.</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
